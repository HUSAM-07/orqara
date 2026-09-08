# Orqara documentation

Use this index to find the shortest path into the repository.

| Document                           | Purpose                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| [Architecture](architecture.md)    | Package boundaries, runtime components, and core data flow |
| [Development](development.md)      | Local setup, common commands, and contribution workflow    |
| [Testing](testing.md)              | Focused tests, security checks, and release evidence       |
| [Security policy](../SECURITY.md)  | Trust model and private vulnerability reporting            |
| [Contributing](../CONTRIBUTING.md) | Issues, pull requests, and review expectations             |

Package source is organized by runtime boundary under `packages/`. Start with the package that owns
the behavior, then follow its imports into `protocol` or `client` only when the contract changes.
