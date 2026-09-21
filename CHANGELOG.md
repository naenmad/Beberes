# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-09-21 (Codename: Chandra)

### Added
- **Browser Extension Real Logos**:
  - Automatically parse manifest icons (`icons`, `action.default_icon`) from Chrome, Brave, Arc, Edge, Firefox, and Zen Browser into base64 data URIs.
- **macOS Full Disk Access Hub**:
  - Unified permissions center in Settings with one-click opening of macOS System Settings.
  - Transparent documentation of development TCC binary signature resets vs stable release persistence.
- **Human-Friendly Error Boundary & Recovery**:
  - Replaced technical stack traces with calm glassmorphic error panels and structured error codes.
  - One-click GitHub issue reporting with pre-filled diagnostics.
  - Interactive Error Simulation / Crash Test in Settings > System.
- **Comprehensive Documentation**:
  - Complete GUI & CLI User Manual added in `docs/USAGE.md`.

### Changed
- **Streamlined Accent Colors**:
  - Removed redundant secondary accent in Settings to ensure an uncluttered, focused primary accent theme.
- **Monochromatic Empty States**:
  - Harmonized empty states across Similar Photos, Trash Manager, and Plugin Manager to match the clean aesthetic of Tidy Up.

## [1.3.0] - 2026-09-20

### Added
- Native macOS Menu Bar Popover companion view.
- Deep battery telemetry: battery temperature in Celsius, nominal capacity, and cycle health.
- Terminal CLI companion (`beberes`) executing in under 10ms.
- Smart Trash Auto-Prune detecting unemptied items older than 30 days.
- Floating glassmorphic context menu (right-click) in Disk Visualizer and Large Files.

## [1.2.0] - 2026-09-20

### Added
- Native macOS Quick Look integration (`Space`).
- Dynamic dock badges reflecting real-time cleanable items.
- Finder drag-and-drop global overlay.
- Low disk space watchdog monitoring storage thresholds.

## [1.1.1] - 2026-09-19 (Codename: Bayu Patch 1)

### Fixed
- **Comprehensive Multilingual Localization Overhaul**:
  - Replaced all remaining hardcoded UI strings with reactive `useTranslation()` calls across every screen, dialog, and component.
  - Resolved untranslated text in Health Gauge (*Action Recommended*, *Good Condition*, *Optimal Health*, dynamic descriptions, hygiene metric, and master cleanup button *Bereskan Sekaligus* / *Clean Everything* / *一括クリーンアップ*).
  - Localized Global Homebrew & Bottle Cache maintenance banner, console output viewer, and log controls.
  - Localized Port Hunter table headers (*Port*, *Process & PID*, *Binding Address*, *User*, *Action*), search input, and SIGKILL confirmation modal.
  - Localized Xcode & Simulators Purger target status indicators, safe-cleaning badges, and obsolete simulator purge buttons.
  - Localized Project Hibernate scan triggers, day threshold selectors, and dormant project cards.
  - Localized Orphaned App Leftovers tab headers, KPI cards (*Total Leftovers*, *Reclaimable Storage*, *macOS System Protection*), item selection badges, and cleanup modals.
  - Localized Tidy Up Smart Automation Rules (download archiver, screenshot consolidator), badges, and status toasts.
  - Localized Quick Review media controls (*Open in App*, *Open with Default App*, full screen expander, navigation tooltips).
  - Localized File Shredder overwrite pass badges (*1 Pass*, *3 Passes*, *7 Passes*).
  - Localized Git Sweeper repository sizes, last commit dates, and path shortcuts.
  - Localized Floating Sidebar collapse buttons and draggable resize border handles.
  - Localized Settings whitelist path removal buttons and custom scan directory actions.

### Changed
- **100% Locale Parity Across 5 Supported Languages**:
  - Full key parity across English (`en`), Indonesian (`id`), Japanese (`ja`), Chinese (`zh`), and Spanish (`es`) with exactly 683 translation keys per language.
  - Zero missing keys and zero untranslated fallbacks.

## [1.1.0] - 2026-09-19 (Codename: Bayu)

### Added
- **Orphaned App Leftovers Scanner**:
  - Deep scan engine detecting abandoned residual directories (`~/Library/Application Support`, `~/Library/Caches`, `~/Library/Saved Application State`, `~/Library/Preferences`, `~/Library/Containers`) from apps no longer installed on macOS.
  - Hardened system whitelisting protecting Apple native identities (`com.apple.*`, `MobileSync`, `CloudDocs`, `AddressBook`, `Safari`, etc.).
  - Mode switcher tab in App Uninstaller ("Aplikasi Terpasang" vs "Sisa Aplikasi Dihapus") with selective checkboxes, path inspection, and one-click removal.
