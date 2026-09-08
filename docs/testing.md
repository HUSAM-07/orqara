# Testing

Prefer the smallest check that proves the changed behavior. Tests should exercise a public contract
or a real boundary rather than mirror implementation details.

## Required checks

```bash
npm run typecheck
npm run lint
npm run test:security
```

For UI changes, include screenshots or video for every affected form factor. For daemon changes, use
the loopback daemon harness when unit tests cannot prove RPC, persistence, or lifecycle behavior.

## Security suite

The security command covers:

- HTTP and WebSocket authentication
- semantic operation authorization
- WebSocket origin validation
- encrypted relay transport
- isolated, source-fingerprinted task verification

CI also audits production dependencies and blocks critical advisories. High-severity findings in the
Expo mobile toolchain are tracked for its next major upgrade because npm cannot resolve them without
changing that runtime.

## Release evidence

A desktop release records source revision, platform and architecture, checksums, signing status, and
the smoke test actually run. macOS packaging smoke covers the renderer, preload bridge, managed
daemon, bundled CLI, terminal command, and shutdown. Windows artifacts require a native Windows
launch test before being described as platform-verified.
