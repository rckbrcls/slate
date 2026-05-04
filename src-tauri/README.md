# Slate Tauri Shell

`src-tauri/` contains the native desktop shell for Slate. It is intentionally small: Rust initializes Tauri plugins and desktop configuration, while the React/Vite renderer owns screenplay editing, file workflow orchestration, exports, analytics, and UI behavior.

## Responsibilities

The Tauri shell currently provides:

- Desktop window startup.
- Native file-system access through `tauri-plugin-fs`.
- Native open/save dialogs through `tauri-plugin-dialog`.
- Shell access for the local `git` binary through `tauri-plugin-shell`.
- Local project metadata persistence through `tauri-plugin-store`.
- Debug logging through `tauri-plugin-log`.
- Desktop bundle configuration and icons.

It does not currently provide:

- Custom Rust commands.
- Backend business logic.
- Database access.
- Authentication or authorization.
- Cloud synchronization.
- AI execution.
- Background job orchestration.

## Key Files

| File | Purpose |
| --- | --- |
| `src/lib.rs` | Initializes Tauri plugins and starts the app runtime. |
| `src/main.rs` | Native entrypoint that calls `app_lib::run()`. |
| `Cargo.toml` | Rust package metadata and Tauri plugin dependencies. |
| `tauri.conf.json` | Tauri product metadata, dev/build hooks, window settings, security, and bundle config. |
| `capabilities/default.json` | Runtime permissions for FS, dialog, shell, and store access. |
| `icons/` | Desktop bundle icons. |

## Plugin Wiring

`src/lib.rs` registers:

```rust
tauri_plugin_fs::init()
tauri_plugin_dialog::init()
tauri_plugin_shell::init()
tauri_plugin_store::Builder::new().build()
```

In debug builds, it also registers:

```rust
tauri_plugin_log::Builder::default()
```

## Build Hooks

`tauri.conf.json` connects the native shell to the renderer:

```json
{
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  }
}
```

The desktop development workflow is therefore:

```bash
pnpm tauri dev
```

The desktop packaging workflow is:

```bash
pnpm tauri build
```

## Permissions

Runtime permissions are declared in `capabilities/default.json`.

Current permissions include:

- `core:default`
- `fs:default`
- Read/write/read-dir/stat access under `$HOME/**`
- `dialog:default`
- `shell:default`
- `store:default`
- Permission to spawn `git` with unrestricted arguments

These permissions support the current local-first screenplay editor and Git integration. Review them before distributing builds.

## Product Metadata

Current Tauri metadata:

- Product name: `slate`
- Version: `0.1.0`
- Identifier: `com.slate.app`
- Window title: `Slate`
- Default window size: `1200x800`
- Minimum window size: `800x600`
- Bundle targets: `all`

`Cargo.toml` still contains placeholder package metadata such as `description = "A Tauri App"`, `authors = ["you"]`, and an empty license field. Update those before public distribution.

## Security Notes

- `tauri.conf.json` currently sets `csp` to `null`.
- Filesystem access is broad under `$HOME/**`.
- Shell access is limited to `git`, but Git arguments are unrestricted.
- The shell should not be expanded to run arbitrary commands without a dedicated security review.

See the root [`SECURITY.md`](../SECURITY.md) for the broader security policy.
