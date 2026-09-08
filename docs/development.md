# Development

## Requirements

- Node.js 22 or newer
- npm
- Git
- one supported coding-agent CLI for interactive testing

## Start locally

```bash
npm ci
npm run dev:desktop
```

The development desktop uses checkout-local daemon state. Start the marketing site with
`npm run dev:website`.

## Work in one package

Run the focused test and typecheck for the package you changed. Build upstream workspace packages
first when generated declarations are stale.

```bash
npx vitest run path/to/file.test.ts --bail=1
npm run typecheck --workspace=<package-name>
npm run lint -- path/to/changed-file.ts
npm run format:files -- path/to/changed-file.ts
```

Use `npm run test:security` for authentication, authorization, origin, relay, or verification
changes. Use `npm run build:desktop -- --publish never` to produce local installers.

Never commit `.env` files, private keys, local daemon state, task data, screenshots containing user
code, or release artifacts.
