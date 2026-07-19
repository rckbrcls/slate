#!/bin/bash
set -euo pipefail

APP_DISPLAY_NAME="Slate"
REPO="rckbrcls/slate"
GITHUB_API="https://api.github.com/repos/${REPO}/releases"

usage() {
  cat << EOF
Usage: install.sh [--version <version>]

Options:
  --version <version>  Install a specific version (ex: 0.1.0)
  -h, --help           Show this help
EOF
}

VERSION=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This installer only supports macOS."
  exit 1
fi

if [ -n "$VERSION" ]; then
  VERSION="${VERSION#v}"
  RELEASE_URL="${GITHUB_API}/tags/v${VERSION}"
else
  RELEASE_URL="${GITHUB_API}/latest"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to parse GitHub API responses."
  exit 1
fi

TMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Fetching release metadata..."
RELEASE_JSON=$(curl -fsSL \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$RELEASE_URL") || {
  echo "Failed to fetch release metadata from GitHub."
  exit 1
}

ASSET_JSON=$(printf '%s' "$RELEASE_JSON" | python3 -c '
import json, sys
data = json.load(sys.stdin)
assets = [a for a in data.get("assets", []) if a.get("name", "").endswith((".dmg", ".zip"))]
if not assets:
    print("ERROR: No .dmg/.zip assets found.", file=sys.stderr)
    sys.exit(3)
# Prefer zip (simple extract), then dmg, prefer arm64/universal names when present
def score(name: str) -> tuple:
    n = name.lower()
    return (
        0 if n.endswith(".zip") else 1,
        0 if "arm64" in n or "universal" in n or "mac" in n else 1,
        name,
    )
assets.sort(key=lambda a: score(a.get("name", "")))
a = assets[0]
print(json.dumps({"name": a["name"], "url": a["browser_download_url"], "size": a.get("size")}))
')

ASSET_NAME=$(echo "$ASSET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')
ASSET_URL=$(echo "$ASSET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["url"])')
ASSET_SIZE=$(echo "$ASSET_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("size") or "")')

DOWNLOAD_PATH="$TMP_DIR/$ASSET_NAME"
echo "Downloading $ASSET_NAME..."
curl -fL "$ASSET_URL" -o "$DOWNLOAD_PATH"

if [ -n "$ASSET_SIZE" ]; then
  DOWNLOADED_SIZE=$(stat -f%z "$DOWNLOAD_PATH")
  if [ "$DOWNLOADED_SIZE" -ne "$ASSET_SIZE" ]; then
    echo "Downloaded file size mismatch (expected $ASSET_SIZE, got $DOWNLOADED_SIZE)."
    exit 1
  fi
fi

EXTRACT_DIR="$TMP_DIR/extract"
mkdir -p "$EXTRACT_DIR"
APP_PATH=""

if [[ "$ASSET_NAME" == *.zip ]]; then
  echo "Extracting zip..."
  ditto -x -k "$DOWNLOAD_PATH" "$EXTRACT_DIR"
  APP_PATH=$(find "$EXTRACT_DIR" -maxdepth 3 -name "*.app" -print -quit || true)
elif [[ "$ASSET_NAME" == *.dmg ]]; then
  echo "Mounting dmg..."
  MOUNT_POINT="$TMP_DIR/mnt"
  mkdir -p "$MOUNT_POINT"
  ATTACH_OUT=$(hdiutil attach -nobrowse -readonly -mountpoint "$MOUNT_POINT" "$DOWNLOAD_PATH")
  cleanup_dmg() {
    hdiutil detach "$MOUNT_POINT" >/dev/null 2>&1 || true
    rm -rf "$TMP_DIR"
  }
  trap cleanup_dmg EXIT
  APP_PATH=$(find "$MOUNT_POINT" -maxdepth 2 -name "*.app" -print -quit || true)
fi

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "No .app bundle found in the release asset."
  exit 1
fi

APP_BUNDLE_NAME=$(basename "$APP_PATH")
TARGET_DIR="/Applications"
if [ ! -w "$TARGET_DIR" ]; then
  TARGET_DIR="$HOME/Applications"
  mkdir -p "$TARGET_DIR"
fi
TARGET_PATH="$TARGET_DIR/$APP_BUNDLE_NAME"

if [ -d "$TARGET_PATH" ]; then
  echo "Removing existing $TARGET_PATH"
  rm -rf "$TARGET_PATH"
fi

echo "Installing to $TARGET_DIR"
ditto "$APP_PATH" "$TARGET_PATH"
if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine "$TARGET_PATH" 2>/dev/null || true
fi

echo "✅ ${APP_DISPLAY_NAME} installed at $TARGET_PATH"
echo "Open with: open \"$TARGET_PATH\""
