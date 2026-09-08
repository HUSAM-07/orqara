# Architecture

Orqara keeps execution local. A daemon owns agent processes, terminals, repositories, worktrees,
tasks, and durable state. Desktop, browser, mobile, and CLI clients use the same typed WebSocket
protocol either directly or through an optional end-to-end encrypted relay.

## Packages

| Package    | Responsibility                                                              |
| ---------- | --------------------------------------------------------------------------- |
| `protocol` | Backward-compatible message and data schemas                                |
| `client`   | Connection, RPC correlation, subscriptions, and typed client methods        |
| `server`   | Daemon, trust boundaries, provider adapters, Git, terminals, tasks, and MCP |
| `app`      | Shared Expo UI for native, browser, and Electron renderer                   |
| `desktop`  | Electron lifecycle, daemon management, installer packaging, and updates     |
| `cli`      | Scriptable access to daemon operations                                      |
| `relay`    | Encrypted transport without access to application plaintext                 |
| `website`  | Marketing, platform-aware downloads, and public project entry points        |

## Task flow

1. A client creates a task in a workspace with acceptance criteria and a required check.
2. The daemon stores the task and idempotency receipt in SQLite.
3. Starting the task provisions a dedicated Git worktree through the normal agent lifecycle.
4. The chosen provider works in that worktree while clients observe one authoritative timeline.
5. A completed turn runs the required check in a disposable checkout of the captured source state.
6. Source changes during verification mark evidence stale. Passing fresh evidence makes the task
   review-ready; a user still accepts the result explicitly.

## Trust boundaries

- Daemon connections control processes and files available to the daemon user.
- Non-loopback access requires authentication and encrypted transport.
- Untrusted change requests cannot run workspace automation without explicit approval.
- Command IDs make retried mutations idempotent; revisions reject stale task updates.
- Verification evidence includes its command, timing, output, exit status, isolation mode, and source
  fingerprints.

Some internal identifiers are compatibility contracts. Rename them only with migrations and
cross-version tests.
