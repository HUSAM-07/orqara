import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureVerificationSnapshot, runVerification } from "./verification.js";

let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), "orqara-verification-"));
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync("git", ["config", "user.email", "test@orqara.local"], { cwd });
  execFileSync("git", ["config", "user.name", "Orqara Test"], { cwd });
  await writeFile(join(cwd, "file.txt"), "initial\n");
  execFileSync("git", ["add", "file.txt"], { cwd });
  execFileSync("git", ["commit", "-qm", "initial"], { cwd });
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("runVerification", () => {
  it("passes only when the command succeeds on an unchanged snapshot", async () => {
    const result = await runVerification({
      cwd,
      command: 'node -e "process.exit(0)"',
      timeoutMs: 2_000,
    });

    expect(result.status).toBe("passed");
    expect(result.exitCode).toBe(0);
    expect(result.isolation).toBe("disposable_checkout");
    expect(result.resultingSnapshotId).toBe(result.snapshot.id);
  });

  it("records a failed command", async () => {
    const result = await runVerification({
      cwd,
      command: 'node -e "process.exit(7)"',
      timeoutMs: 2_000,
    });

    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(7);
  });

  it("times out a check that exceeds its deadline", async () => {
    const result = await runVerification({
      cwd,
      command: 'node -e "setTimeout(() => {}, 10000)"',
      timeoutMs: 50,
    });

    expect(result.status).toBe("timed_out");
    expect(result.exitCode).toBeNull();
    expect(result.durationMs).toBeLessThan(2_000);
  });

  it("runs source-mutating checks in the disposable checkout", async () => {
    const script = "require('fs').appendFileSync('file.txt','generated\\n')";
    const result = await runVerification({
      cwd,
      command: `node -e ${JSON.stringify(script)}`,
      timeoutMs: 2_000,
    });

    expect(result.status).toBe("passed");
    expect(await readFile(join(cwd, "file.txt"), "utf8")).toBe("initial\n");
  });

  it("marks evidence stale when the source changes during the check", async () => {
    const source = join(cwd, "file.txt");
    const script = `setTimeout(()=>require('fs').appendFileSync(${JSON.stringify(source)},'changed\\n'),50);setTimeout(()=>{},150)`;
    const result = await runVerification({
      cwd,
      command: `node -e ${JSON.stringify(script)}`,
      timeoutMs: 2_000,
    });

    expect(result.status).toBe("stale");
    expect(result.resultingSnapshotId).not.toBe(result.snapshot.id);
  });

  it("includes untracked file content in the snapshot", async () => {
    await writeFile(join(cwd, "new.txt"), "one");
    const before = await captureVerificationSnapshot(cwd);
    await writeFile(join(cwd, "new.txt"), "two");
    const after = await captureVerificationSnapshot(cwd);

    expect(after.id).not.toBe(before.id);
    expect(after.untrackedManifestHash).not.toBe(before.untrackedManifestHash);
  });
});
