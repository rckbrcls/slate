# Security Policy

Slate is a local-first desktop screenplay editor. Its primary security concerns are local file access, native shell permissions, user-owned screenplay data, exported documents, and future AI integration boundaries.

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
- Remote AI calls.
- Cloud file synchronization.

The app runs as a desktop application through Tauri. The renderer coordinates the product workflow, while Tauri plugins provide native access to files, dialogs, local storage, and shell execution.

## Local File Access

Slate reads and writes user-selected screenplay files through the Tauri FS plugin.

Relevant files:

- `src/lib/fileService.ts`
- `src/hooks/useDocument.ts`
- `src/hooks/useFileExplorer.ts`
- `src/hooks/useFileWatcher.ts`
- `src-tauri/capabilities/default.json`

Current filesystem permissions in `src-tauri/capabilities/default.json` allow reading, writing, directory reads, and stat operations under `$HOME/**`.

This broad access supports the current prototype workflow, but it should be narrowed before public distribution if possible.

## Project Metadata Persistence

Recent project metadata is stored locally through the Tauri Store plugin.

Relevant file:

- `src/hooks/useProjectStore.ts`

The store key is `projects`, and the store file is currently loaded as `slate-projects.json`. Stored data includes local paths, project display names, last file paths, timestamps, and favorite flags.

This metadata can reveal local folder names and writing-project locations. Treat it as user-sensitive local data.

## Editor Session Persistence

The active editor session is stored in browser `sessionStorage`.

Relevant file:

- `src/lib/editorSession.ts`

The key is `slate-editor-session`. It stores only the active project directory and active file path. It does not store screenplay contents.

## Shell Access

Slate uses the Tauri shell plugin to run the local `git` binary for Git status, history, diffs, commits, and file checkout helpers.

Relevant files:

- `src/lib/git/commands.ts`
- `src/hooks/useGit.ts`
- `src-tauri/capabilities/default.json`

Current shell permissions allow spawning:

```json
{
  "name": "git",
  "cmd": "git",
  "args": true
}
```

Because `args` is currently unrestricted, review every Git command path before expanding shell usage. Do not add additional spawned commands without a dedicated security review.

## Content Security Policy

`src-tauri/tauri.conf.json` currently sets:

```json
"csp": null
```

This may be acceptable during early local development, but it is not a strong production security posture. Define an explicit CSP before distributing Slate broadly.

## Clipboard Use

`src/components/AISidePanel.tsx` copies prompt suggestions to the clipboard through `navigator.clipboard.writeText`.

The current implementation copies static prompt text only. It does not copy screenplay contents automatically.

If future features copy selected screenplay text or generated prompts containing user content, make that action explicit in the UI.

## AI And External Services

The current AI side panel does not call OpenAI, Anthropic, Claude Code, or any hosted service. It provides prompt suggestions that the user can copy manually.

Future AI-assisted editing should preserve these boundaries unless product direction changes:

- Never upload screenplay files without explicit user action and clear disclosure.
- Keep review/accept/reject flows visible to the user.
- Do not execute local commands or modify files through an AI workflow without explicit approval.
- Clearly distinguish copied prompts from automated integrations.

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

- Narrow `$HOME/**` filesystem permissions if possible.
- Restrict shell command arguments if possible.
- Replace `csp: null` with an explicit CSP.
- Confirm no stale scaffold metadata misrepresents product identity.
- Decide how security reports should be submitted.
- Decide and document project licensing.
- Review export paths and local metadata for sensitive data exposure.
- Verify no remote network calls were introduced unintentionally.
