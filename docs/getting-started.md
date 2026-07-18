# Getting Started

This guide covers the local development workflow for Slate. Slate is an Electron desktop app with a React/Vite renderer and a Python analysis sidecar.

## Prerequisites

- Node.js compatible with the installed frontend and Electron toolchain.
- pnpm.
- Python 3.11 or newer and `uv` for the local analysis engine.
- A local `git` binary if you want Git status/history inside opened project folders.

## Installation

```bash
pnpm install
uv sync --project engine --group dev
```

These commands install the Electron/renderer toolchain and the Python normalization, persistence, analysis, migration, test, and packaging dependencies.

The project does not require local environment variables by default. `.env.example` is intentionally empty apart from that note.

## Desktop Development

```bash
pnpm dev
```

This starts the Electron desktop app through `electron-vite`. Use this workflow when native dialogs, filesystem access, local project storage, file watching, Git status/history, or export writes need to work.

Native Electron source lives in:

- `electron/main/index.ts`
- `electron/preload/index.ts`
- `electron/shared/ipc.ts`
- `electron/shared/types.ts`

## Renderer-Only Development

```bash
pnpm dev:renderer
```

This starts the Vite renderer server on port `1420` with `strictPort: true`. The server ignores Electron output and screenplay files such as `*.fountain` and `*.spmd`.

Use this workflow only for renderer UI work that does not require `window.slate`. Native file, Git, project-store, and export-write flows need the Electron app.

## Testing

```bash
pnpm test
```

Tests run through Vitest. Some React tests opt into jsdom with file-level comments.

Run the engine tests separately:

```bash
uv run --project engine --group dev pytest
```

## Type Checking

```bash
pnpm typecheck
```

TypeScript covers the renderer, Electron main process, preload script, shared IPC types, and config files.

## Build

```bash
pnpm build
```

This runs `tsc --noEmit` and `electron-vite build`. The build outputs Electron bundles under `out/`.

## Packaging

```bash
pnpm dist
```

Packaging is handled by `electron-builder` using `electron-builder.yml`.

Targeted package commands:

- `pnpm dist:mac`
- `pnpm dist:win`
- `pnpm dist:linux`

Signing, notarization, auto-update, release channels, and CI/CD are not configured yet.

## Useful Files To Read First

1. `docs/product-strategy.md` for the product contract and scope.
2. `src/routes/ProjectRoute.tsx` for the primary analysis workspace.
3. `engine/src/slate_engine/service.py` for project, version, analysis, and comparison behavior.
4. `electron/main/engineClient.ts` for the sidecar lifecycle and JSON-RPC boundary.
5. `electron/main/index.ts` and `electron/preload/index.ts` for validated IPC.
6. `schemas/slate-document.schema.json` for the normalized document contract.
7. `src/routes/EditorRoute.tsx` for the legacy screenplay workspace retained during migration.

## Local Data Notes

- Screenplay content remains in user-selected local files.
- Recent project metadata is stored as `slate-projects.json` under Electron's `userData` directory.
- Each intelligence project stores `project.sqlite`, immutable source objects, and normalized JSON in its user-selected directory.
- The selected intelligence project uses browser `sessionStorage` key `slate-intelligence-session-v1`.
- Current route/session restoration uses browser `sessionStorage` key `slate-editor-session`.
- Git state is read on demand and is not persisted by Slate.
