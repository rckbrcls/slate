# Slate

> **Status:** Active
> This project is currently maintained as a Tauri desktop screenplay editor.

Desktop screenplay editor for Fountain-based writing workflows. Slate combines a Tiptap screenplay editor, project browser, file-system integration, screenplay formatting, analysis panels, and local desktop packaging through Tauri.

## Summary

- Tauri desktop screenplay editor for Fountain-based writing workflows.
- Solves local screenplay drafting with custom Tiptap nodes, file-system integration, project browsing, formatting, analysis panels, and desktop packaging.
- Main stack: React, TypeScript, Vite, TanStack Router, Tiptap, Tauri 2, Rust native plugins, and local file services.
- Current status: active prototype with a separate architecture planning document.
- Technical value: shows a domain-specific editor rather than a generic markdown app, including screenplay schema, pagination, title pages, and analysis surfaces.

## Overview

`slate` is a screenplay-writing app aimed at professional drafting workflows. It is not a generic markdown editor: the codebase contains custom screenplay nodes, autocomplete, pagination logic, title pages, revision marks, statistics, character graph exploration, file watching, and project-level navigation.

## Motivation

- Make screenplay writing feel like a dedicated desktop tool.
- Use Fountain as the readable project/file format.
- Support professional screenplay elements such as scene headings, dialogue, parentheticals, transitions, dual dialogue, page breaks, and title pages.
- Provide analysis surfaces for pacing, characters, stats, and history.
- Leave room for local AI-assisted edits without depending on a hosted API.

## Features

- Welcome screen with recent projects, favorites, sorting, and folder open flow.
- Screenplay editor built on Tiptap extensions.
- File explorer and file watching for local project folders.
- Toolbar, side panels, title page, stats, pacing chart, and character graph.
- Git/history and diff controls.
- Tauri shell for native filesystem/dialog/store capabilities.

## Project Structure

```text
slate/
├── src/
│   ├── components/ # Editor, panels, toolbar, welcome screen, analytics UI
│   ├── extensions/ # Custom Tiptap screenplay schema and editor behavior
│   ├── hooks/      # Document, file, git, and project-state hooks
│   ├── lib/        # File service, pagination, stats, suggestions, session helpers
│   ├── routes/     # Welcome and editor routes
│   └── router.tsx
├── src-tauri/      # Tauri desktop shell
├── screenplay-app-architecture.md
└── package.json
```

## Current Status

The README previously described a template, but the repository now contains a real screenplay editor prototype. `screenplay-app-architecture.md` documents the larger professional editor vision and should be treated as planning context.

## Known Limitations

- Keep editor behavior grounded in screenplay/Fountain rules rather than generic rich-text assumptions.
- Preserve local-first file behavior unless the project direction changes.
- Use tests around pagination, stats, document state, and router behavior when editing those areas.
