const SITE_URL = "https://orqara.pages.dev";

export function buildLlmsTxt(): string {
  return `# Orqara

> Open-source, local-first command center for coding agents.

Orqara runs coding agents in isolated Git worktrees and keeps conversations, terminals, files,
diffs, required checks, verification evidence, and review state together. Execution stays on the
user's machine. Desktop, browser, mobile, CLI, and encrypted relay clients share one daemon protocol.

## Links

- [Home](${SITE_URL}/)
- [Downloads](${SITE_URL}/download)
- [Supported agents](${SITE_URL}/agents)
- [Source](https://github.com/HUSAM-07/orqara)
- [Documentation](https://github.com/HUSAM-07/orqara/tree/main/docs)
- [Issues](https://github.com/HUSAM-07/orqara/issues)
`;
}
