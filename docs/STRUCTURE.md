# Project Directory Structure

Dokumentasi ini merincikan struktur repositori **Beberes** v1.1.0 secara lengkap, memisahkan antara frontend (React 19 + TypeScript) dan backend sistem native (Rust + Tauri v2).

```text
Beberes/
├── docs/                               # Dokumentasi Teknis & Panduan Arsitektur
│   ├── ARCHITECTURE.md                 # Arsitektur hybrid desktop & prinsip desain
│   ├── MERMAID.md                      # Diagram arsitektur, workflow IPC, & tabel referensi
│   ├── PRD.md                          # Product Requirements Document
│   ├── STRUCTURE.md                    # Pemetaan struktur repositori & modul
│   ├── UI_UX.md                        # Panduan estetika macOS frosted glassmorphism
│   ├── Cask/                           # Formula Homebrew Cask (beberes.rb)
│   └── screenshots/                    # Tangkapan layar tampilan antarmuka
│
├── src-tauri/                          # BACKEND NATIVE ENGINE (Rust 2021)
│   ├── Cargo.toml                      # Konfigurasi crate & dependensi Rust
│   ├── Cargo.lock                      # Lockfile dependensi Rust
│   ├── tauri.conf.json                 # Konfigurasi build, bundle, window, & capabilities Tauri v2
│   ├── capabilities/                   # Izin dan ACL keamanan Tauri
│   │   └── default.json
│   ├── icons/                          # Asset icon aplikasi (.icns, .png, .ico)
│   └── src/
│       ├── main.rs                     # Entrypoint binary Tauri
│       ├── lib.rs                      # Registrasi plugin, IPC commands, menu bar tray, & hotkey handler
│       ├── utils/
│       │   └── mod.rs                  # Utilitas formatting ukuran berkas & POSIX helper
│       └── commands/                   # Modul pemrosesan sistem native
│           ├── mod.rs                  # Registrasi modul commands
│           ├── browser.rs              # Deep cleaner cache 6 browser utama
│           ├── cleaner.rs              # Eksekusi pembersihan sistem ke ~/.Trash
│           ├── finder.rs               # Integrasi penemuan berkas & reveal in Finder
│           ├── git_sweeper.rs          # Kompresi repositori git (git gc) & branch pruner
│           ├── installer.rs            # Pembersih berkas installer (.dmg, .pkg)
│           ├── maintenance.rs          # Homebrew pruner (`brew cleanup`) & system scripts
│           ├── memory.rs               # Pengoptimal RAM inactive memory (`vm_stat`, `purge`)
│           ├── organizer.rs            # Mesin pengatur berkas cerdas Tidy Up
│           ├── orphaned.rs             # Deteksi sisa berkas aplikasi yang telah dihapus
│           ├── reviewer.rs             # Mesin Quick Review & triase berkas
│           ├── scanner.rs              # Scanner paralel Rayon untuk direktori sistem & 14 stack dev
│           ├── shredder.rs             # Penghancur berkas kriptografis (CSPRNG, DoD, Gutmann)
│           ├── smart_rules.rs          # Eksekutor aturan otomasi pintar non-destruktif
│           ├── snapshots.rs            # Deteksi & pembersih APFS local Time Machine snapshots
│           ├── startup.rs              # Manajer LaunchAgents & LaunchDaemons macOS
│           ├── trash.rs                # Pemeriksa & pengosong native macOS Trash
│           ├── uninstaller.rs          # Uninstaller aplikasi lengkap dengan kalkulasi sisa berkas
│           └── visualizer.rs           # Visualisasi treemap ruang penyimpanan hierarkis
│
├── src/                                # FRONTEND UI LAYER (React 19 + TypeScript + Vite)
│   ├── main.tsx                        # Entrypoint React
│   ├── App.tsx                         # Router tampilan, layout wrapper, & global hotkey handler
│   ├── index.css                       # Desain sistem Tailwind CSS v4 & glassmorphism variables
│   ├── vite-env.d.ts                   # Deklarasi tipe Vite
│   │
│   ├── assets/                         # Asset statis, logo vektor, font
│   │
│   ├── components/                     # Komponen UI Reusable
│   │   ├── icons/                      # Authentic Brand SVG Icons (Docker, Rust, Node, dll.)
│   │   ├── layout/                     # Header, Sidebar navigasi, MainLayout
│   │   └── ui/                         # Atomic UI: Button, Card, Checkbox, Gauge, Modal
│   │       ├── AboutModal.tsx          # Dialog Tentang Aplikasi & detail lisensi
│   │       ├── Breadcrumb.tsx          # Navigasi path folder pada visualizer
│   │       ├── Checkbox.tsx            # Custom styled checkbox yang aksesibel
│   │       ├── CommandPalette.tsx      # Global Spotlight Search (`Cmd+K`)
│   │       ├── ConfirmModal.tsx        # Dialog konfirmasi aksi destruktif dengan whitelist warning
│   │       ├── HealthGauge.tsx         # Gauge Mac Hygiene Score (0-100%)
│   │       ├── LanguageSwitcher.tsx    # Pengubah bahasa instan (5 bahasa)
│   │       ├── ProgressBar.tsx         # Indikator kemajuan linier
│   │       ├── QuitOverlay.tsx         # Radial HUD "Hold Cmd+Q to Quit"
│   │       ├── StorageBar.tsx          # Visualisasi proporsi penggunaan disk
│   │       ├── Toast.tsx               # Notifikasi toast mengambang
│   │       └── WelcomeModal.tsx        # Dialog panduan pertama kali membuka aplikasi
│   │
│   ├── lib/                            # Abstraksi IPC Tauri & utilitas frontend
│   │   ├── audio.ts                    # Audio Web API untuk haptic chime & suara trash
│   │   ├── commands.ts                 # Wrapper fungsi TypeScript bertipe untuk IPC Tauri
│   │   ├── formatters.ts               # Formatting bytes, tanggal, durasi
│   │   └── types.ts                    # Definisi antarmuka TypeScript untuk payload backend
│   │
│   ├── locales/                        # Berkas lokalisasi multi-bahasa
│   │   ├── en.json                     # English
│   │   ├── id.json                     # Bahasa Indonesia
│   │   ├── ja.json                     # Japanese (日本語)
│   │   ├── zh.json                     # Simplified Chinese (简体中文)
│   │   └── es.json                     # Spanish (Español)
│   │
│   ├── store/                          # State Management Reaktif
│   │   └── appStore.ts                 # Zustand store untuk scanning, preferensi tema, & metrik
│   │
│   └── views/                          # Halaman / Tampilan Utama Modul
│       ├── AppUninstaller.tsx          # Uninstaller aplikasi & pembersih sisa berkas
│       ├── Dashboard.tsx               # Dasbor hardware, metrik disk, & Mac Hygiene Score
│       ├── DevWorkspace.tsx            # Pembersih artefak developer & Homebrew pruner
│       ├── DiskVisualizer.tsx          # Visualisasi treemap ruang disk interaktif
│       ├── FileShredder.tsx            # Penghancur berkas permanen multi-pass
│       ├── GitSweeper.tsx              # Pembersih repositori git lokal
│       ├── LargeAndDuplicates.tsx      # Pencari berkas raksasa & duplikat SHA-256
│       ├── QuickReview.tsx             # Triase cepat berkas Downloads/Desktop berbasis keyboard
│       ├── Settings.tsx                # Pengaturan aplikasi, tema, bahasa, & skala UI
│       ├── StartupManager.tsx          # Manajer startup LaunchAgents macOS
│       ├── SystemClean.tsx             # Pembersih cache sistem, log, & browser
│       ├── TidyUp.tsx                  # Pengatur berkas & aturan otomasi pintar
│       └── TrashManager.tsx            # Pengelola & pemeriksa native macOS Trash
│
├── scripts/                            # Script otomasi build & packaging
│   ├── build-dmg.sh                    # Generator DMG installer kustom dengan background & symlink
│   └── release.sh                      # Script orkestrator release
│
├── CHANGELOG.md                        # Catatan rilis per versi
├── LICENSE                             # Lisensi GNU General Public License v3.0
├── README.md                           # Dokumentasi utama proyek
├── package.json                        # Konfigurasi dependensi JavaScript & npm scripts
├── tsconfig.json                       # Konfigurasi TypeScript
├── vite.config.ts                      # Konfigurasi bundler Vite
└── tailwind.config.js                  # Konfigurasi tema Tailwind CSS
```

