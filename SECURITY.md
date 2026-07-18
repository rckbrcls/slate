# Security Policy

Slate is a local-first desktop screenplay editor. Its primary security concerns are local file access, native IPC boundaries, user-owned screenplay data, exported documents, and Git execution.

## Reporting A Vulnerability

Do not open public issues for security vulnerabilities.

Private vulnerability reporting contact:

- TODO: not identified in the current codebase.

## Supported Versions

| Version | Supported |
| --- | --- |
| `main` | Yes |

## Current Security Model

Slate does not currently include:

- User accounts.
- Authentication.
- Authorization.
- Hosted APIs.
- Backend services.
- Database credentials.
- Remote analytics.
- Remote third-party data services.
- Cloud file synchronization.

The app runs as an Electron desktop application. The renderer owns product workflow, while the Electron main process owns native file dialogs, filesystem access, project metadata persistence, file watching, Git execution, and window security defaults.

The renderer does not receive Node.js integration. Native capabilities are exposed through the typed `window.slate` preload API from `electron/preload/index.ts`.

## Electron Boundary

Relevant files:

- `electron/main/index.ts`
- `electron/preload/index.ts`
- `electron/shared/ipc.ts`
- `electron/shared/types.ts`
- `src/slate-env.d.ts`

Current desktop defaults include:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- denied permission requests by default
- blocked new-window creation by default
- navigation prevention outside the loaded app
- a Content Security Policy injected from the main process

Do not expose generic shell, filesystem, or IPC primitives to the renderer. Add high-level methods to `window.slate` instead.

## Local File Access

Slate reads and writes user-selected screenplay files through Electron IPC.

Relevant files:

- `src/lib/fileService.ts`
- `src/hooks/useDocument.ts`
- `src/hooks/useFileExplorer.ts`
- `src/hooks/useFileWatcher.ts`
- `electron/main/index.ts`

The current prototype allows the renderer to ask the main process to read and write paths involved in the local project workflow. Review and narrow that policy before public distribution.

## Project Metadata Persistence

Recent project metadata is stored locally in `slate-projects.json` under Electron's `userData` directory.

Document-intelligence projects are portable local directories. The renderer can invoke
only high-level project, version, analysis, comparison, progress, and cancellation
operations. Electron owns the Python sidecar process and exchanges JSON-RPC over
`stdin/stdout`; no local network port or raw subprocess API is exposed to the renderer.

Relevant files:

- `src/hooks/useProjectStore.ts`
- `electron/main/index.ts`

Stored data includes local paths, project display names, last file paths, timestamps, and favorite flags. This metadata can reveal local folder names and writing-project locations. Treat it as user-sensitive local data.

## Editor Session Persistence

The active editor session is stored in browser `sessionStorage`.

Relevant file:

- `src/lib/editorSession.ts`

The key is `slate-editor-session`. It stores only the active project directory and active file path. It does not store screenplay contents.

## Git Access

Slate runs the local `git` binary from the Electron main process for Git status, history, diffs, commits, and file checkout helpers.

Relevant files:

- `electron/main/index.ts`
- `src/lib/git/commands.ts`
- `src/hooks/useGit.ts`

The renderer can only call high-level Git methods on `window.slate.git`; it cannot pass arbitrary shell commands. Do not add additional spawned commands without a dedicated security review.

## Exports

PDF and FDX exports are generated locally and written to user-selected paths.

Relevant files:

- `src/lib/export/pdf.ts`
- `src/lib/export/fdx.ts`
- `src/lib/fileService.ts`

Exported files can contain full screenplay content and title-page contact information. Treat exported artifacts as sensitive user data.

## Dependency And Asset Notes

- Courier Prime font files are committed under `public/fonts/`.
- PDF font virtual-file-system data is committed in `src/lib/export/pdfFonts.ts`.
- There is no committed `LICENSE` file; resolve licensing before public distribution.

## Pre-Release Security Checklist

Before distributing packaged builds:

- Narrow filesystem IPC policy if possible.
- Review every Git handler and keep command execution high-level.
- Confirm Content Security Policy behavior in development and packaged builds.
- Confirm no stale scaffold metadata misrepresents product identity.
- Decide how security reports should be submitted.
- Decide and document project licensing.
- Review export paths and local metadata for sensitive data exposure.
- Verify no remote network calls were introduced unintentionally.
