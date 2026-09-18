#!/usr/bin/env bash
set -e

echo "==> 1. Building Beberes.app (Tauri Release)..."
bun run tauri build --bundles app

APP_PATH="src-tauri/target/release/bundle/macos/Beberes.app"
DMG_DIR="src-tauri/target/release/bundle/dmg"
DMG_PATH="${DMG_DIR}/Beberes_1.0.0_aarch64.dmg"
ICON_PATH="src-tauri/icons/icon.icns"

if [ ! -d "$APP_PATH" ]; then
  echo "Error: Beberes.app not found at $APP_PATH"
  exit 1
fi

mkdir -p "$DMG_DIR"
rm -f "$DMG_PATH"

echo "==> 2. Packaging Beberes macOS DMG Installer..."
BUNDLE_DMG_SH="${DMG_DIR}/bundle_dmg.sh"
if [ -f "$BUNDLE_DMG_SH" ]; then
  bash "$BUNDLE_DMG_SH" \
    --volname "Beberes" \
    --volicon "$ICON_PATH" \
    --app-drop-link 480 195 \
    --skip-jenkins \
    "$DMG_PATH" \
    "$APP_PATH"
else
  STAGING_DIR=$(mktemp -d /tmp/beberes-dmg.XXXXXX)
  cp -R "$APP_PATH" "$STAGING_DIR/"
  ln -s /Applications "$STAGING_DIR/Applications"
  hdiutil create -volname "Beberes" -srcfolder "$STAGING_DIR" -ov -format UDZO "$DMG_PATH"
  rm -rf "$STAGING_DIR"
fi

echo "==> DMG successfully built at:"
ls -lh "$DMG_PATH"
