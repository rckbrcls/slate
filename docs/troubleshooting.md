# Troubleshooting

This guide covers issues that match the current Slate codebase. It intentionally avoids backend, database, authentication, cloud, and CI/CD troubleshooting because those systems are not present in the repository.

## Vite Cannot Start

Relevant files:

- `package.json`
- `vite.config.ts`
- `.env.example`
- `src-tauri/tauri.conf.json`

Checks:

- `vite.config.ts` uses port `1420` with `strictPort: true`.
- `src-tauri/tauri.conf.json` expects the development URL to be `http://localhost:1420`.
- If `TAURI_DEV_HOST` is set, Vite also configures HMR with that host and port `1421`.

Common cause:

- Another process is already using port `1420`.

## Tauri Development Does Not Launch

Relevant files:

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`

Checks:

- Confirm the Rust toolchain and Tauri system prerequisites are installed locally.
- Confirm JavaScript dependencies are installed with `pnpm install`.
- Confirm the renderer can start on port `1420`.
- Confirm Tauri can run its configured `beforeDevCommand`, currently `pnpm dev`.

## Native File Open Or Save Fails

Relevant files:

- `src/lib/fileService.ts`
- `src/hooks/useDocument.ts`
- `src-tauri/capabilities/default.json`

Slate uses Tauri dialog and FS plugins for file operations. Current filters allow `.fountain`, `.spmd`, and `.txt` files for screenplay open/save flows.

Checks:

- Confirm the selected file path is under the permissions granted in `src-tauri/capabilities/default.json`.
- Confirm the file is readable or writable by the current operating-system user.
- If the failure happens after editing permissions, confirm the FS permission entry still covers read, write, read-dir, and stat operations used by the app.

## Project Browser Does Not Show Expected Files

Relevant files:

- `src/hooks/useFileExplorer.ts`
- `src/components/FileExplorer.tsx`

The file explorer filters noisy entries:

- `.git`
- `node_modules`
- `.DS_Store`
- `target`
- `.next`
- `dist`
- `build`

The UI treats `.fountain` and `.spmd` as screenplay file extensions.

## Last Project Or File Does Not Restore

Relevant files:

- `src/lib/editorSession.ts`
- `src/routes/WelcomeRoute.tsx`
- `src/routes/EditorRoute.tsx`
- `src/hooks/useProjectStore.ts`

Slate restores the editor route from `sessionStorage` key `slate-editor-session`. Recent project data is stored separately through Tauri Store in `slate-projects.json`.

The editor route tries to restore:

1. The last explicit file path.
2. `untitled.fountain` inside the active project folder.
3. The first sorted `.fountain` or `.spmd` file in the project folder.

If none of those can be opened, Slate clears the editor session and navigates back to the welcome screen.

## Disk Changes Are Waiting

Relevant files:

- `src/hooks/useFileWatcher.ts`
- `src/hooks/useDocument.ts`
- `src/components/AISidePanel.tsx`
- `src/routes/EditorRoute.tsx`

Slate polls the active file modification time. If the file changes on disk while the editor is clean, Slate reloads it. If the file changes while the editor has unsaved edits, Slate sets `externalChangePending` and waits for the user to reload from disk.

This protects unsaved editor changes from being overwritten automatically.

## Autosave Does Not Run Immediately

Relevant file:

- `src/hooks/useDocument.ts`

Autosave waits for three seconds after the document becomes dirty. It only saves when an existing `filePath` is available. New untitled documents need an initial save path before autosave can write to disk.

## Git Status Or History Is Missing

Relevant files:

- `src/hooks/useGit.ts`
- `src/lib/git/commands.ts`
- `src-tauri/capabilities/default.json`

Git status and history appear only when the opened project folder is inside a Git work tree. The app runs the local `git` binary through the Tauri shell plugin.

Checks:

- Confirm the selected project folder is a Git repository.
- Confirm `git` is installed and available in the environment visible to the Tauri app.
- Confirm `src-tauri/capabilities/default.json` still includes `shell:allow-spawn` for `git`.

## PDF Export Fails

Relevant files:

- `src/lib/export/pdf.ts`
- `src/lib/export/pdfStyles.ts`
- `src/lib/export/pdfFonts.ts`
- `src/lib/fileService.ts`

PDF export uses `pdfmake` and embedded Courier Prime font data. The final PDF buffer is written through Tauri FS after the user picks a save path.

Checks:

- Confirm the export path is writable.
- Confirm `src/lib/export/pdfFonts.ts` still exports all Courier Prime font names referenced by `src/lib/export/pdf.ts`.
- Confirm changes to screenplay nodes are also represented in the PDF export switch statement if those nodes should be printable.

## FDX Export Produces Missing Content

Relevant files:

- `src/lib/export/fdx.ts`
- `src/extensions/index.ts`

FDX export manually maps supported ProseMirror node types to Final Draft paragraph types. If a new printable screenplay node is added to the editor schema, it must be added to the FDX exporter when appropriate.

Currently mapped printable elements include:

- Scene headings.
- Action.
- Character cues.
- Dialogue.
- Parentheticals.
- Transitions.
- Dual dialogue.
- Title-page fields.

## Tests Need DOM APIs

Relevant test files:

- `src/router.test.tsx`
- `src/hooks/useDocument.test.tsx`
- `src/components/Editor.test.tsx`

React and route hydration tests opt into jsdom with `@vitest-environment jsdom`. Pure module tests do not need jsdom.

## Stale Web Manifest Data Appears

Relevant file:

- `public/manifest.json`

The committed manifest still contains starter names such as `TanStack App` and `Create TanStack App Sample`. This is stale scaffold metadata, not current Slate product documentation. Correct or remove it only when web/PWA behavior becomes part of the product scope.
