# Slate Documentation

This documentation describes the current Slate codebase: a local-first Tauri desktop screenplay editor with a React/Vite renderer and custom Tiptap screenplay model.

Slate does not currently include a backend server, hosted API, database, authentication system, or CI/CD pipeline. The useful documentation therefore focuses on the editor architecture, local file workflow, file formats, desktop packaging, security boundaries, and development conventions.

## Guides

| Guide | Purpose |
| --- | --- |
| [Getting Started](getting-started.md) | Prerequisites, installation, environment configuration, and available scripts. |
| [Architecture](architecture.md) | Renderer/native-shell responsibilities, data flow, persistence, and current boundaries. |
| [File Formats](file-formats.md) | Fountain import/export, Tiptap document nodes, PDF output, and FDX XML export. |
| [Development](development.md) | How to work safely in the screenplay editor, hooks, export, analytics, and Tauri areas. |
| [Deployment](deployment.md) | Desktop packaging notes for Tauri builds. |
| [Troubleshooting](troubleshooting.md) | Common setup, runtime, file, export, and shell issues. |

Security considerations live in the root [`SECURITY.md`](../SECURITY.md).

The native shell has a focused README at [`src-tauri/README.md`](../src-tauri/README.md).

## Documentation Scope

These files intentionally avoid documenting nonexistent systems:

- There is no `docs/api.md` because the current app has no HTTP endpoints, server routes, RPC layer, custom Tauri commands, SDK, or external API contract.
- There is no `docs/database.md` because the current app has no database, ORM, migration, or seed workflow.
- There is no separate `docs/setup.md` because setup is simple enough for the root README and [Getting Started](getting-started.md).
- There is no `docs/security.md` because the root `SECURITY.md` is the security policy and risk document.
- There is no `CONTRIBUTING.md` because the repository does not currently define a public contribution workflow.

## Source Of Truth

When documentation and code disagree, prefer the current code:

- `package.json` for scripts and dependencies.
- `vite.config.ts` for renderer development server behavior.
- `src-tauri/tauri.conf.json` for Tauri build hooks and bundle settings.
- `src-tauri/capabilities/default.json` for native permissions.
- `src/extensions/index.ts` for the active Tiptap screenplay schema.
- `src/hooks/useDocument.ts` and `src/lib/fileService.ts` for document file behavior.
- `src/lib/fountain/*`, `src/lib/export/*`, and `src/lib/pagination.ts` for screenplay format and output behavior.
