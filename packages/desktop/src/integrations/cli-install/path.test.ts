import { describe, expect, it } from "vitest";
import { resolveCliInstallSourcePath } from "./path";

describe("cli-install-path", () => {
  it("uses the bundled shim for packaged macOS installs", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "darwin",
        isPackaged: true,
        executablePath: "/Applications/Orqara.app/Contents/MacOS/Orqara",
        shimPath: "/Applications/Orqara.app/Contents/Resources/bin/paseo",
      }),
    ).toBe("/Applications/Orqara.app/Contents/Resources/bin/paseo");
  });

  it("prefers the original AppImage path on linux", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/tmp/.mount_paseo123/paseo",
        shimPath: "/tmp/.mount_paseo123/resources/bin/paseo",
        appImagePath: "/home/user/Applications/Orqara.AppImage",
      }),
    ).toBe("/home/user/Applications/Orqara.AppImage");
  });

  it("uses the bundled shim for packaged linux installs outside an AppImage", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: true,
        executablePath: "/opt/Orqara/Orqara",
        shimPath: "/opt/Orqara/resources/bin/paseo",
      }),
    ).toBe("/opt/Orqara/resources/bin/paseo");
  });

  it("falls back to the shim on windows and in development", () => {
    expect(
      resolveCliInstallSourcePath({
        platform: "win32",
        isPackaged: true,
        executablePath: "C:\\Users\\user\\AppData\\Local\\Programs\\Orqara\\Orqara.exe",
        shimPath: "C:\\Users\\user\\AppData\\Local\\Programs\\Orqara\\resources\\bin\\paseo.cmd",
      }),
    ).toBe("C:\\Users\\user\\AppData\\Local\\Programs\\Orqara\\resources\\bin\\paseo.cmd");

    expect(
      resolveCliInstallSourcePath({
        platform: "linux",
        isPackaged: false,
        executablePath: "/opt/Orqara/paseo",
        shimPath: "/opt/Orqara/resources/bin/paseo",
      }),
    ).toBe("/opt/Orqara/resources/bin/paseo");
  });
});
