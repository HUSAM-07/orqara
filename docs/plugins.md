# Plugin API

Plugins extend Orqara without changing the core application. A plugin may provide a client entry,
a server entry, or both:

```text
my-plugin/
  paseo-plugin.json
  index.client.tsx
  index.server.ts
  client/
  server/
  shared/
```

The manifest name remains `paseo-plugin.json` for compatibility with the current plugin runtime.
Put UI code and registrations in `index.client.tsx`, Node.js operations and RPC handlers in
`index.server.ts`, and serializable contracts used by both runtimes under `shared/`.

## Client registrations

The client entry receives `PluginClientContext`. Every registration returns an idempotent cleanup
function; return a combined cleanup function when the plugin keeps registrations or subscriptions.

| Client API                                   | Adds                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| `client.addSettingsScreen(screen)`           | A page in application settings                            |
| `client.addSurface(id, Component)`           | A reusable plugin-owned UI surface                        |
| `client.addSidebarItem(item)`                | A sidebar destination backed by a registered surface      |
| `client.addWorkspacePanel(panel)`            | A workspace or agent panel                                |
| `client.addCommandCenterItem(item)`          | A global, workspace, or agent command                     |
| `client.addSlashCommand(command)`            | A composer slash command                                  |
| `client.addComposerPill(pill)`               | A composer attachment or context pill                     |
| `client.addAttachmentSource(source)`         | A searchable attachment provider                          |
| `client.addTheme(theme)`                     | A light or dark color theme                               |
| `client.addTimelineTransformer(transformer)` | A projection from agent events into plugin timeline items |
| `client.addTimelineRenderer(renderer)`       | A validated renderer for plugin timeline items            |

## Runtime boundaries

- Client code may import `client/`, `shared/`, and browser-safe dependencies.
- Server code may import `server/`, `shared/`, and Node.js dependencies.
- Client code calls privileged server behavior through typed RPC contracts.
- At least one exact runtime entry is required: `index.client.ts`, `index.client.tsx`, or
  `index.server.ts`.
- Keep implementation modules under `client/`, `server/`, or `shared/`; root modules are reserved
  for runtime entries and configuration.

Use the examples under `plugin-examples/` as executable references. Typecheck a plugin before
loading it, then verify every contribution and call stored cleanup functions twice to confirm they
are safe during reload and shutdown.
