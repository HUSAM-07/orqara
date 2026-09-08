# Security policy

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability. Use
[GitHub private vulnerability reporting](https://github.com/HUSAM-07/orqara/security/advisories/new).
Include affected versions, impact, reproduction steps, and any suggested mitigation. Remove API
keys, repository content, and personal data from evidence.

Maintainers will acknowledge a complete report, validate impact, coordinate a fix, and publish an
advisory when users need to act. Please allow time for a release before public disclosure.

## Supported versions

Security fixes target the latest release. Older previews may be asked to upgrade before a report is
investigated.

## Security model

Orqara's daemon runs coding agents with the permissions of the operating-system user. A connected
client is therefore a trusted operator. The daemon binds to loopback by default; use authentication
and encrypted transport before exposing it beyond the local machine.

Remote relay traffic is end-to-end encrypted. The relay can observe connection metadata but cannot
read authenticated application payloads. Pairing links are trust credentials and must remain
private.

Agent providers manage their own credentials. Orqara does not need provider API keys, but agents and
commands can read files available to the daemon user. Review agent actions and do not run untrusted
workspace automation.

Workspaces from untrusted change requests require an explicit automation decision. Verification
commands run in disposable checkouts and record source fingerprints so concurrent source changes
cannot produce fresh-looking evidence.

## Security checks

`npm run test:security` exercises authentication, authorization, origin validation, encrypted
transport, and verification isolation. GitHub Actions also runs dependency auditing and these tests
for pull requests and the default branch.
