# Deployment

> Slate is transitioning to a Python analysis sidecar. Distribution commands now
> package `engine/src/slate_engine` as `engine/dist/slate-engine` before invoking
> electron-builder. This document otherwise continues to describe the current
> Electron packaging state.

The only deployment-like workflow present in the repository is Electron desktop packaging.

Slate does not currently include:

- Hosted web deployment.
- Backend service deployment.
- Database provisioning.
- CI/CD pipeline.
- Signing or notarization automation.
- Auto-update infrastructure.

## Current Packaging Stack

- Native shell: Electron.
- Build tool: `electron-vite`.
- Packager: `electron-builder`.
- Bundle configuration: `electron-builder.yml`.
- Main process entry: `electron/main/index.ts`.
- Preload entry: `electron/preload/index.ts`, emitted as `out/preload/index.cjs`.
- Renderer entry: `index.html` and `src/main.tsx`.

## Build

```bash
pnpm build
```

This runs TypeScript checking and `electron-vite build`. Bundled output is emitted under `out/`.

## Package

```bash
pnpm dist
```

This builds and packages the app with `electron-builder`.

Targeted commands:

```bash
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

`electron-builder.yml` currently configures:

- `appId: com.slate.editor`
- `productName: Slate`
- output directory `release`
- `asar: true`
- application icon source `public/slate.png`
- macOS icon `build/generated-icons/icon.icns`
- Windows icon `build/generated-icons/icon.ico`
- Linux icon `public/slate.png`
- macOS `dmg`
- Windows `nsis`
- Linux `AppImage`

## Not Yet Configured

Before distributing public builds, decide and implement:

- Versioning policy.
- macOS signing and notarization.
- Windows code signing.
- Linux package metadata beyond AppImage defaults.
- Auto-update channel and provider.
- Release notes workflow.
- Crash reporting policy.
- CI/CD packaging environment.
- Security reporting contact.
- License.

## Local Data During Packaged Runs

Slate stores recent project metadata as `slate-projects.json` under Electron's `userData` directory. Intelligence projects remain in user-selected portable directories with `project.sqlite`, immutable objects, normalized JSON, and artifacts. Legacy screenplay files and exported artifacts remain in user-selected local paths.

## Environment

No production environment variables are required by the current codebase.
