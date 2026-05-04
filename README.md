# Slate

Slate is a local-first desktop screenplay editor for Fountain-based writing workflows. It combines a custom Tiptap screenplay editor, local project browsing, file-system synchronization, screenplay pagination, analysis panels, Git history awareness, and desktop packaging through Tauri 2.

The project is an active prototype. It is already more than a generic text editor: most of the codebase is dedicated to screenplay-specific structure, formatting, import/export, analytics, and native desktop boundaries.

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
- Copy prompt suggestions for external Claude Code review without uploading screenplay files from the app.

## Current Status

Slate is a desktop prototype with meaningful editor, file, export, and analysis functionality. It does not currently include a backend server, hosted account system, database, cloud synchronization, CI/CD pipeline, signing policy, notarization policy, or remote AI integration.

The committed `public/manifest.json` still contains scaffold metadata from the original web starter. It should not be treated as evidence that Slate is currently maintained as a PWA product.

## Technology Stack

| Area | Technology |
| --- | --- |
| Desktop shell | Tauri 2, Rust 2021 |
| Renderer | React 19, TypeScript, Vite |
| Routing | TanStack Router with hash history |
| Editor | Tiptap 3 and ProseMirror |
| Styling | Tailwind CSS 4, shadcn-style components, Radix/Base UI primitives |
| Native plugins | Tauri FS, Dialog, Shell, Store, Log |
| File format parsing | `fountain-js` plus project-specific serializers |
| Export | `pdfmake` with embedded Courier Prime fonts, custom FDX XML generation |
| Analytics | Custom TypeScript modules, `d3`, `recharts`, `compromise`, `syllable` |
| Tests | Vitest, React Testing Library, jsdom where required |
| Package manager | pnpm |

## Main Features

- **Project browser:** `src/routes/WelcomeRoute.tsx`, `src/components/WelcomeScreen.tsx`, and `src/hooks/useProjectStore.ts` manage local project folders, favorites, recency, and last-opened files.
- **Screenplay editor:** `src/components/Editor.tsx` uses the custom Tiptap schema exported from `src/extensions/index.ts`.
- **Fountain import/export:** `src/lib/fountain/deserialize.ts` and `src/lib/fountain/serialize.ts` translate between Fountain text and Tiptap document JSON.
- **Native file operations:** `src/lib/fileService.ts`, `src/hooks/useDocument.ts`, and Tauri FS/Dialog permissions handle open, save, save as, autosave, reload, and export writes.
- **File watching:** `src/hooks/useFileWatcher.ts` polls file modification time and defers disk reloads when the editor has unsaved changes.
- **Pagination:** `src/lib/pagination.ts`, `src/lib/paginationLayout.ts`, `src/extensions/PageNumbers.ts`, and `src/lib/measurementDiv.ts` provide estimated and DOM-measured pagination.
- **Exports:** `src/lib/export/pdf.ts` creates PDF definitions and buffers, while `src/lib/export/fdx.ts` generates Final Draft XML.
- **Production tools:** `src/lib/production/sceneNumbers.ts`, `src/lib/production/revisions.ts`, and related Tiptap extensions handle scene numbering and revision marks.
- **Analytics:** `src/lib/stats.ts` and `src/lib/analytics/*` calculate stats, character metrics, pacing, readability, beat targets, Bechdel criteria, and co-occurrence data.
- **Git awareness:** `src/hooks/useGit.ts` and `src/lib/git/commands.ts` call the local `git` binary through the Tauri shell plugin.
- **AI side panel:** `src/components/AISidePanel.tsx` provides copyable prompt suggestions and disk-sync guidance. It does not call a hosted AI API.

## Project Structure

