# Troubleshooting

## Tauri development fails

Checks:

- Confirm Rust/Tauri prerequisites.
- Confirm Node dependencies are installed.
- Use renderer-only scripts to isolate web UI issues from desktop shell issues.

## Typecheck or build fails

Checks:

- `pnpm typecheck` runs TypeScript with no emit.
- `pnpm build` combines typecheck and Vite build.
- Review screenplay editor schema changes alongside import/export code.

## File access behaves unexpectedly

Checks:

- Review Tauri permissions.
- Confirm selected project folders and file paths.
- Treat local screenplay files as user-owned data.
