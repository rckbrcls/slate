# Getting Started

This guide covers the local development workflow for Slate. Slate is a Tauri desktop app with a React/Vite renderer, so there are two main ways to work with it: renderer-only development and full desktop development.

## Requirements

- Node.js compatible with the installed dependencies.
- pnpm.
- Rust toolchain required by Tauri 2.
- Tauri system prerequisites for the operating system you are targeting.
- A local `git` binary if you want Git status and history features inside opened screenplay project folders.

## Install Dependencies

From the repository root:

```bash
pnpm install
```

This installs the renderer dependencies, Tauri CLI package, TypeScript tooling, Vitest, Tailwind, Tiptap, and other JavaScript packages declared in `package.json`.

Rust dependencies for the native shell are declared in `src-tauri/Cargo.toml` and locked in `src-tauri/Cargo.lock`.

## Environment Configuration

The repository includes `.env.example`:

```env
TAURI_DEV_HOST=localhost
```

`vite.config.ts` reads `TAURI_DEV_HOST` and, when present, uses it for the Vite server host and HMR host. Most local development can use the default configuration without changing this value.

No API keys, database URLs, authentication secrets, or service credentials are required by the current codebase.

## Renderer Development

```bash
pnpm dev
```

This starts Vite on port `1420` with `strictPort: true`. The server ignores changes under `src-tauri/` and screenplay files such as `*.fountain` and `*.spmd`.

Use this workflow when working on renderer code that does not require native dialogs, Tauri Store, Tauri FS, or Tauri shell execution.

## Desktop Development

```bash
pnpm tauri dev
```

This starts the Tauri desktop app. `src-tauri/tauri.conf.json` points Tauri at `http://localhost:1420` and runs `pnpm dev` before launching the desktop shell.

Use this workflow when you need to verify:

- Native open/save dialogs.
- File reads and writes through Tauri FS.
- Project metadata persistence through Tauri Store.
- Git status/history through the Tauri shell plugin.
- Desktop window behavior.

## Verification Commands

The project exposes these checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` runs `tsc --noEmit` and `vite build`.

The test suite is run with Vitest:

```bash
pnpm test
```

Some tests use jsdom through file-level `@vitest-environment jsdom` comments. Other tests run directly against pure TypeScript modules.

## Desktop Packaging Command

```bash
pnpm tauri build
```

This uses Tauri packaging and the `beforeBuildCommand` from `src-tauri/tauri.conf.json`, which is currently `pnpm build`.

The repository does not currently define signing, notarization, auto-update, or release publication steps.

## First Files To Read

For a fast orientation pass:

1. `README.md` for the project overview.
2. `package.json` for scripts and dependency categories.
3. `src/router.tsx` for the application routes.
4. `src/routes/WelcomeRoute.tsx` and `src/routes/EditorRoute.tsx` for the main user flow.
5. `src/extensions/index.ts` for the active screenplay schema.
6. `src/hooks/useDocument.ts` and `src/lib/fileService.ts` for file handling.
7. `src-tauri/capabilities/default.json` for native permissions.

## Notes

- Slate is local-first. Screenplay documents are user-owned local files.
- Recent project metadata is stored by the Tauri Store plugin, not by a database.
- The current editor session is stored in `sessionStorage`.
- The AI side panel copies prompt suggestions; it does not call an external AI service.
- The committed web manifest currently contains stale starter metadata and is not the source of truth for product identity.
