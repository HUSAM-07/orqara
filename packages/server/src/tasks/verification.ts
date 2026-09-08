import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execCommand } from "../utils/spawn.js";

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
  let stdout = "";
  let stderr = "";
  let exitCode: number | null = 0;
  let timedOut = false;

  try {
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    const args =
      process.platform === "win32" ? ["/d", "/s", "/c", input.command] : ["-lc", input.command];
    const result = await execCommand(shell, args, {
      cwd: checkout,
      timeout: input.timeoutMs,
      maxBuffer: MAX_LOG_BYTES,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    const failure = error as Error & {
      code?: number | string;
      killed?: boolean;
      signal?: string;
      stdout?: string;
      stderr?: string;
    };
    stdout = failure.stdout ?? "";
    stderr = failure.stderr ?? failure.message;
    timedOut = failure.killed === true || failure.signal === "SIGTERM";
    exitCode = typeof failure.code === "number" ? failure.code : null;
  }

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
