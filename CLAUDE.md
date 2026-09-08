# Orqara contributor guide

Orqara is a local-first command center that combines multi-agent execution, isolated Git worktrees,
structured conversations, terminal and file panes, task coordination, verification evidence, and
review workflows in one desktop product.

`AGENTS.md` links to this file so every coding agent receives the same repository guidance.

## Repository map

- `packages/server` — daemon, agent lifecycle, WebSocket API, task coordinator, MCP
- `packages/app` — shared Expo application for native, browser, and desktop renderer
- `packages/desktop` — Electron host, packaging, updater, bundled CLI
- `packages/client` — typed daemon client
- `packages/protocol` — versioned wire schemas
- `packages/cli` — command-line client
- `packages/relay` — end-to-end encrypted remote transport
- `packages/website` — public marketing and download site

Read [docs/README.md](docs/README.md) before non-trivial work. Structural compatibility identifiers
may retain legacy names; do not rename package scopes, environment variables, protocol messages, or
on-disk paths without a migration plan and cross-version tests.

## Development

```bash
npm ci
npm run dev:desktop
npm run dev:website
```

Use npm scripts for formatting and linting. Run the focused test file for changed behavior, then the
affected package typecheck. Build generated workspace declarations before diagnosing cross-package
type errors.

```bash
npm run format:files -- <files>
npm run lint -- <files>
npx vitest run <test-file> --bail=1
npm run typecheck --workspace=<package>
```

Do not restart a user's production daemon. Development commands use checkout-local state. Treat
timeouts as inconclusive until the process or service reports a terminal state.

## Engineering rules

- Keep protocol additions optional and capability-gated.
- Put trust checks at daemon boundaries before filesystem, Git, process, or network effects.
- Preserve task command idempotency and optimistic revision checks.
- Run task verification in disposable checkouts and reject stale evidence.
- Keep UI behavior accessible on keyboard, pointer, touch, and compact layouts.
- Reuse existing package patterns and platform gates before adding dependencies or abstractions.
- Never commit credentials, local state, generated release artifacts, or captured user data.

Security-sensitive changes require `npm run test:security` plus focused tests for the changed boundary.
