# System Architecture & Tech Stack

## 1. High-Level Overview

Aplikasi **Beberes** menggunakan arsitektur **Decoupled Hybrid Desktop** yang memisahkan antarmuka pengguna (Frontend berbasis Webview modern) dan logika pemrosesan sistem berkinerja tinggi (Backend native Rust), dijembatani oleh mekanisme IPC asinkron bawaan Tauri v2.

```mermaid
graph TD
    subgraph Client["Frontend UI Layer (React 19 + TypeScript + Tailwind CSS v4)"]
        UI_Dash[Dasbor & Mac Hygiene Score]
        UI_Clean[Bersih Sistem & Browser Caches]
        UI_Orphan[Aplikasi & Sisa Berkas Ditinggalkan]
        UI_Dev[Ruang Kerja Dev & Homebrew Pruner]
        UI_Tidy[Tidy Up & Aturan Otomasi Pintar]
        UI_Store[(Zustand Central Reactive Store)]
        
        UI_Dash --> UI_Store
        UI_Clean --> UI_Store
        UI_Orphan --> UI_Store
        UI_Dev --> UI_Store
        UI_Tidy --> UI_Store
    end

    subgraph Bridge["Tauri v2 IPC Message Passing"]
        UI_Store <==>|Asynchronous invoke / emit| IPC_Handlers[Tauri Command Handlers]
    end

    subgraph Core["Backend Core (Native Rust Engine)"]
        IPC_Handlers --> Mod_Scanner[Parallel Rayon Scanner]
        IPC_Handlers --> Mod_Safety[Apple Protected Whitelist Guard]
        IPC_Handlers --> Mod_Kernel[macOS Kernel Memory & APFS Manager]
        IPC_Handlers --> Mod_CLI[Homebrew & Developer CLI Orchestrator]
        IPC_Handlers --> Mod_POSIX[POSIX statvfs Volume Metrics]
        IPC_Handlers --> Mod_Trash[Native macOS Trash & File Shredder]
    end

    subgraph OS["macOS Operating System Layer"]
        Mod_Scanner --> OS_FS["APFS File System"]
        Mod_Kernel --> OS_VM["vm_stat / purge & tmutil Snapshots"]
        Mod_CLI --> OS_Brew["/opt/homebrew & Global Package Stores"]
        Mod_Trash --> OS_Trash["~/.Trash & Storage Volumes"]
    end
```

---

## 2. Core Tech Stack (High Performance & Zero Overhead)

| Komponen | Teknologi | Peran & Keunggulan |
| :--- | :--- | :--- |
| **Desktop Shell** | Tauri v2 | Footprint memori sangat kecil (~30-40 MB RAM), zero Chromium overhead, native macOS webview. |
| **Backend Engine** | Rust 2021 | Kecepatan setara C/C++, memori aman tanpa Garbage Collector, multi-threading Rayon paralel. |
| **Frontend UI** | React 19 + TypeScript | UI deklaratif reaktif, type-safe, performa render optimal dengan view caching. |
| **Styling & Theme** | Tailwind CSS v4 | macOS frosted glassmorphism, responsive, dark/light mode, reduced-motion & high-contrast. |
| **State Store** | Zustand v5 | Centralized reactive store tanpa re-render churn yang tidak perlu. |
| **Iconography** | Lucide React + Authentic Brand SVGs | Vektor tajam resolusi tinggi untuk Retina display macOS. |

---

## 3. Komunikasi Antar Layer & Alur Kerja

```mermaid
sequenceDiagram
    autonumber
    participant UI as React Frontend
    participant IPC as Tauri IPC Bridge
    participant Rust as Rust Engine
    participant Guard as Safety Whitelist
    participant Mac as macOS APIs / Subsystem

    UI->>IPC: invoke('scan_system_directories')
    IPC->>Rust: Eksekusi command handler
    Rust->>Mac: Parallel directory traversal via Rayon
    Rust->>Guard: Validasi path != Apple Protected
    Guard-->>Rust: Whitelist OK
    Rust-->>IPC: Return ScanCategory[] payload
    IPC-->>UI: Update Zustand state & render UI

    Note over UI,Mac: Eksekusi Pembersihan Aman
    UI->>IPC: invoke('clean_selected_items', { paths, useTrash: true })
    IPC->>Rust: Eksekusi pembersihan
    Rust->>Mac: Pindahkan berkas ke ~/.Trash (bisa di-putback)
    Rust-->>IPC: Return CleanResult (freedBytes, cleanedCount)
    IPC-->>UI: Trigger Chime Haptic & Update Lifetime Rescued Storage
```

---

## 4. Rust Crate Dependencies Utama

- **`tokio`**: Runtime asynchronous untuk I/O non-blocking dan event loop.
- **`rayon`**: Work-stealing data-parallelism untuk memindai direktori raksasa secara multithreaded.
- **`serde` & `serde_json`**: Serialisasi payload IPC berkinerja tinggi antara Rust dan TypeScript.
- **`sysinfo`**: Mengambil metrik CPU, pemakaian RAM fisik, dan statistik volume disk secara real-time.
- **`dirs`**: Deteksi jalur direktori standar platform macOS (`~/Library`, `~/Downloads`, dll.).
- **`trash`**: Integrasi resmi ke recycle bin / Trash macOS dengan kemampuan restore.

---

## 5. Diagram Lengkap & Alur Kerja

Untuk melihat seluruh diagram Mermaid (State Machine, Whitelist Guardrail, Orphaned App Detection Logic, Smart Rules Pipeline, dan Tabel Referensi Komprehensif), buka [docs/MERMAID.md](MERMAID.md).
