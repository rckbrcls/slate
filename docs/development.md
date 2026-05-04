# Development

Slate should stay local-first and renderer-domain-first. The Electron layer exists to provide native desktop capabilities, not to own screenplay editing behavior.

## Working Boundaries

| Area | Main files |
| --- | --- |
| Electron main/preload | `electron/main/index.ts`, `electron/preload/index.ts`, `electron/shared/*` |
| Renderer routes | `src/routes/WelcomeRoute.tsx`, `src/routes/EditorRoute.tsx` |
| Document lifecycle | `src/hooks/useDocument.ts`, `src/lib/fileService.ts` |
| Project metadata | `src/hooks/useProjectStore.ts` |
| File explorer and watching | `src/hooks/useFileExplorer.ts`, `src/hooks/useFileWatcher.ts` |
| Git | `src/hooks/useGit.ts`, `src/lib/git/commands.ts` |
| Tiptap schema | `src/extensions/index.ts`, `src/extensions/*` |
| Export | `src/lib/export/pdf.ts`, `src/lib/export/fdx.ts` |
| Analytics | `src/lib/stats.ts`, `src/lib/analytics/*` |

## Electron IPC Rules

Renderer code should not import `electron`, `node:*`, or access IPC directly.

Use these layers:

- `electron/shared/types.ts` defines public API shapes.
- `electron/shared/ipc.ts` defines channel names.
- `electron/preload/index.ts` exposes `window.slate`.
- `src/slate-env.d.ts` types the renderer global.
- `src/lib/fileService.ts`, `src/lib/git/commands.ts`, and `src/hooks/useProjectStore.ts` are the renderer-facing wrappers.

Add high-level IPC methods instead of generic escape hatches. For example, add `window.slate.git.status(cwd)` instead of a generic `runCommand(command, args)`.

## Document Flow

`useDocument` owns:

- active file path
- dirty state
- title page data
- autosave
- open/save/save-as
- reload from disk
- external disk-change handling
- content version bumps used by stats and pagination

The hook should keep using `fountainToEditor` and `editorToFountain` for file conversion. Avoid moving editor-domain logic into Electron.

## Disk Change Sync

`useFileWatcher` subscribes to `window.slate.watchFile`. When a disk change arrives:

- clean editor state reloads from disk when content changed
- dirty editor state sets `externalChangePending`
- saves from the app suppress the next watcher event through `notifySaved`

Do not overwrite dirty editor content automatically.

## Project Store

`useProjectStore` persists recent project metadata through `window.slate.projects`.

Stored fields:

- `path`
- `name`
- `lastFile`
- `lastOpenedAt`
- `favorite`

Keep screenplay contents out of the project store.

## Git Development

Git behavior is intentionally high-level:

- `isRepo`
- `root`
- `status`
- `log`
- `diff`
- `commit`
- `checkoutFile`

The main process runs `git` with `execFile`, not a shell. Do not expose arbitrary command execution to the renderer.

## Export Development

PDF and FDX generation stays in renderer/domain code:

- `src/lib/export/pdf.ts`
- `src/lib/export/fdx.ts`

Only the final text or binary artifact crosses the Electron bridge for user-selected save paths.

## Browser Translation Protection

`index.html` must keep:

- `translate="no"` on the root document
- `class="notranslate"` on the root document
- `<meta name="google" content="notranslate" />`
- `translate="no"` on `<body>`

Browser translation extensions can mutate the DOM and destabilize React trees.

## Testing Guidance

Use focused tests near the behavior being changed. Current coverage includes:

- Fountain serialization and deserialization.
- Pagination.
- Stats and character analytics.
- PDF and FDX export.
- Document external-sync behavior.
- Router restoration behavior.
- Editor lifecycle behavior.

Mock renderer-facing wrappers such as `src/lib/fileService.ts` instead of mocking Electron internals in renderer tests.

## Lint And Formatting

ESLint is configured in `eslint.config.js` with TypeScript ESLint recommended rules and ignores generated output under `dist/`, `out/`, and `release/`.

Prettier is configured through `.prettierrc` and `.prettierignore`.
