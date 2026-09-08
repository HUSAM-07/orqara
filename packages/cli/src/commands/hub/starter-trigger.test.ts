import { describe, expect, it } from "vitest";
import { availableStarterTriggerConnections } from "./starter-trigger.js";

describe("starter trigger connections", () => {
  it("returns only concrete connections that can back the generated workflow", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getpaseo",
              accountLogin: "getpaseo",
              accountType: "Organization",
              repositories: ["HUSAM-07/orqara"],
            },
          ],
          slack: [{ teamId: "T123", teamName: "Orqara" }],
          discord: [{ guildId: "456", guildName: "Orqara Discord" }],
        },
        "HUSAM-07/orqara",
      ),
    ).toEqual([
      {
        id: "github:HUSAM-07/orqara",
        label: "GitHub — HUSAM-07/orqara",
        provider: "github",
        filters: { repo: "HUSAM-07/orqara" },
      },
      {
        id: "slack:T123",
        label: "Slack — Orqara",
        provider: "slack",
        filters: { workspace: "T123" },
      },
      {
        id: "discord:456",
        label: "Discord — Orqara Discord",
        provider: "discord",
        filters: { guild: "456" },
      },
    ]);
  });

  it("does not offer GitHub when the current repository is not connected", () => {
    expect(
      availableStarterTriggerConnections(
        {
          github: [
            {
              slug: "github-getpaseo",
              accountLogin: "getpaseo",
              accountType: "Organization",
              repositories: ["getpaseo/hub"],
            },
          ],
          slack: [],
          discord: [],
        },
        "HUSAM-07/orqara",
      ),
    ).toEqual([]);
  });
});
