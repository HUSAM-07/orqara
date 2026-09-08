import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type {
  TaskCheck,
  TaskCommandRequest,
  TaskCreateRequest,
  TaskEvidence,
  TaskPayload,
} from "@getpaseo/protocol/messages";
import type { WorkspaceRegistry } from "../server/workspace-registry.js";
import { runVerification } from "./verification.js";

type SqlValue = string | number | bigint | Uint8Array | null;
interface SqlStatement {
  all(...values: SqlValue[]): unknown[];
  get(...values: SqlValue[]): unknown;
  run(...values: SqlValue[]): { changes: number | bigint };
}
interface SqlDatabase {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
}

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => SqlDatabase;
};

interface TaskRow {
  id: string;
  workspace_id: string;
  title: string;
  prompt: string;
  provider_id: TaskPayload["providerId"];
  agent_id: string | null;
  status: TaskPayload["status"];
  revision: number;
  acceptance_criteria: string;
  check_definition: string;
  created_at: string;
  create_request_hash: string;
}

interface CommandRow {
  request_hash: string;
}

interface EvidenceRow {
  task_id?: string;
  payload: string;
}

type CreateInput = Omit<TaskCreateRequest, "type" | "requestId">;
type CommandInput = Omit<TaskCommandRequest, "type" | "requestId">;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requestHash(value: unknown): string {
  return hash(JSON.stringify(value));
}

export class TaskService {
  private readonly db: SqlDatabase;
  private readonly activeVerifications = new Set<
    Promise<{
      task: TaskPayload;
      evidence: TaskEvidence;
      duplicate: false;
    }>
  >();

