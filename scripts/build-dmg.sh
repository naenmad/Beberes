#!/usr/bin/env bash
set -e

echo "==> 1. Generating Crisp Retina DMG Background..."
swift scripts/generate_dmg_background.swift

echo "==> 2. Building Beberes.app (Tauri Release)..."
bun run tauri build --bundles app

APP_PATH="src-tauri/target/release/bundle/macos/Beberes.app"
DMG_DIR="src-tauri/target/release/bundle/dmg"
DMG_PATH="${DMG_DIR}/Beberes_1.0.0_aarch64.dmg"
ICON_PATH="src-tauri/icons/icon.icns"
BG_PATH="src-tauri/icons/dmg-background.png"

if [ ! -d "$APP_PATH" ]; then
  echo "Error: Beberes.app not found at $APP_PATH"
  exit 1
fi

mkdir -p "$DMG_DIR"
rm -f "$DMG_PATH"

echo "==> 3. Packaging Beberes macOS DMG Installer with Retina Style..."
if command -v dmgbuild &> /dev/null; then
  dmgbuild -s scripts/dmgbuild_settings.py "Beberes" "$DMG_PATH"
elif [ -f "${DMG_DIR}/bundle_dmg.sh" ]; then
  bash "${DMG_DIR}/bundle_dmg.sh" \
    --volname "Beberes" \
    --volicon "$ICON_PATH" \
    --background "$BG_PATH" \
    --window-size 600 360 \
    --icon-size 110 \
    --icon "Beberes.app" 130 165 \
    --app-drop-link 470 165 \
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