```text
slate/
|-- docs/                  # Project documentation
|-- public/                # Static renderer assets and Courier Prime font files
|-- src/
|   |-- components/        # Editor, toolbar, panels, file explorer, stats UI
|   |-- extensions/        # Custom Tiptap screenplay schema and behavior
|   |-- hooks/             # Document, project, file, watcher, Git, and viewport hooks
|   |-- lib/               # Fountain, export, analytics, pagination, Git, production helpers
|   |-- routes/            # Welcome and editor routes
|   |-- styles/            # Screenplay-specific CSS
|   |-- App.tsx
|   |-- main.tsx
|   `-- router.tsx
|-- src-tauri/
|   |-- capabilities/      # Tauri permission model
|   |-- icons/             # Desktop bundle icons
|   |-- src/               # Rust entrypoint and plugin setup
|   |-- Cargo.toml
|   `-- tauri.conf.json
|-- index.html             # Vite renderer shell
|-- package.json           # Scripts and JavaScript dependencies
`-- vite.config.ts         # Vite, React, Tailwind, and Tauri dev server configuration
```

## Prerequisites

- Node.js compatible with the installed frontend toolchain.
- pnpm.
- Rust toolchain required by Tauri 2.
- Tauri system prerequisites for the target operating system.
- A local `git` binary if you want Git status/history surfaces to work inside opened project folders.

## Installation

```bash
pnpm install
```

## Local Development

The repository exposes both renderer-only and Tauri desktop workflows.

```bash
pnpm dev
```

Starts the Vite renderer development server. `vite.config.ts` uses port `1420` with `strictPort: true` because `src-tauri/tauri.conf.json` points Tauri development at `http://localhost:1420`.

```bash
pnpm tauri dev
```

Starts the Tauri desktop app. The Tauri configuration runs `pnpm dev` before launching the desktop shell.

Optional environment configuration lives in `.env.example`:

```env
TAURI_DEV_HOST=localhost
```

`TAURI_DEV_HOST` is used by `vite.config.ts` to configure the dev host and HMR host when a host override is needed.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Starts the Vite renderer dev server. |
| `pnpm tauri dev` | Starts the Tauri desktop app in development mode. |
| `pnpm build` | Runs `tsc --noEmit` and `vite build`. |
| `pnpm tauri build` | Runs Tauri desktop packaging, using `pnpm build` as the configured frontend build step. |
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

The renderer build is:

```bash
pnpm build
```

The desktop packaging workflow is:

```bash
pnpm tauri build
```

`src-tauri/tauri.conf.json` configures `frontendDist` as `../dist`, enables bundles, sets `targets` to `all`, and uses icons from `src-tauri/icons/`. The repository does not currently document or configure signing, notarization, release channels, auto-update, hosted deployment, or rollback procedures.

## Local Data And Persistence

Slate does not use a database.

It stores and accesses data through local desktop mechanisms:

- Screenplay files are read and written directly on disk through Tauri FS operations.
- Recent project metadata is stored with the Tauri Store plugin in `slate-projects.json`.
- The current editor session is stored in browser `sessionStorage` under `slate-editor-session`.
- File-change detection uses Tauri FS `stat` polling for the active file.
- Git data is read by spawning the local `git` binary through the Tauri shell plugin.

## Documentation

Start with:

- `docs/index.md` for the documentation map.
- `docs/getting-started.md` for setup and workflow commands.
- `docs/architecture.md` for renderer, native shell, persistence, and data flow.
- `docs/file-formats.md` for Fountain, Tiptap document JSON, PDF, and FDX contracts.
- `docs/development.md` for project-specific development guidance.
- `docs/deployment.md` for desktop packaging notes.
- `docs/troubleshooting.md` for common local issues.
- `SECURITY.md` for local file, shell, and Tauri permission considerations.

## Known Limitations

- No backend server, hosted API, authentication, authorization, or database exists in the current codebase.
- No CI/CD, release automation, signing, notarization, or auto-update workflow is configured.
- The AI side panel provides prompt suggestions only; it does not execute AI calls or manage Claude Code processes.
- `public/manifest.json` contains stale starter metadata and should be corrected or removed if a web/PWA surface becomes a real product target.
- Tauri permissions currently allow broad `$HOME/**` filesystem access and allow spawning `git`; review `src-tauri/capabilities/default.json` before distributing builds.
- `src-tauri/tauri.conf.json` sets `csp` to `null`; this should be revisited before any production release.

## License

No `LICENSE` file is currently committed, and `src-tauri/Cargo.toml` has an empty `license` field. Decide and document the project license before distributing Slate publicly.
