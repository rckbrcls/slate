# Slate

Slate is a local-first desktop screenplay editor for Fountain-based writing workflows. It combines a custom Tiptap screenplay editor, local project browsing, disk-change synchronization, screenplay pagination, analysis panels, Git awareness, PDF/FDX export, and Electron desktop packaging.

The project is an active prototype. Most of the codebase is dedicated to screenplay-specific structure, formatting, import/export, analytics, and a small native desktop boundary.

## What Slate Solves

Screenplays are structured documents. They need scene headings, action blocks, character cues, dialogue, parentheticals, transitions, title pages, page breaks, revision marks, and export formats that preserve industry conventions. Slate keeps those screenplay concepts as typed editor nodes instead of treating a script as plain Markdown.

The app is designed for local writing workflows:

- Open a local screenplay project folder.
- Edit `.fountain`, `.spmd`, or `.txt` screenplay files.
- Keep recent projects and last-opened files locally.
- Watch the active file for disk changes.
- Export the current document to PDF or Final Draft XML (`.fdx`).
- Inspect screenplay statistics, pacing, character usage, readability, beat targets, and character co-occurrence.
- Surface Git status and history when the opened project folder is a Git repository.

## Technology Stack

| Area | Technology |
| --- | --- |
| Desktop shell | Electron 41, electron-vite, electron-builder |
| Renderer | React 19, TypeScript, Vite |
| Routing | TanStack Router with hash history |
| Editor | Tiptap 3 and ProseMirror |
| Styling | Tailwind CSS 4, shadcn-style components, Radix/Base UI primitives |
| Native bridge | Secure `window.slate` preload API over typed IPC |
| File format parsing | `fountain-js` plus project-specific serializers |
| Export | `pdfmake` with embedded Courier Prime fonts, custom FDX XML generation |
| Analytics | Custom TypeScript modules, `d3`, `recharts`, `compromise`, `syllable` |
| Tests | Vitest, React Testing Library, jsdom where required |
| Package manager | pnpm |

## Main Features

- **Project browser:** `src/routes/WelcomeRoute.tsx`, `src/components/WelcomeScreen.tsx`, and `src/hooks/useProjectStore.ts` manage local project folders, favorites, recency, and last-opened files.
- **Screenplay editor:** `src/components/Editor.tsx` uses the custom Tiptap schema exported from `src/extensions/index.ts`.
- **Fountain import/export:** `src/lib/fountain/deserialize.ts` and `src/lib/fountain/serialize.ts` translate between Fountain text and Tiptap document JSON.
- **Native file operations:** `src/lib/fileService.ts` calls `window.slate` for open, save, save as, autosave, reload, directory reads, and export writes.
- **File watching:** `src/hooks/useFileWatcher.ts` subscribes to Electron main-process file watch events and defers disk reloads when the editor has unsaved changes.
- **Pagination:** `src/lib/pagination.ts`, `src/lib/paginationLayout.ts`, `src/extensions/PageNumbers.ts`, and `src/lib/measurementDiv.ts` provide estimated and DOM-measured pagination.
- **Exports:** `src/lib/export/pdf.ts` creates PDF definitions and buffers, while `src/lib/export/fdx.ts` generates Final Draft XML.
- **Production tools:** `src/lib/production/sceneNumbers.ts`, `src/lib/production/revisions.ts`, and related Tiptap extensions handle scene numbering and revision marks.
- **Analytics:** `src/lib/stats.ts` and `src/lib/analytics/*` calculate stats, character metrics, pacing, readability, beat targets, Bechdel criteria, and co-occurrence data.
- **Git awareness:** `src/hooks/useGit.ts` and `src/lib/git/commands.ts` call high-level `window.slate.git` methods. The main process runs the local `git` binary without exposing a generic shell API.

## Project Structure

