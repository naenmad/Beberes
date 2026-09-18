# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/naenmad/Beberes/releases/tag/v1.0.0
