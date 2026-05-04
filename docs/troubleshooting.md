# Troubleshooting

This guide covers common local issues in the Electron-based Slate app.

## Desktop App Does Not Launch

Check:

- `package.json`
- `electron.vite.config.ts`
- `electron/main/index.ts`
- `electron/preload/index.ts`

Common causes:

- Dependencies are not installed. Run `pnpm install`.
- Electron postinstall scripts were not approved by pnpm, so the Electron binary may be missing.
- The preload path in `electron/main/index.ts` does not match the `electron-vite` output shape.
- The sandboxed preload bundle is not being emitted as CommonJS at `out/preload/index.cjs`.
- A TypeScript error prevents `electron-vite` from bundling main or preload code.

## Renderer-Only Mode Cannot Use Files

`pnpm dev:renderer` serves the React app without Electron. Native dialogs, filesystem access, file watching, project storage, Git, and export writes require `window.slate`, which only exists in the Electron desktop app.

Use `pnpm dev` when testing native workflows.

## Open Or Save Dialogs Fail

Relevant files:

- `src/lib/fileService.ts`
- `electron/preload/index.ts`
- `electron/main/index.ts`

Slate uses Electron dialogs for file and folder selection. Current screenplay filters allow `.fountain`, `.spmd`, and `.txt` files for screenplay open/save flows.

If dialogs fail, confirm that:

- the app is running through Electron, not renderer-only Vite
- `window.slate.openFileDialog`, `openDirectoryDialog`, and `saveFileDialog` are exposed from preload
- IPC handlers are registered before the window loads

## Recent Projects Are Missing

Slate stores recent projects in `slate-projects.json` under Electron's `userData` directory.

Relevant files:

- `src/hooks/useProjectStore.ts`
- `electron/main/index.ts`

The store contains project paths, names, last files, timestamps, and favorite flags. It does not store screenplay contents.

## Editor Route Redirects To Welcome

Slate restores the editor route from `sessionStorage` key `slate-editor-session`.

If `/editor` redirects back to `/`, there is no restorable session. Open a project folder from the welcome screen first.

If a previous session cannot restore the file, `EditorRoute` tries:

1. the last open file
2. `untitled.fountain` in the project directory
3. the first alphabetical `.fountain` or `.spmd` file in the project directory

If none works, it clears the session and returns to welcome.

## External Disk Changes Are Not Detected

Relevant files:

- `src/hooks/useFileWatcher.ts`
- `electron/main/index.ts`

Slate watches the active file from the Electron main process. If changes are not detected:

- confirm the active file still exists
- confirm the app is running through Electron
- confirm `window.slate.watchFile` is exposed
- save or reload the file to reset watcher state

When the editor is dirty, external changes intentionally set `externalChangePending` instead of overwriting local edits.

## Git Panel Is Empty

Relevant files:

- `src/hooks/useGit.ts`
- `src/lib/git/commands.ts`
- `electron/main/index.ts`

Git status and history appear only when the opened project folder is inside a Git work tree. The app runs the local `git` binary from high-level main-process handlers.

Check:

- `git` is installed and available in the app environment
- the opened folder is inside a Git repository
- the repository has commits if history is expected
- file paths passed to diff or checkout are inside the repository workflow

## PDF Export Fails

Relevant files:

- `src/lib/export/pdf.ts`
- `src/lib/export/pdfFonts.ts`
- `src/lib/fileService.ts`

PDF export uses `pdfmake` and embedded Courier Prime font data. The final PDF buffer is written through Electron IPC after the user picks a save path.

Check:

- Courier Prime font data exists in `src/lib/export/pdfFonts.ts`
- the save dialog returns a path
- the selected destination is writable

## FDX Export Fails

Relevant files:

- `src/lib/export/fdx.ts`
- `src/lib/fileService.ts`

FDX export serializes the current ProseMirror document to Final Draft XML and writes it as text through Electron IPC.

If output looks malformed, inspect the serializer first, not the Electron bridge.

## Browser Translation Breaks The DOM

`index.html` must keep the anti-translation markers:

- `translate="no"`
- `class="notranslate"`
- `<meta name="google" content="notranslate" />`

Browser translation tools can mutate React-managed DOM nodes and cause navigation or remove-child errors.