```text
slate/
|-- docs/                  # Project documentation
|-- electron/
|   |-- main/              # BrowserWindow, IPC handlers, filesystem, Git, store
|   |-- preload/           # contextBridge exposure for window.slate
|   `-- shared/            # IPC channel names and shared API types
|-- public/                # Static renderer assets and Courier Prime font files
|-- src/
|   |-- components/        # Editor, toolbar, panels, file explorer, stats UI
|   |-- extensions/        # Custom Tiptap screenplay schema and behavior
|   |-- hooks/             # Document, project, watcher, Git, and viewport hooks
|   |-- lib/               # Fountain, export, analytics, pagination, Git, production helpers
|   |-- routes/            # Welcome and editor routes
|   |-- styles/            # Screenplay-specific CSS
|   |-- App.tsx
|   |-- main.tsx
|   `-- router.tsx
|-- electron-builder.yml   # Desktop packaging configuration
|-- electron.vite.config.ts
|-- index.html             # Renderer shell
|-- package.json
`-- vite.config.ts         # Renderer-only/Vitest Vite configuration
```

## Prerequisites

- Node.js compatible with the installed frontend and Electron toolchain.
- pnpm.
- A local `git` binary if you want Git status/history surfaces to work inside opened project folders.

## Installation

```bash
pnpm install
```

## Available Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Starts the Electron desktop app through electron-vite. |
| `pnpm dev:renderer` | Starts the renderer-only Vite server for UI work that does not need native APIs. |
| `pnpm build` | Runs TypeScript checking and builds the Electron main, preload, and renderer bundles. |
| `pnpm preview` | Previews the built Electron app through electron-vite. |
| `pnpm dist` | Builds and packages the desktop app with electron-builder. |
| `pnpm dist:mac` | Builds and packages the macOS target. |
| `pnpm dist:win` | Builds and packages the Windows target. |
| `pnpm dist:linux` | Builds and packages the Linux target. |
| `pnpm test` | Runs the Vitest suite once. |
| `pnpm lint` | Runs ESLint. |
| `pnpm typecheck` | Runs TypeScript without emitting files. |
| `pnpm format` | Formats TypeScript and JavaScript files with Prettier and the Tailwind plugin. |

## Testing

Tests are implemented with Vitest. Some React and router tests opt into jsdom using file-level `@vitest-environment jsdom` comments.

Current test coverage includes:

- Fountain serialization and deserialization.
- Pagination, measured pagination, and incremental pagination.
- Screenplay stats and character analytics.
- PDF definition generation.
- FDX XML generation.
- Document external-sync behavior.
- Router hydration and editor restoration behavior.
- Editor lifecycle callback behavior.

Run tests with:

```bash
pnpm test
```

## Build And Packaging

Electron source is bundled by `electron-vite` from:

- `electron/main/index.ts`
- `electron/preload/index.ts`
- `index.html` and `src/main.tsx`

Packaged artifacts are configured in `electron-builder.yml` and emitted under `release/`. Signing, notarization, release channels, auto-update, hosted deployment, and rollback procedures are not configured yet.

## Local Data And Persistence

Slate does not use a database.

It stores and accesses data through local desktop mechanisms:

- Screenplay files are read and written directly on disk through Electron IPC.
- Recent project metadata is stored as `slate-projects.json` under Electron's `userData` directory.
- The current editor session is stored in browser `sessionStorage` under `slate-editor-session`.
- File-change detection uses Electron main-process file watchers for the active file.
- Git data is read by spawning the local `git` binary from high-level main-process handlers.

## Documentation

Start with:

- `docs/index.md` for the documentation map.
- `docs/getting-started.md` for setup and workflow commands.
- `docs/architecture.md` for renderer, native shell, persistence, and data flow.
- `docs/file-formats.md` for Fountain, Tiptap document JSON, PDF, and FDX contracts.
- `docs/development.md` for project-specific development guidance.
- `docs/deployment.md` for desktop packaging notes.
- `docs/troubleshooting.md` for common local issues.
- `SECURITY.md` for local file, shell, and Electron IPC considerations.

## Known Limitations

- No backend server, hosted API, authentication, authorization, or database exists in the current codebase.
- No CI/CD, release automation, signing, notarization, or auto-update workflow is configured.
- The Electron IPC bridge intentionally exposes local filesystem and Git features needed by the app; review handlers in `electron/main/index.ts` before distribution.

## License

No `LICENSE` file is currently committed. Decide and document the project license before distributing Slate publicly.
