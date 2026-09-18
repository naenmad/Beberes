# Project Directory Structure

Struktur folder ini dirancang untuk memisahkan secara tegas antara lingkungan *frontend* (Web/React) dan *backend* (Rust/Tauri) agar pengembangan lebih fokus.

\`\`\`text
beberes/
├── docs/                        # Dokumentasi Proyek (PRD, UI/UX, dll)
│   ├── PRD.md
│   ├── UI_UX.md
│   ├── ARCHITECTURE.md
│   └── STRUCTURE.md
│
├── src-tauri/                   # BACKEND (Rust / Tauri Core)
│   ├── src/
│   │   ├── commands/            # Logika spesifik yang dipanggil dari UI
│   │   │   ├── scanner.rs       # Fungsi pemindaian sistem
│   │   └── cleaner.rs       # Fungsi penghapusan file
│   │   ├── utils/               # Fungsi bantuan (formatting size, dll)
│   │   ├── main.rs              # Entry point Rust & Registrasi command
│   │   └── state.rs             # Manajemen state di sisi backend (jika ada)
│   ├── Cargo.toml               # Dependensi Rust
│   └── tauri.conf.json          # Konfigurasi jendela & build Tauri
│
├── src/                         # FRONTEND (React / Vite)
│   ├── assets/                  # CSS global, font, logo statis
│   ├── components/              # Komponen UI Reusable
│   │   ├── layout/              # Sidebar, Header, MainLayout
│   │   └── ui/                  # Button, Card, Checkbox (Tailwind based)
│   ├── store/                   # Zustand store files
│   │   └── appStore.ts          # State global untuk UI (scan status, dll)
│   ├── views/                   # Halaman / Tampilan utama
│   │   ├── Dashboard.tsx
│   │   └── DevWorkspace.tsx
│   ├── App.tsx                  # Root router / layout wrapper
│   └── main.tsx                 # Entry point React
│
├── tailwind.config.js           # Konfigurasi gaya Tailwind
├── vite.config.ts               # Konfigurasi bundler Vite
├── package.json                 # Dependensi NPM/Frontend
└── tsconfig.json                # Konfigurasi TypeScript
\`\`\`