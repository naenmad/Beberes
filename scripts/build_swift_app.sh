#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SWIFT_DIR="${REPO_ROOT}/BeberesSwift"
BUILD_DIR="${REPO_ROOT}/build"
APP_NAME="Beberes.app"
APP_PATH="${BUILD_DIR}/${APP_NAME}"

echo "==> 1. Compiling BeberesSwift (Release)..."
swift build -c release --package-path "${SWIFT_DIR}"

RELEASE_BIN="${SWIFT_DIR}/.build/release/Beberes"
RESOURCE_BUNDLE="${SWIFT_DIR}/.build/release/Beberes_Beberes.bundle"

if [ ! -f "${RELEASE_BIN}" ]; then
  echo "Error: Release binary not found at ${RELEASE_BIN}"
  exit 1
fi

echo "==> 2. Assembling ${APP_NAME} bundle..."
rm -rf "${APP_PATH}"
mkdir -p "${APP_PATH}/Contents/MacOS"
mkdir -p "${APP_PATH}/Contents/Resources"

# Copy main binary
cp "${RELEASE_BIN}" "${APP_PATH}/Contents/MacOS/Beberes"
chmod +x "${APP_PATH}/Contents/MacOS/Beberes"

# Copy Icons to Contents/Resources
if [ -f "${SWIFT_DIR}/Sources/Beberes/Resources/AppIcon.icns" ]; then
  cp "${SWIFT_DIR}/Sources/Beberes/Resources/AppIcon.icns" "${APP_PATH}/Contents/Resources/AppIcon.icns"
fi
if [ -f "${SWIFT_DIR}/Sources/Beberes/Resources/AppIcon.png" ]; then
  cp "${SWIFT_DIR}/Sources/Beberes/Resources/AppIcon.png" "${APP_PATH}/Contents/Resources/AppIcon.png"
fi

# Copy SPM Resource Bundle and ensure it has a valid Info.plist for codesign
if [ -d "${RESOURCE_BUNDLE}" ]; then
  cp -R "${RESOURCE_BUNDLE}" "${APP_PATH}/Contents/Resources/"
  cat << 'EOF' > "${APP_PATH}/Contents/Resources/Beberes_Beberes.bundle/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.naenmad.beberes.resources</string>
    <key>CFBundleName</key>
    <string>Beberes_Beberes</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
</dict>
</plist>
EOF
fi

# Generate Info.plist
cat <<EOF > "${APP_PATH}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>Beberes</string>
	<key>CFBundleExecutable</key>
	<string>Beberes</string>
	<key>CFBundleIconFile</key>
	<string>AppIcon</string>
	<key>CFBundleIdentifier</key>
	<string>com.naenmad.beberes</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>Beberes</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>2.0.0</string>
	<key>CFBundleVersion</key>
	<string>2.0.0</string>
	<key>LSMinimumSystemVersion</key>
	<string>14.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSSupportsAutomaticGraphicsSwitching</key>
	<true/>
	<key>LSApplicationCategoryType</key>
	<string>public.app-category.utilities</string>
	<key>NSHumanReadableCopyright</key>
	<string>Copyright © 2026 Naenmad. All rights reserved.</string>
</dict>
</plist>
EOF

echo "==> 3. Signing ${APP_NAME}..."
codesign --force --deep --sign - "${APP_PATH}"

echo "==> 4. Verifying Code Signature..."
codesign --verify --deep --strict "${APP_PATH}"

echo "==> Successfully created ${APP_PATH}!"

# Install to /Applications if requested or by default
if [ "$1" == "--install" ] || [ "$1" == "-i" ] || [ -d "/Applications" ]; then
  echo "==> 5. Installing to /Applications/Beberes.app..."
  rm -rf "/Applications/Beberes.app"
  cp -R "${APP_PATH}" "/Applications/Beberes.app"
  # Refresh Finder / LaunchServices cache
  touch "/Applications/Beberes.app"
  echo "==> Installed to /Applications/Beberes.app successfully!"
fi
