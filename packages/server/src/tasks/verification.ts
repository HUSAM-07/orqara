import { createHash } from "node:crypto";
import { once } from "node:events";
import { cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execCommand, spawnProcess } from "../utils/spawn.js";
import {
  buildStringCommandShellInvocation,
  createStringCommandShellEnvOverlay,
} from "../utils/string-command-shell.js";
import { terminateWithTreeKill } from "../utils/tree-kill.js";

const MAX_LOG_BYTES = 1024 * 1024;

export interface VerificationSnapshot {
  id: string;
  baseCommit: string;
  trackedDiffHash: string;
  untrackedManifestHash: string;
}

export interface VerificationEvidence {
  command: string;
  startedAt: string;
  durationMs: number;
  status: "passed" | "failed" | "timed_out" | "stale";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  isolation: "disposable_checkout";
  snapshot: VerificationSnapshot;
  resultingSnapshotId: string;
}

interface CapturedWorkspace {
  snapshot: VerificationSnapshot;
  trackedDiff: string;
  untrackedFiles: string[];
}

function hash(parts: Array<string | Buffer>): string {
  const digest = createHash("sha256");
  for (const part of parts) digest.update(part);
  return digest.digest("hex");
}

async function captureWorkspace(cwd: string): Promise<CapturedWorkspace> {
  const [{ stdout: baseCommit }, { stdout: trackedDiff }, { stdout: untrackedOutput }] =
    await Promise.all([
      execCommand("git", ["rev-parse", "HEAD"], { cwd }),
      execCommand("git", ["diff", "--binary", "--no-ext-diff", "HEAD"], {
        cwd,
        maxBuffer: MAX_LOG_BYTES,
      }),
      execCommand("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd }),
    ]);

  const untrackedFiles = untrackedOutput.split("\0").filter(Boolean).sort();
  const untrackedParts: Array<string | Buffer> = [];
  for (const path of untrackedFiles) {
    untrackedParts.push(path, "\0", await readFile(join(cwd, path)), "\0");
  }

  const base = baseCommit.trim();
  const trackedDiffHash = hash([trackedDiff]);
  const untrackedManifestHash = hash(untrackedParts);
  return {
    snapshot: {
      id: hash([base, "\0", trackedDiffHash, "\0", untrackedManifestHash]),
      baseCommit: base,
      trackedDiffHash,
      untrackedManifestHash,
    },
    trackedDiff,
    untrackedFiles,
  };
}

export async function captureVerificationSnapshot(cwd: string): Promise<VerificationSnapshot> {
  return (await captureWorkspace(cwd)).snapshot;
}

async function executeVerificationCommand(input: {
  cwd: string;
  command: string;
  timeoutMs: number;
}): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  const { shell, args } = buildStringCommandShellInvocation({
    command: input.command,
    windowsShell: "cmd",
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  const child = spawnProcess(shell, args, {
    cwd: input.cwd,
    envOverlay: createStringCommandShellEnvOverlay(),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsVerbatimArguments: process.platform === "win32",
  });
  const append = (current: string, chunk: Buffer | string) =>
    (current + chunk.toString()).slice(0, MAX_LOG_BYTES);
  child.stdout?.on("data", (chunk: Buffer | string) => {
    stdout = append(stdout, chunk);
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr = append(stderr, chunk);
  });
  const timer = setTimeout(() => {
    timedOut = true;
    void terminateWithTreeKill(child, {
      gracefulTimeoutMs: 250,
      forceTimeoutMs: 250,
    });
  }, input.timeoutMs);
  const [exitCode] = await once(child, "close").catch((error: Error) => {
    stderr = append(stderr, error.message);
    return [null];
  });
  clearTimeout(timer);
  const normalizedExitCode = !timedOut && typeof exitCode === "number" ? exitCode : null;
  return {
    exitCode: normalizedExitCode,
    stdout,
    stderr,
    timedOut,
  };
}

async function materializeWorkspace(cwd: string, captured: CapturedWorkspace): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "orqara-verification-checkout-"));
  const checkout = join(root, "repo");
  try {
    await execCommand("git", [
      "clone",
      "--quiet",
      "--no-hardlinks",
      "--no-checkout",
      "--",
      cwd,
      checkout,
    ]);
    await execCommand("git", ["checkout", "--quiet", "--detach", captured.snapshot.baseCommit], {
      cwd: checkout,
    });
    if (captured.trackedDiff) {
      const patchPath = join(root, "working-tree.patch");
      await writeFile(patchPath, captured.trackedDiff);
      await execCommand("git", ["apply", "--binary", "--whitespace=nowarn", patchPath], {
        cwd: checkout,
      });
    }
    for (const path of captured.untrackedFiles) {
      const destination = join(checkout, path);
      await mkdir(dirname(destination), { recursive: true });
      await cp(join(cwd, path), destination, { recursive: true });
    }
    const modules = join(cwd, "node_modules");
    if (await lstat(modules).catch(() => null)) {
      await symlink(
        modules,
        join(checkout, "node_modules"),
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    return checkout;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

export async function runVerification(input: {
  cwd: string;
  command: string;
  timeoutMs: number;
}): Promise<VerificationEvidence> {
  if (!input.command.trim()) throw new Error("Verification command is required");
  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1) {
    throw new Error("Verification timeout must be a positive integer");
  }

  const captured = await captureWorkspace(input.cwd);
  const snapshot = captured.snapshot;
  const checkout = await materializeWorkspace(input.cwd, captured);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const { exitCode, stdout, stderr, timedOut } = await executeVerificationCommand({
    cwd: checkout,
    command: input.command,
    timeoutMs: input.timeoutMs,
  });

  await rm(dirname(checkout), { recursive: true, force: true });
  const resultingSnapshot = await captureVerificationSnapshot(input.cwd);
  const stale = resultingSnapshot.id !== snapshot.id;
  let status: VerificationEvidence["status"] = exitCode === 0 ? "passed" : "failed";
  if (timedOut) status = "timed_out";
  if (stale) status = "stale";
  return {
    command: input.command,
    startedAt,
    durationMs: Date.now() - started,
    status,
    exitCode,
    stdout,
    stderr,
    isolation: "disposable_checkout",
    snapshot,
    resultingSnapshotId: resultingSnapshot.id,
  };
}
