# Getting Started

This guide covers the local development workflow for Slate. Slate is an Electron desktop app with a React/Vite renderer.

## Prerequisites

- Node.js compatible with the installed frontend and Electron toolchain.
- pnpm.
- A local `git` binary if you want Git status/history inside opened project folders.

## Installation

```bash
pnpm install
```

This installs Electron, electron-vite, electron-builder, the renderer dependencies, TypeScript tooling, Vitest, Tailwind, Tiptap, and other JavaScript packages declared in `package.json`.

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

1. `src/routes/EditorRoute.tsx` for the main editor workspace flow.
2. `src/hooks/useDocument.ts` for document lifecycle, autosave, and external disk changes.
3. `src/lib/fileService.ts` for renderer access to the Electron file bridge.
4. `electron/main/index.ts` for native dialogs, filesystem handlers, project storage, Git, and security defaults.
5. `electron/preload/index.ts` for the `window.slate` API.
6. `src/extensions/index.ts` for the active Tiptap screenplay schema.
7. `src/lib/export/pdf.ts` and `src/lib/export/fdx.ts` for export behavior.

## Local Data Notes

- Screenplay content remains in user-selected local files.
- Recent project metadata is stored as `slate-projects.json` under Electron's `userData` directory.
- Current route/session restoration uses browser `sessionStorage` key `slate-editor-session`.
- Git state is read on demand and is not persisted by Slate.
