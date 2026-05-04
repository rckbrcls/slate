# Desktop Packaging

Slate does not currently have a hosted web deployment, backend deployment, CI/CD workflow, release pipeline, signing policy, notarization policy, or auto-update setup.

The only deployment-like workflow present in the repository is Tauri desktop packaging.

## Packaging Stack

- Renderer build: Vite output in `dist/`.
- Native shell: Tauri 2 under `src-tauri/`.
- Bundle configuration: `src-tauri/tauri.conf.json`.
- Rust package metadata: `src-tauri/Cargo.toml`.
- Bundle icons: `src-tauri/icons/`.

## Renderer Build

```bash
pnpm build
```

This command is defined in `package.json` as:

```bash
tsc --noEmit && vite build
```

It typechecks the renderer and creates the Vite production output.

## Tauri Desktop Build

```bash
pnpm tauri build
```

`src-tauri/tauri.conf.json` currently configures:

- `frontendDist`: `../dist`
- `beforeBuildCommand`: `pnpm build`
- `bundle.active`: `true`
- `bundle.targets`: `all`
- window title: `Slate`
- default window size: `1200x800`
- minimum window size: `800x600`
- product name: `slate`
- identifier: `com.slate.app`

## Release Gaps

Before distributing builds publicly, define and document:

- Supported operating systems and architectures.
- Versioning policy across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
- Code signing requirements.
- macOS notarization requirements.
- Release artifact storage.
- Update channel and auto-update strategy, if any.
- Pre-release verification checklist.
- Rollback or replacement process for broken installers.
- License and third-party notice requirements.

## Security Review Before Packaging

Review these files before producing release artifacts:

- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json`
- `SECURITY.md`

Important current concerns:

- Filesystem permissions allow access under `$HOME/**`.
- Shell permissions allow spawning `git` with unrestricted arguments.
- `csp` is set to `null`.
- The app works with user-owned screenplay files and exported documents.

## Not Currently Applicable

The repository has no evidence of:

- Docker deployment.
- Vercel, Netlify, or static-hosting deployment.
- AWS, Supabase, Firebase, or other cloud environment setup.
- GitHub Actions or another CI/CD workflow.
- Production environment variables beyond optional local Tauri host configuration.