---

## Pemetaan Modul Frontend ke Backend

| Tampilan UI (`src/views/`) | Command Backend Rust (`src-tauri/src/commands/`) | Target Subsystem macOS |
| :--- | :--- | :--- |
| `Dashboard.tsx` | `scanner.rs`, `memory.rs` | `libc::statvfs`, `sysinfo`, `vm_stat` |
| `SystemClean.tsx` | `cleaner.rs`, `browser.rs` | `~/Library/Caches`, `~/Library/Logs`, Browser Profiles |
| `AppUninstaller.tsx` | `uninstaller.rs`, `orphaned.rs` | `/Applications`, `~/Applications`, `~/Library/Containers` |
| `DevWorkspace.tsx` | `scanner.rs`, `maintenance.rs` | Package managers, `node_modules`, `/opt/homebrew` |
| `TidyUp.tsx` | `organizer.rs`, `smart_rules.rs` | `~/Downloads`, `~/Desktop`, `~/Pictures` |
| `QuickReview.tsx` | `reviewer.rs`, `organizer.rs` | File preview & triage via QuickLook & Finder |
| `DiskVisualizer.tsx` | `visualizer.rs` | Direktori lokal APFS |
| `LargeAndDuplicates.tsx`| `finder.rs` | SHA-256 deduplication engine |
| `FileShredder.tsx` | `shredder.rs` | Direct sync file overwrite via CSPRNG |
| `TrashManager.tsx` | `trash.rs` | Native `~/.Trash` & volume trashes |
| `StartupManager.tsx` | `startup.rs` | `~/Library/LaunchAgents`, `/Library/LaunchAgents` |
| `GitSweeper.tsx` | `git_sweeper.rs` | Local `.git` packfiles & branches |