  constructor(
    root: string,
    private readonly workspaceRegistry: Pick<WorkspaceRegistry, "get">,
    private readonly runCheck = runVerification,
  ) {
    mkdirSync(root, { recursive: true });
    this.db = new DatabaseSync(join(root, "tasks.sqlite"));
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS tasks (
        workspace_id TEXT NOT NULL,
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        agent_id TEXT,
        status TEXT NOT NULL,
        revision INTEGER NOT NULL,
        acceptance_criteria TEXT NOT NULL,
        check_definition TEXT NOT NULL,
        created_at TEXT NOT NULL,
        create_request_hash TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );
      CREATE INDEX IF NOT EXISTS tasks_workspace_created
        ON tasks (workspace_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS task_commands (
        workspace_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        command_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        revision INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, command_id),
        FOREIGN KEY (workspace_id, task_id) REFERENCES tasks (workspace_id, id)
      );
      CREATE TABLE IF NOT EXISTS task_evidence (
        workspace_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        command_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (workspace_id, command_id),
        FOREIGN KEY (workspace_id, task_id) REFERENCES tasks (workspace_id, id)
      );
      PRAGMA user_version = 1;
    `);
  }

  private async workspace(workspaceId: string) {
    const workspace = await this.workspaceRegistry.get(workspaceId);
    if (!workspace) throw new Error(`Workspace not found: ${workspaceId}`);
    return workspace;
  }

  private transaction<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private row(workspaceId: string, taskId: string): TaskRow | null {
    return (
      (this.db
        .prepare("SELECT * FROM tasks WHERE workspace_id = ? AND id = ?")
        .get(workspaceId, taskId) as TaskRow | undefined) ?? null
    );
  }

  private latestEvidence(workspaceId: string, taskId: string): TaskEvidence | null {
    const row = this.db
      .prepare(
        "SELECT payload FROM task_evidence WHERE workspace_id = ? AND task_id = ? ORDER BY rowid DESC LIMIT 1",
      )
      .get(workspaceId, taskId) as EvidenceRow | undefined;
    return row ? (JSON.parse(row.payload) as TaskEvidence) : null;
  }

  private project(row: TaskRow): TaskPayload {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      title: row.title,
      prompt: row.prompt,
      providerId: row.provider_id,
      agentId: row.agent_id,
      status: row.status,
      revision: row.revision,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria) as string[],
      check: JSON.parse(row.check_definition) as TaskCheck,
      createdAt: row.created_at,
      latestEvidence: this.latestEvidence(row.workspace_id, row.id),
    };
  }

  async create(input: CreateInput): Promise<{ task: TaskPayload; duplicate: boolean }> {
    await this.workspace(input.workspaceId);
    const taskId = hash(`task\0${input.workspaceId}\0${input.commandId}`).slice(0, 16);
    const createRequestHash = requestHash({
      workspaceId: input.workspaceId,
      title: input.title,
      prompt: input.prompt,
      providerId: input.providerId,
      acceptanceCriteria: input.acceptanceCriteria,
      checks: input.checks,
      commandId: input.commandId,
    });
    const duplicate = this.transaction(() => {
      const existing = this.row(input.workspaceId, taskId);
      if (existing) {
        if (existing.create_request_hash !== createRequestHash) {
          throw new Error(`Command ID conflict: ${input.commandId}`);
        }
        return true;
      }
      this.db
        .prepare(
          `INSERT INTO tasks (
            workspace_id, id, title, prompt, provider_id, agent_id, status, revision,
            acceptance_criteria, check_definition, created_at, create_request_hash
          ) VALUES (?, ?, ?, ?, ?, NULL, 'queued', 1, ?, ?, ?, ?)`,
        )
        .run(
          input.workspaceId,
          taskId,
          input.title,
          input.prompt,
          input.providerId,
          JSON.stringify(input.acceptanceCriteria),
          JSON.stringify(input.checks[0]),
          new Date().toISOString(),
          createRequestHash,
        );
      return false;
    });
    return { task: await this.get(input.workspaceId, taskId), duplicate };
  }

  async list(workspaceId: string): Promise<TaskPayload[]> {
    await this.workspace(workspaceId);
    return (
      this.db
        .prepare("SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC")
        .all(workspaceId) as TaskRow[]
    ).map((row) => this.project(row));
  }

  async get(workspaceId: string, taskId: string): Promise<TaskPayload> {
    await this.workspace(workspaceId);
    const row = this.row(workspaceId, taskId);
    if (!row) throw new Error(`Task not found: ${taskId}`);
    return this.project(row);
  }

  async evidence(workspaceId: string, taskId: string): Promise<TaskEvidence[]> {
    await this.workspace(workspaceId);
    if (!this.row(workspaceId, taskId)) throw new Error(`Task not found: ${taskId}`);
    return (
      this.db
        .prepare(
          "SELECT payload FROM task_evidence WHERE workspace_id = ? AND task_id = ? ORDER BY rowid",
        )
        .all(workspaceId, taskId) as EvidenceRow[]
    ).map((row) => JSON.parse(row.payload) as TaskEvidence);
  }

  async verify(input: {
    workspaceId: string;
    taskId: string;
    commandId: string;
    cwd?: string;
  }): Promise<{
    task: TaskPayload;
    evidence: TaskEvidence;
    duplicate: boolean;
  }> {
    const workspace = await this.workspace(input.workspaceId);
    const existing = this.db
      .prepare(
        "SELECT task_id, payload FROM task_evidence WHERE workspace_id = ? AND command_id = ?",
      )
      .get(input.workspaceId, input.commandId) as EvidenceRow | undefined;
    if (existing) {
      if (existing.task_id !== input.taskId) {
        throw new Error(`Command ID conflict: ${input.commandId}`);
      }
      return {
        task: await this.get(input.workspaceId, input.taskId),
        evidence: JSON.parse(existing.payload) as TaskEvidence,
        duplicate: true,
      };
    }
    const task = this.row(input.workspaceId, input.taskId);
    if (!task) throw new Error(`Task not found: ${input.taskId}`);
    const check = JSON.parse(task.check_definition) as TaskCheck;
    const pending: TaskEvidence = {
      commandId: input.commandId,
      taskId: input.taskId,
      operationState: "running",
      command: check.command,
      startedAt: new Date().toISOString(),
      durationMs: null,
      status: "pending",
      exitCode: null,
      stdout: "",
      stderr: "",
      isolation: "disposable_checkout",
      snapshot: null,
      resultingSnapshotId: null,
    };
    const claimed = this.transaction(() => {
      const result = this.db
        .prepare(
          "INSERT OR IGNORE INTO task_evidence (workspace_id, task_id, command_id, payload) VALUES (?, ?, ?, ?)",
        )
        .run(input.workspaceId, input.taskId, input.commandId, JSON.stringify(pending));
      if (Number(result.changes) === 0) return false;
      this.db
        .prepare(
          "UPDATE tasks SET status = 'verifying', revision = revision + 1 WHERE workspace_id = ? AND id = ?",
        )
        .run(input.workspaceId, input.taskId);
      return true;
    });
    if (!claimed) {
      const evidence = this.db
        .prepare(
          "SELECT task_id, payload FROM task_evidence WHERE workspace_id = ? AND command_id = ?",
        )
        .get(input.workspaceId, input.commandId) as EvidenceRow;
      if (evidence.task_id !== input.taskId) {
        throw new Error(`Command ID conflict: ${input.commandId}`);
      }
      return {
        task: await this.get(input.workspaceId, input.taskId),
        evidence: JSON.parse(evidence.payload) as TaskEvidence,
        duplicate: true,
      };
    }

    const completion = this.completeVerification(input, input.cwd ?? workspace.cwd, check, pending);
    this.activeVerifications.add(completion);
    try {
      return await completion;
    } finally {
      this.activeVerifications.delete(completion);
    }
  }

  private async completeVerification(
    input: { workspaceId: string; taskId: string; commandId: string },
    cwd: string,
    check: TaskCheck,
    pending: TaskEvidence,
  ): Promise<{ task: TaskPayload; evidence: TaskEvidence; duplicate: false }> {
    try {
      Object.assign(
        pending,
        await this.runCheck({
          cwd,
          command: check.command,
          timeoutMs: check.timeoutMs,
        }),
        { operationState: "finished" as const },
      );
    } catch (error) {
      Object.assign(pending, {
        operationState: "finished" as const,
        status: "failed" as const,
        stderr: error instanceof Error ? error.message : "Verification failed",
      });
    }
    this.transaction(() => {
      this.db
        .prepare("UPDATE task_evidence SET payload = ? WHERE workspace_id = ? AND command_id = ?")
        .run(JSON.stringify(pending), input.workspaceId, input.commandId);
      this.db
        .prepare(
          "UPDATE tasks SET status = ?, revision = revision + 1 WHERE workspace_id = ? AND id = ?",
        )
        .run(
          pending.status === "passed" ? "review_ready" : "failed",
          input.workspaceId,
          input.taskId,
        );
    });
    return {
      task: await this.get(input.workspaceId, input.taskId),
      evidence: pending,
      duplicate: false as const,
    };
  }

  async command(
    input: CommandInput & { agentId?: string },
  ): Promise<{ task: TaskPayload; duplicate: boolean }> {
    await this.workspace(input.workspaceId);
    const inputHash = requestHash({
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      commandId: input.commandId,
      expectedRevision: input.expectedRevision,
      action: input.action,
    });
    const duplicate = this.transaction(() => {
      const task = this.row(input.workspaceId, input.taskId);
      if (!task) throw new Error(`Task not found: ${input.taskId}`);
      const receipt = this.db
        .prepare("SELECT request_hash FROM task_commands WHERE workspace_id = ? AND command_id = ?")
        .get(input.workspaceId, input.commandId) as CommandRow | undefined;
      if (receipt) {
        if (receipt.request_hash !== inputHash)
          throw new Error(`Command ID conflict: ${input.commandId}`);
        return true;
      }
      if (task.revision !== input.expectedRevision) {
        throw new Error(
          `Revision conflict: expected ${input.expectedRevision}, current ${task.revision}`,
        );
      }
      const nextStatus = this.nextStatus(input.action, task.status, input.agentId);
      const revision = task.revision + 1;
      this.db
        .prepare(
          "INSERT INTO task_commands (workspace_id, task_id, command_id, request_hash, revision) VALUES (?, ?, ?, ?, ?)",
        )
        .run(input.workspaceId, input.taskId, input.commandId, inputHash, revision);
      this.db
        .prepare(
          "UPDATE tasks SET status = ?, revision = ?, agent_id = ? WHERE workspace_id = ? AND id = ?",
        )
        .run(
          nextStatus,
          revision,
          input.action === "retry" ? null : (input.agentId ?? task.agent_id),
          input.workspaceId,
          input.taskId,
        );
      return false;
    });
    return { task: await this.get(input.workspaceId, input.taskId), duplicate };
  }

  async failStart(workspaceId: string, taskId: string, agentId: string): Promise<void> {
    await this.workspace(workspaceId);
    this.transaction(() => {
      this.db
        .prepare(
          `UPDATE tasks SET status = 'failed', revision = revision + 1
           WHERE workspace_id = ? AND id = ? AND status = 'running' AND agent_id = ?`,
        )
        .run(workspaceId, taskId, agentId);
    });
  }

  private nextStatus(
    action: CommandInput["action"],
    currentStatus: string,
    agentId?: string,
  ): "running" | "completed" | "queued" | "cancelled" {
    if (action === "accept") {
      if (currentStatus !== "review_ready")
        throw new Error("Only a review-ready task can be accepted");
      return "completed";
    }
    if (action === "start") {
      if (currentStatus !== "queued") throw new Error("Only a queued task can be started");
      if (!agentId) throw new Error("Started task requires an agent ID");
      return "running";
    }
    if (action === "retry") {
      if (currentStatus !== "failed") throw new Error("Only a failed task can be retried");
      return "queued";
    }
    if (!["draft", "open", "queued", "blocked"].includes(currentStatus)) {
      throw new Error("Only a pending task can be cancelled");
    }
    return "cancelled";
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.activeVerifications);
    this.db.close();
  }
}
