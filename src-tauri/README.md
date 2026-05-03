# Slate Tauri Backend

> **Status:** Experimental
> Rust-side native package for the Slate desktop app.

## Summary

- Experimental Rust/Tauri backend for the Slate desktop editor app.
- Solves native plugin initialization for filesystem, dialogs, shell access, store persistence, and logging.
- Main stack: Rust 2021, Tauri 2, and Tauri FS/Dialog/Shell/Store/Log plugins.
- Current status: experimental and intentionally small.
- Technical value: keeps native startup/plugin wiring separate from the React/Vite editor UI.

Small Tauri backend for the Slate editor app. It currently wires native plugins and leaves most product behavior in the React/Vite frontend.

## Features

- Filesystem plugin.
- Dialog plugin.
- Shell plugin.
- Store plugin.
- Debug logging plugin setup.

## Tech Stack

- Rust 2021
- Tauri 2
- Tauri FS, Dialog, Shell, Store, and Log plugins

## Project Structure

```text
src-tauri/
├── Cargo.toml
└── src/
    ├── lib.rs
    └── main.rs
```

## Architecture

`src/lib.rs` only initializes Tauri plugins and application startup. The editor, screenplay, analytics, and export behavior indicated by frontend dependencies live outside this Rust package.
