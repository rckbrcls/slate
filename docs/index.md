# Slate Documentation

Slate is transitioning from a screenplay editor into a local-first application for versioned document analysis. [Product Strategy](product-strategy.md) is the source of truth for the approved product direction. The remaining guides describe the implemented screenplay-editor codebase until that migration is complete.

Slate includes a local Python analysis sidecar and a per-project SQLite database. It does not include a hosted API, authentication system, or CI/CD pipeline. The documentation covers both the primary document-intelligence workflow and the legacy editor code retained during migration.

## Guides

| Guide | Purpose |
| --- | --- |
| [Product Strategy](product-strategy.md) | Approved product pivot, MVP scope, target architecture, and delivery sequence. |
| [Getting Started](getting-started.md) | Prerequisites, installation, environment configuration, and available scripts. |
| [Architecture](architecture.md) | Renderer/native-shell responsibilities, data flow, persistence, and current boundaries. |
| [File Formats](file-formats.md) | Fountain import/export, Tiptap document nodes, PDF output, and FDX XML export. |
| [Development](development.md) | How to work safely in the screenplay editor, hooks, export, analytics, and Electron areas. |
| [Deployment](deployment.md) | Desktop packaging notes for Electron builds. |
| [Troubleshooting](troubleshooting.md) | Common setup, runtime, file, export, and Git issues. |

Security considerations live in the root [`SECURITY.md`](../SECURITY.md).

## Documentation Scope

These files intentionally avoid documenting nonexistent systems:

- There is no `docs/api.md` because the current app has no HTTP endpoints, server routes, SDK, or external API contract.
- There is no separate `docs/database.md`; the portable project schema and migration boundary are documented in [Architecture](architecture.md) and [Product Strategy](product-strategy.md).
- There is no separate `docs/setup.md` because setup is simple enough for the root README and [Getting Started](getting-started.md).
- There is no `docs/security.md` because the root `SECURITY.md` is the security policy and risk document.
- There is no `CONTRIBUTING.md` because the repository does not currently define a public contribution workflow.

## Source Of Truth

When documentation and code disagree, prefer the current code:

- `package.json` for scripts and dependencies.
- `electron.vite.config.ts` for Electron main, preload, and renderer bundling.
- `electron-builder.yml` for desktop packaging.
- `electron/main/index.ts` for native handlers and window security defaults.
- `electron/preload/index.ts` for the exposed `window.slate` API.
- `electron/shared/types.ts` and `electron/shared/ipc.ts` for IPC contracts.
- `vite.config.ts` for renderer-only and Vitest behavior.
- `src/extensions/index.ts` for the active Tiptap screenplay schema.
- `src/hooks/useDocument.ts` and `src/lib/fileService.ts` for document file behavior.
- `src/lib/fountain/*`, `src/lib/export/*`, and `src/lib/pagination.ts` for screenplay format and output behavior.
