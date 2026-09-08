# Contributing to Orqara

Thanks for helping improve Orqara. Contributions are welcome from first-time and experienced
contributors.

## Start with an issue

Use [GitHub Issues](https://github.com/HUSAM-07/orqara/issues/new/choose) for bugs, feature ideas,
documentation problems, and installation trouble. Search existing issues first.

A useful issue includes:

- the user workflow and expected result
- the smallest reliable reproduction
- Orqara version, operating system, and agent provider
- raw logs with secrets removed
- screenshots or a short recording for visual or interaction problems

Maintainers will confirm, label, prioritize, and close or schedule the issue. Security problems must
follow [SECURITY.md](SECURITY.md) and must not be reported publicly.

## Development setup

Install Node.js 22+, npm, Git, and one supported agent CLI.

```bash
git clone git@github.com:HUSAM-07/orqara.git
cd orqara
npm ci
npm run dev:desktop
```

The repository is an npm workspace monorepo. Read [docs/README.md](docs/README.md) before changing a
subsystem.

## Pull requests

1. Link an issue or explain the user problem.
2. Keep the change focused.
3. Add the smallest test that would fail without the fix.
4. Run the relevant typecheck, lint, and focused tests.
5. Include screenshots or video for UI work.
6. State which platforms you tested and which you could not test.

Draft pull requests are welcome. Maintainers may ask to narrow or reshape a change to protect product
quality and compatibility. By submitting a contribution, you agree that it is licensed under the
project's Apache-2.0 license.

## Review expectations

Maintainers prioritize reproducible bugs, security, data safety, accessibility, and changes that
improve complete user workflows. A pull request is ready for review when its checks pass and its QA
evidence lets another contributor verify the behavior.

Be respectful and follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
