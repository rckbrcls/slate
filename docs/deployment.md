# Deployment

## Overview

Slate is distributed as a Tauri desktop application. The repository exposes renderer build and Tauri command scripts, but a public signing/release policy was not confirmed in this documentation pass.

## Build

The package script defines:

```bash
pnpm build
```

The package also exposes:

```bash
pnpm tauri
```

## Notes

- Confirm platform targets before release.
- Confirm signing/notarization policy.
- Confirm where generated installers or bundles should be stored.
