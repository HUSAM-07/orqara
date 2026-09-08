import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("plugin API documentation", () => {
  it("maps every client registration method", async () => {
    const contracts = await readFile(new URL("./contracts.ts", import.meta.url), "utf8");
    const context = /export interface PluginClientContext[^{]*{([\s\S]*?)\n}/.exec(contracts)?.[1];
    if (!context) throw new Error("PluginClientContext was not found");
    const methods = [...context.matchAll(/^\s+(add[A-Z]\w*)\(/gm)].map((match) => match[1]);
    const documentation = await readFile(
      fileURLToPath(new URL("../../../docs/plugins.md", import.meta.url)),
      "utf8",
    );
    const table = documentation.slice(
      documentation.indexOf("| Client API"),
      documentation.indexOf("## Runtime boundaries"),
    );

    expect(methods).not.toEqual([]);
    for (const method of methods) expect(table).toContain(`client.${method}(`);
  });
});
