<p align="center">
  <img src="packages/website/public/logo.svg" width="72" height="72" alt="Orqara logo">
</p>

<h1 align="center">Orqara</h1>

<p align="center"><strong>Many agents. One finished task.</strong></p>

Orqara is an open-source, local-first command center for coding agents. Run Claude Code, Codex,
OpenCode, Pi, ACP agents, and custom CLI providers in isolated Git worktrees while keeping chat,
terminals, files, diffs, checks, and review state in one place.

## Install

The first public preview targets Apple Silicon Macs. Signed and notarized installers will be
published on [GitHub Releases](https://github.com/HUSAM-07/orqara/releases) after release validation.
Windows x64 and ARM64 installers will follow.

## What Orqara includes

- Native desktop command center for macOS and Windows
- Parallel agent sessions in isolated Git worktrees
- Structured chat, tool calls, terminals, files, diffs, and browser panes
- Durable tasks with required checks, source-fingerprinted evidence, retry, and acceptance
- Git commit, push, pull request, checks, review, and merge workflows
- Direct connections plus an optional end-to-end encrypted relay
- Web, mobile, CLI, SDK, MCP, schedules, and plugin surfaces

## Architecture

```text
Desktop / web / mobile / CLI
              │
      direct WebSocket or
      encrypted relay tunnel
              │
       local Orqara daemon
       ├─ workspace registry and Git worktrees
       ├─ agent and terminal lifecycle
       ├─ SQLite task coordinator and evidence
       └─ provider adapters
```

See [docs/README.md](docs/README.md) for the documentation index and
[docs/architecture.md](docs/architecture.md) for package boundaries and data flow.

## Develop

Requirements: Node.js 22+, npm, Git, and at least one supported coding-agent CLI.

```bash
npm ci
npm run dev:desktop
```

Run the marketing site with `npm run dev:website`. Build desktop installers with
`npm run build:desktop -- --publish never`.

## Validate

```bash
npm run typecheck
npm run lint
npm run test:security
```

Run focused tests for the package you changed before opening a pull request. The CI workflow runs
the repository matrix.

## Contribute

Bug reports, feature proposals, documentation fixes, and pull requests are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), use the issue form that matches your request, and include the
smallest reproducible example or clear user workflow.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Orqara is licensed under Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
