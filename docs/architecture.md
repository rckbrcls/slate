# Architecture

## Overview

Slate is a Tauri desktop screenplay editor. The renderer owns the screenplay editing UI and Fountain-oriented workflow, while Tauri provides native desktop packaging and file-system integration.

## Goals

- Provide a dedicated screenplay editing workspace.
- Keep Fountain as the readable project/file format.
- Support local file access through desktop boundaries.
- Leave room for analysis and local AI-assisted workflows without exposing user files unnecessarily.

## System Components

### Renderer

The Vite/React app owns editor UI, screenplay formatting, project browser surfaces, and analysis panels.

### Tauri Shell

`src-tauri/` owns native desktop integration, packaging, and file-system permissions.

### Architecture Reference

`screenplay-app-architecture.md` contains deeper planning notes for screenplay schema, parsing, export, pagination, AI review, and analysis surfaces.

## Security Model

- File-system access must stay explicit and scoped.
- User screenplay files should not be uploaded or sent to hosted services without clear consent.
- Future AI-assisted editing should preserve review/accept/reject boundaries.

## Future Improvements

- Add file-format documentation for Fountain import/export.
- Add screenshots for editor, project browser, and analysis views.
- Add a release checklist for packaged desktop builds.
