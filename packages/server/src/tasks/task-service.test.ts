import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { PersistedWorkspaceRecord } from "../server/workspace-registry.js";
import { runVerification } from "./verification.js";
import { TaskService } from "./task-service.js";

let root: string;
let cwd: string;
let service: TaskService | null;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "orqara-tasks-"));
  service = null;
  cwd = join(root, "repo");
  await mkdir(cwd);
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync("git", ["config", "user.email", "test@orqara.local"], { cwd });
  execFileSync("git", ["config", "user.name", "Orqara Test"], { cwd });
  await writeFile(join(cwd, "file.txt"), "initial\n");
  execFileSync("git", ["add", "file.txt"], { cwd });
  execFileSync("git", ["commit", "-qm", "initial"], { cwd });
});

afterEach(async () => {
  await service?.close();
  await rm(root, { recursive: true, force: true });
});

it("persists idempotent create, verification, evidence, and acceptance", async () => {
  let runs = 0;
  service = new TaskService(
    join(root, "tasks"),
    {
      get: async () => ({ cwd }) as PersistedWorkspaceRecord,
    },
    async (input) => {
      runs += 1;
      return runVerification(input);
    },
  );
  const input = {
    workspaceId: "workspace-1",
    title: "Ship the slice",
    prompt: "Implement and verify it.",
    providerId: "codex",
    acceptanceCriteria: ["check passes"],
    checks: [
      {
        id: "test",
        command: `${JSON.stringify(process.execPath)} -e "process.exit(0)"`,
        timeoutMs: 2_000,
      },
    ],
    commandId: "create-1",
  };

  const created = await service.create(input);
  const duplicateCreate = await service.create(input);
  expect(duplicateCreate).toMatchObject({
    duplicate: true,
    task: { id: created.task.id },
  });
  expect(await service.list(input.workspaceId)).toHaveLength(1);

  const started = await service.command({
    workspaceId: input.workspaceId,
    taskId: created.task.id,
    commandId: "start-1",
    expectedRevision: created.task.revision,
    action: "start",
    agentId: "agent-1",
  });
  expect(started.task).toMatchObject({ status: "running", agentId: "agent-1" });
  expect(
    await service.command({
      workspaceId: input.workspaceId,
      taskId: created.task.id,
      commandId: "start-1",
      expectedRevision: created.task.revision,
      action: "start",
    }),
  ).toMatchObject({ duplicate: true, task: { agentId: "agent-1" } });

  const [verified, duplicateVerify] = await Promise.all([
    service.verify({
      workspaceId: input.workspaceId,
      taskId: created.task.id,
      commandId: "verify-1",
    }),
    service.verify({
      workspaceId: input.workspaceId,
      taskId: created.task.id,
      commandId: "verify-1",
    }),
  ]);
  expect(runs).toBe(1);
  expect(verified.task.status).toBe("review_ready");
  expect(duplicateVerify).toMatchObject({
    duplicate: true,
    evidence: { operationState: "running", status: "pending" },
  });
  expect(await service.evidence(input.workspaceId, created.task.id)).toMatchObject([
    { operationState: "finished", status: "passed" },
  ]);

  const accepted = await service.command({
    workspaceId: input.workspaceId,
    taskId: created.task.id,
    commandId: "accept-1",
    expectedRevision: verified.task.revision,
    action: "accept",
  });
  expect(accepted.task.status).toBe("completed");

  await service.close();
  service = new TaskService(join(root, "tasks"), {
    get: async () => ({ cwd }) as PersistedWorkspaceRecord,
  });
  await expect(service.list(input.workspaceId)).resolves.toMatchObject([
    { id: created.task.id, status: "completed", latestEvidence: { status: "passed" } },
  ]);
});

it("makes an agent launch failure retryable", async () => {
  service = new TaskService(join(root, "tasks"), {
    get: async () => ({ cwd }) as PersistedWorkspaceRecord,
  });
  const created = await service.create({
    workspaceId: "workspace-1",
    title: "Launch task",
    prompt: "Run it.",
    providerId: "codex",
    acceptanceCriteria: ["agent starts"],
    checks: [{ id: "test", command: "true", timeoutMs: 1_000 }],
    commandId: "create-1",
  });
  await service.command({
    workspaceId: "workspace-1",
    taskId: created.task.id,
    commandId: "start-1",
    expectedRevision: created.task.revision,
    action: "start",
    agentId: "agent-1",
  });

  await service.failStart("workspace-1", created.task.id, "agent-1");
  const failed = await service.get("workspace-1", created.task.id);
  expect(failed.status).toBe("failed");
  await expect(
    service.command({
      workspaceId: "workspace-1",
      taskId: created.task.id,
      commandId: "retry-1",
      expectedRevision: failed.revision,
      action: "retry",
    }),
  ).resolves.toMatchObject({ task: { status: "queued", agentId: null } });
});
