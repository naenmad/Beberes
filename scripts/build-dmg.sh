#!/usr/bin/env bash
set -e

VERSION=$(grep -m1 '"version":' package.json | cut -d '"' -f 4)
DMG_DIR="src-tauri/target/release/bundle/dmg"
ICON_PATH="src-tauri/icons/icon.icns"
BG_PATH="src-tauri/icons/dmg-background.png"

echo "==> 1. Generating Crisp Retina DMG Background..."
swift scripts/generate_dmg_background.swift

package_dmg() {
  local target_arch=$1
  local app_path=$2
  local dmg_path="${DMG_DIR}/Beberes_${VERSION}_${target_arch}.dmg"

  if [ ! -d "$app_path" ]; then
    echo "Error: Beberes.app not found at $app_path"
    return 1
  fi

  mkdir -p "$DMG_DIR"
  rm -f "$dmg_path"

  echo "==> Packaging ${target_arch} DMG Installer..."
  if command -v dmgbuild &> /dev/null; then
    dmgbuild -s scripts/dmgbuild_settings.py "Beberes" "$dmg_path"
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
      "$dmg_path" \
      "$app_path"
  else
    STAGING_DIR=$(mktemp -d /tmp/beberes-dmg.XXXXXX)
    cp -R "$app_path" "$STAGING_DIR/"
    ln -s /Applications "$STAGING_DIR/Applications"
    hdiutil create -volname "Beberes" -srcfolder "$STAGING_DIR" -ov -format UDZO "$dmg_path"
    rm -rf "$STAGING_DIR"
  fi

  echo "==> ${target_arch} DMG successfully built at:"
  ls -lh "$dmg_path"
}

TARGET_FILTER="${1:-all}"

if [ "$TARGET_FILTER" = "arm64" ] || [ "$TARGET_FILTER" = "all" ]; then
  echo "==> Building Apple Silicon (arm64) App..."
  bun run tauri build --target aarch64-apple-darwin --bundles app
  package_dmg "arm64" "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Beberes.app"
fi

if [ "$TARGET_FILTER" = "x86_64" ] || [ "$TARGET_FILTER" = "all" ]; then
  echo "==> Building Intel (x86_64) App..."
  bun run tauri build --target x86_64-apple-darwin --bundles app
  package_dmg "x86_64" "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Beberes.app"
fi
