<p align="center">
  <img src="public/icon-beberes.webp" alt="Beberes Logo" width="108" height="108" />
</p>

<h1 align="center">Beberes</h1>

<p align="center">
  <strong>High-Performance, Local-First System Cleaner & Storage Optimizer for macOS and Developers.</strong>
</p>

<p align="center">
  <a href="https://github.com/naenmad/Beberes/releases"><img src="https://img.shields.io/github/v/release/naenmad/Beberes?color=2563eb&label=Latest%20Release" alt="Latest Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-059669.svg" alt="License" /></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2-24C8D8.svg?logo=tauri&logoColor=white" alt="Tauri v2" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-2021-DEA584.svg?logo=rust&logoColor=white" alt="Rust" /></a>
  <a href="https://www.apple.com/macos/"><img src="https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon%20%26%20Intel)-111827.svg?logo=apple&logoColor=white" alt="Platform" /></a>
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local%20First-059669.svg" alt="Privacy First" />
  <a href="https://github.com/sponsors/naenmad"><img src="https://img.shields.io/badge/Sponsor-%E2%99%A5-ea4aaa.svg?logo=githubsponsors&logoColor=white" alt="Sponsor Beberes" /></a>
</p>

<p align="center">
  <img src="docs/screenshots/dashboard-hero.png" alt="Beberes Dashboard Overview" width="920" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <a href="#why-beberes">Why Beberes?</a> &bull;
  <a href="#key-features">Key Features</a> &bull;
  <a href="#screenshots">Screenshots</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#building-from-source">Building from Source</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#security--privacy">Security</a> &bull;
  <a href="#support--sponsoring">Sponsoring</a> &bull;
  <a href="#license">License</a>
</p>

---

## Why Beberes?

Traditional macOS cleanup utilities often come bundled with proprietary background daemons, aggressive subscription paywalls, and persistent network telemetry.

**Beberes** (*Sundanese/Indonesian for "tidying up"*) is built from the ground up to be different:
- **Blazingly Fast**: Powered by a native Rust core, multi-threaded Rayon directory traversal, and direct POSIX filesystem operations.
- **100% Local-First & Private**: Zero tracking, zero analytics, zero network beacons, and zero cloud calls.
- **Developer-Tailored**: Built-in deep cleaners for `node_modules`, Python virtual environments, Xcode DerivedData, Docker/OrbStack VMs, and dangling Git packfiles.
- **Safety First**: Protected whitelist prevents accidental damage to core macOS system directories, with native macOS Trash put-back integration.
- **Apple Design Language**: Frosted glassmorphism interface with fluid animations, keyboard-driven navigation, and Spotlight Search (`Cmd+K`).
- **macOS Native Polish**: Native Menu Bar status tray, Hold Cmd+Q to quit with radial progress HUD, Close-to-Hide window management, and thermal/battery awareness.

---

## Key Features

Beberes comes equipped with 12 specialized modules:

| Module | Description | Target Areas |
| :--- | :--- | :--- |
| **Storage Dashboard** | Live hardware overview, storage utilization, and single-click Smart Clean. | System root and attached external volumes |
| **Disk Space Visualizer** | Interactive hierarchical treemap visualizer with drill-down exploration and breadcrumbs. | Proportional directory consumption across any path |
| **Quick Review** | Triage downloads and desktop files with keyboard shortcuts, previews, and inline rename. | `~/Downloads`, `~/Desktop`, `~/Pictures` |
| **Large & Duplicate Files** | Rapid SHA-256 duplicate content detector and size-ranked large file finder. | User directories, media libraries, archives |
| **Trash Manager** | Visual macOS Trash inspector with selective file deletion and secure emptying. | `~/.Trash` and volume trash bins |
| **Tidy Up** | Intelligent organizer grouping loose files into category folders and removing redundant installers. | Loose documents, `.dmg`, `.pkg`, `.iso` files |
| **App Uninstaller** | Comprehensive uninstaller detecting residual preferences, caches, and Application Support files. | `/Applications`, `~/Library/Application Support` |
| **System Clean** | Reclaim gigabytes from user caches, system logs, Xcode DerivedData, and simulator runtimes. | `~/Library/Caches`, `~/Library/Developer` |
| **Developer Workspace** | Deep cleaner for programming dependencies, build artifacts, and package manager caches. | `node_modules`, `venv`, `target/`, Composer, CocoaPods |
| **Startup Daemons** | Inspect, enable, disable, and clean macOS `LaunchAgents` and `LaunchDaemons`. | `~/Library/LaunchAgents`, `/Library/LaunchAgents` |
| **File Shredder** | Multi-pass hardware sanitization (1-Pass Zero, 3-Pass DoD 5220.22-M, 7-Pass Gutmann Lite). | Confidential documents, credentials, keys |
| **Git Sweeper** | Aggressive repository compression (`git gc --prune=now`) and merged local branch pruning. | Local developer workspaces (e.g. `~/Developer`) |

### Additional Capabilities
- **Multi-Drive & Flashdisk Detection**: Automatically enumerates external drives and USB flashdisks mounted under `/Volumes/*` with instant live switching.
- **Global Spotlight Search (`Cmd+K`)**: Navigate anywhere in the application or trigger actions via instant keyboard search.
- **Thermal & Battery Throttling Awareness**: Dynamically adjusts background scan threads when your MacBook runs on low battery to prevent overheating.
- **Audio Haptic Feedback**: Native Web Audio API sounds for trash emptying and completion chimes (with settings mute toggle).
- **Appearance & Scaling**: Full support for native macOS Light and Dark mode, plus adjustable UI scaling (Compact, Normal, Large).

