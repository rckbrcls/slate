# Development Guide

This guide explains how to make code changes in Slate without breaking the screenplay-specific model. Slate is not a generic rich-text app; most changes should preserve the relationship between Tiptap nodes, Fountain serialization, pagination, export, analytics, and local desktop permissions.

## Core Development Rules

- Keep app code, comments, UI strings, and documentation in English.
- Prefer project-specific screenplay behavior over generic editor behavior.
- Keep the renderer as the owner of product logic unless a feature truly needs native Rust support.
- Do not document or add backend, database, authentication, or cloud workflows unless those systems are actually introduced.
- Update tests when changing serialization, pagination, export, document state, routing, or analytics behavior.

## Main Implementation Areas

| Area | Key files |
| --- | --- |
| Routing | `src/router.tsx`, `src/routes/WelcomeRoute.tsx`, `src/routes/EditorRoute.tsx` |
| Editor schema | `src/extensions/index.ts`, `src/extensions/*` |
| Document state | `src/hooks/useDocument.ts`, `src/lib/editorSession.ts` |
| File operations | `src/lib/fileService.ts`, `src/hooks/useFileWatcher.ts`, `src/hooks/useFileExplorer.ts` |
| Project persistence | `src/hooks/useProjectStore.ts` |
| Fountain I/O | `src/lib/fountain/deserialize.ts`, `src/lib/fountain/serialize.ts` |
| Pagination | `src/lib/pagination.ts`, `src/lib/paginationLayout.ts`, `src/extensions/PageNumbers.ts`, `src/lib/measurementDiv.ts` |
| Export | `src/lib/export/pdf.ts`, `src/lib/export/fdx.ts`, `src/lib/export/pdfStyles.ts` |
| Analytics | `src/lib/stats.ts`, `src/lib/analytics/*`, `src/components/stats/*` |
| Git integration | `src/hooks/useGit.ts`, `src/lib/git/commands.ts` |
| Native shell | `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/tauri.conf.json` |

## Adding Or Changing Screenplay Nodes

When changing the screenplay schema, update every relevant layer:

1. Add or modify the Tiptap node in `src/extensions/`.
2. Export and register it in `src/extensions/index.ts`.
3. Update `ScreenplayKeymap` or `ScreenplayAutocomplete` if the new node changes editing flow.
4. Update `src/lib/fountain/deserialize.ts` if Fountain import should recognize it.
5. Update `src/lib/fountain/serialize.ts` if Fountain export should preserve it.
6. Update `src/lib/pagination.ts` if it affects printed layout or page breaks.
7. Update `src/lib/export/pdf.ts` if it should appear in PDFs.
8. Update `src/lib/export/fdx.ts` if it should appear in Final Draft XML.
9. Update analytics if it affects counts, scenes, characters, dialogue, or pacing.
10. Add or update targeted Vitest coverage.

Non-printable screenplay structure such as sections, synopses, and notes may still matter for import/export and analysis even when omitted from PDF output.

## Fountain Round Trips

Fountain import starts in `fountainToEditor`. It parses tokens from `fountain-js`, extracts title-page fields, detects forced markers from source lines, and creates Tiptap JSON content.

Fountain export starts in `editorToFountain`. It walks the ProseMirror document and writes Fountain syntax for supported nodes.

When changing either side, use or extend `src/lib/fountain/serialize.test.ts`.

Important behaviors to preserve:

- Title-page fields are carried separately from document nodes.
- Forced scene headings use `.`.
- Forced character cues use `@`.
- Forced transitions use `>`.
- Inline bold, italic, bold-italic, and underline formatting are preserved for supported text nodes.
- Dual dialogue serializes with `^` on the second character cue.
- Page breaks serialize as `===`.

## Document And File Workflow

`useDocument` is the source of truth for the active editor file. It manages:

- Active `filePath`.
- Dirty state.
- Title-page data.
- Autosave.
- Open/save/save-as.
- Reload from disk.
- External file changes.
- Programmatic editor updates that should not mark the document dirty.

