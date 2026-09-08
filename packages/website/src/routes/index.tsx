import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "~/components/landing-page";
import { pageMeta } from "~/meta";

export const Route = createFileRoute("/")({
  head: () =>
    pageMeta(
      "Orqara – Many agents. One finished task.",
      "Run coding agents in isolated workspaces, verify their output, and ship from one desktop command center.",
      "/",
    ),
  component: Home,
});

function Home() {
  return (
    <LandingPage
      title={
        <>
          Many agents.
          <br />
          One finished task.
        </>
      }
      subtitle={
        <>
          Run Claude Code, Codex, OpenCode, and Pi in isolated workspaces.
          <br />
          Keep every diff, check, and decision together.
        </>
      }
    />
  );
}