- **Global Developer Tooling & Package Manager Pruner**:
  - Integrated Homebrew cleanup tool executing `brew cleanup --prune=all` to purge outdated bottles, downloads, and expired lockfiles.
  - Real-time terminal output modal/log viewer in Developer Workspace.
  - Expanded detection across 14 tech stack ecosystems (Rust, Flutter, Go, Node.js, Python, Xcode, Java, PHP, Docker, AI Models, Ruby, .NET, C/C++, and Universal Package Caches).
- **Smart Automation Rules**:
  - Non-destructive automated filing rules for macOS daily workspaces in Tidy Up.
  - Automatic archiver moving downloads older than 30 days into `~/Archive/Downloads/Recent_Archive/` and `Older/`.
  - Desktop screenshot consolidator gathering scattered images into `~/Pictures/Screenshots/`.
- **System Optimizer & Mac Hygiene Score**:
  - Real-time holistic 0-100% Mac Hygiene Score gauge in Dashboard.
  - One-click "Bereskan Sekaligus" master clean orchestration flushing both disk caches and inactive RAM memory simultaneously.
  - APFS Local Snapshots detection and purging to free macOS "System Data" purgeable space.
  - RAM Inactive Memory Purger via native macOS kernel memory manager.
  - Deep browser cache cleaner targeting 6 major browsers (Safari, Chrome, Arc, Brave, Firefox, Edge).
- **Native macOS Menu Bar & Accessibility (A11y)**:
  - Interactive macOS status bar menu with direct 1-click Quick Clean, Free Inactive RAM, Empty Trash, and page navigations.
  - Instant page navigation retaining DOM state, scroll positions, and filters.
  - Global keyboard shortcuts (`Cmd+1` through `Cmd+9`, `Cmd+,`, `Cmd+R`, `Esc`).
  - Native Finder drag-and-drop zone routing `.app` bundles to Uninstaller and directories to Tidy Up.
  - High-contrast mode and reduced-motion compliance.

## [1.0.0] - 2026-09-18 (Codename: Apex)

### Added
- **Core Engine & Architecture**:
  - Native macOS system inspection powered by Tauri v2 and Rust.
  - POSIX-native statvfs disk capacity querying with multi-drive and external flashdisk support (`/` and `/Volumes/*`).
  - Native macOS Trash integration (`osascript` and trash APIs) with put-back capabilities.
  - Protected whitelist mechanism prohibiting accidental deletion of macOS core system files.
  - Zero-telemetry, 100% local-first offline execution.

- **Interactive Storage & Cleaning Modules**:
  - **Dashboard**: Hardware metrics overview, storage consumption breakdowns, and quick single-click Smart Clean.
  - **Disk Visualizer**: Interactive hierarchical treemap tiles with drill-down exploration, breadcrumbs, and proportional storage heatmaps.
  - **Quick Review**: Rapid triage tool with keyboard shortcuts, preview thumbnails, and inline renaming.
  - **Large & Duplicate Files**: Fast SHA-256 duplicate content detector and size-ranked large file finder.
  - **Trash Manager**: Selective item inspection, permanent deletion, and safe emptying of macOS Trash.
  - **Tidy Up**: Desktop and Downloads organizer sorting unorganized files and redundant `.dmg` / `.pkg` installers into tidy category folders.
  - **Application Uninstaller**: Deep app uninstaller detecting residual preferences, caches, and Application Support leftovers.
  - **System Clean**: User caches, log files, Xcode DerivedData, simulator runtimes, and icon caches.
  - **Developer Workspace**: Package manager artifact cleaner supporting Node.js (`node_modules`), Python (`venv`, `__pycache__`), Rust (`target`), and Gradle/Composer caches.
  - **Startup Daemons Manager**: Control macOS `LaunchAgents` and `LaunchDaemons` with enable/disable toggles and plist management.
  - **File Shredder**: Multi-pass hardware sanitization supporting 1 Pass (Quick Zero), 3 Passes (DoD 5220.22-M), and 7 Passes (Gutmann Lite).
  - **Git Repository Sweeper**: Aggressive `git gc --prune=now` optimizer and merged branch pruner for local developer repositories.

- **User Interface & Experience**:
  - macOS frosted glassmorphism visual design language.
  - Spotlight Search modal accessible via `Cmd+K`.
  - Resizable and collapsible sidebar navigation with integrated storage drive switcher.
  - UI scaling system (Compact, Normal, Large) and Light/Dark appearance modes.
  - Full internationalization (i18n) across 5 languages: English, Indonesian, Japanese, Simplified Chinese, and Spanish.
  - Strict zero-emoji policy across all UI elements, icons, and locale strings.

[1.1.0]: https://github.com/naenmad/Beberes/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/naenmad/Beberes/releases/tag/v1.0.0