`useFileWatcher` polls file modification time through Tauri FS. If a disk change arrives while the editor is dirty, the app sets `externalChangePending` instead of overwriting local edits.

When changing this workflow, update `src/hooks/useDocument.test.tsx` and route tests if restoration behavior changes.

## Project Store And Session State

`useProjectStore` persists recent project metadata in the Tauri Store file `slate-projects.json`. It stores:

- Project path.
- Display name.
- Last file path.
- Last opened timestamp.
- Favorite flag.

`editorSession.ts` stores the current editor route restoration snapshot in browser `sessionStorage`.

Do not introduce database assumptions when working in this area.

## Pagination

`src/lib/pagination.ts` has three pagination paths:

- `paginate` estimates line usage without DOM measurement.
- `paginateMeasured` paginates with measured pixel heights.
- `paginateIncremental` preserves unaffected earlier page breaks and recalculates from the affected page.

Pagination handles explicit page breaks, scene-heading widow protection, character orphan protection, and dialogue split metadata for `MORE` / `CONT'D` style behavior.

When changing pagination, update `src/lib/pagination.test.ts`.

## Export Development

PDF export and FDX export are separate contracts.

PDF export:

- Builds a `pdfmake` document definition in `src/lib/export/pdf.ts`.
- Uses layout constants from `src/lib/export/pdfStyles.ts`.
- Registers embedded Courier Prime fonts from `src/lib/export/pdfFonts.ts`.
- Writes a binary buffer through `saveBinaryFile`.

FDX export:

- Generates XML directly in `src/lib/export/fdx.ts`.
- Maps editor nodes to Final Draft paragraph types.
- Escapes XML special characters.
- Handles title pages and dual dialogue.

When adding printable nodes, update both exporters or explicitly document why a node is intentionally omitted.

## Analytics Development

Analytics modules read the ProseMirror document directly. Keep calculations local and deterministic.

Current modules:

- `stats.ts` for page, scene, word, character, and ratio totals.
- `analytics/characters.ts` for character line and word counts.
- `analytics/cooccurrence.ts` for scene co-occurrence matrices.
- `analytics/pacing.ts` for per-page action/dialogue intensity.
- `analytics/readability.ts` for dialogue readability.
- `analytics/beatsheet.ts` for beat target pages.
- `analytics/bechdel.ts` for Bechdel criteria with user-provided gender labels.

When analytics depend on character names, preserve the convention of stripping parenthetical extensions and normalizing to uppercase.

## Tauri Shell Development

The native shell currently initializes plugins only. Add Rust-side commands only when the renderer cannot safely or cleanly own the behavior.

Before changing native permissions, inspect:

- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`

Current permissions include broad `$HOME/**` file access and Git shell spawning. Narrowing these permissions requires verifying open/save, file explorer, file watcher, project store, and Git workflows.

## Styling And Formatting

Prettier is configured in `.prettierrc`:

- No semicolons.
- Double quotes.
- Two-space indentation.
- Trailing commas where valid in ES5.
- `prettier-plugin-tailwindcss` with `src/styles.css` as the Tailwind stylesheet.

ESLint is configured in `eslint.config.js` with TypeScript ESLint recommended rules and ignores `dist/` and `src-tauri/`.

## Test Coverage Map

| Behavior | Test files |
| --- | --- |
| Fountain serialization | `src/lib/fountain/serialize.test.ts` |
| Pagination | `src/lib/pagination.test.ts` |
| Stats | `src/lib/stats.test.ts` |
| Character analytics and co-occurrence | `src/lib/analytics/characters.test.ts` |
| PDF definition | `src/lib/export/pdf.test.ts` |
| FDX export | `src/lib/export/fdx.test.ts` |
| Document external sync | `src/hooks/useDocument.test.tsx` |
| Router hydration and restoration | `src/router.test.tsx` |
| Editor lifecycle | `src/components/Editor.test.tsx` |

## Stale Or Generated-Like Files

- `public/manifest.json` currently contains starter metadata and should not be used as product documentation.
- `src/lib/export/pdfFonts.ts` contains large embedded font data. Avoid manual edits unless regenerating the PDF font virtual file system intentionally.