---

## Screenshots

<div align="center">
  <img src="docs/screenshots/developer-workspace.png" alt="Developer Workspace Cleaner" width="700" style="border-radius: 8px; margin-bottom: 12px;" />
  <p><em>Developer Workspace Deep Cleaner — Reclaiming gigabytes from Cargo target, Docker VMs, and node_modules</em></p>
</div>

<div align="center">
  <img src="docs/screenshots/confirm-cleanup.png" alt="Safe Confirmation Modal" width="540" style="border-radius: 8px; margin-bottom: 12px;" />
  <p><em>Smart Whitelist Safeguards — Interactive confirmation modal protecting system directories</em></p>
</div>

---

## Installation

### Method 1: Pre-Built Binary (.dmg)

Download the latest release for your Mac architecture from the [GitHub Releases](https://github.com/naenmad/Beberes/releases) page:

- **Apple Silicon (M1/M2/M3/M4)**: Download `Beberes_*_aarch64.dmg`
- **Intel Macs (x86_64)**: Download `Beberes_*_x64.dmg`

Open the `.dmg` file and drag **Beberes** into your **Applications** folder.

### Method 2: Homebrew Cask

Install directly in a single command:

```bash
brew install --cask naenmad/beberes/beberes
```

Or add the tap first:

```bash
brew tap naenmad/beberes
brew install --cask beberes
```

---

## Building from Source

### Prerequisites
- macOS 12.0 (Monterey) or later
- [Xcode Command Line Tools](https://developer.apple.com/xcode/): `xcode-select --install`
- [Rust](https://rustup.rs/) (version 1.75 or higher): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/naenmad/Beberes.git
   cd Beberes
   ```

2. **Install frontend dependencies**:
   ```bash
   bun install # or npm install
   ```

3. **Run in development mode**:
   ```bash
   bun run tauri dev
   ```

4. **Build the production application & DMG installer**:
   ```bash
   bun run build:dmg
   ```
   The compiled DMG installer will be located in `src-tauri/target/release/bundle/dmg/`.

---

## Architecture

Beberes is built with a decoupled client-core architecture:

```text
+-------------------------------------------------------------+
|                     React 19 Frontend                       |
|  Tailwind CSS  |  Zustand Store  |  Lucide SVG  |  i18n     |
+-------------------------------------------------------------+
                              |
                     Tauri v2 IPC Bridge
                              |
+-------------------------------------------------------------+
|                      Rust Core Engine                       |
|  POSIX statvfs  |  Rayon Scanner  |  Secure Wipe  |  Git GC |
+-------------------------------------------------------------+
                              |
                     macOS Kernel & APIs
               (APFS, POSIX, osascript, launchctl)
```

- **Statvfs Volume Metrics**: Queries filesystem geometry directly through `libc::statvfs` avoiding high-overhead disk scanning or panics.
- **Cryptographic File Sanitizer**: Implements thread-safe CSPRNG random overwriting, bitwise inverse complements, hardware cache flushing (`sync_all`), byte zeroing, and inode unlinking.
- **Safe macOS Trash Integration**: Interacts with the native macOS Trash subsystem to guarantee items can be put back if deleted unintentionally.

---

## Security & Privacy

Beberes is engineered with strict local-first security guardrails:
- Zero network telemetry, cloud calls, or third-party trackers.
- Protected macOS system directory whitelisting (`/System`, `/usr`, `/bin`, etc.).
- Operates within standard user privileges without background root daemons.

For security vulnerabilities or responsible disclosure practices, please review our [Security Policy](SECURITY.md).

---

## Internationalization

Beberes is fully localized across 5 languages:

- English (`en`)
- Indonesian (`id`)
- Japanese (`ja`)
- Simplified Chinese (`zh`)
- Spanish (`es`)

Language selection is instantly switchable from the top navigation bar without requiring an application restart.

---

## Support & Sponsoring

Beberes is free, open-source software built for the developer and macOS community. If Beberes helps you keep your Mac clean and fast, please consider supporting its continuous development:

<p align="center">
  <a href="https://github.com/sponsors/naenmad"><img src="https://img.shields.io/badge/GitHub%20Sponsors-Support%20Project-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors" /></a>
  &nbsp;&nbsp;
  <a href="https://trakteer.id/naenmad"><img src="https://img.shields.io/badge/Trakteer-Dukung%20Kreator-be1e2d?style=for-the-badge&logo=kofi&logoColor=white" alt="Trakteer" /></a>
  &nbsp;&nbsp;
  <a href="https://ko-fi.com/naenmad"><img src="https://img.shields.io/badge/Ko--fi-Buy%20a%20Coffee-ff5e5b?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi" /></a>
</p>

---

## Contributing

We welcome contributions of all kinds from the community!
- Suggest features or report bugs via [GitHub Issues](https://github.com/naenmad/Beberes/issues).
- Review our [Contributing Guidelines](CONTRIBUTING.md) for local setup, code style, and PR process.
- Read our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
Copyright (c) 2026 naenmad.
