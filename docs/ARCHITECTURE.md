# System Architecture & Tech Stack

## 1. High-Level Overview

Aplikasi Beberes menggunakan arsitektur **Hybrid Desktop** dengan memisahkan antarmuka pengguna (Frontend) dan logika pemrosesan sistem (Backend), dijembatani oleh Tauri IPC.

## 2. Core Tech Stack (Full Performa)

- **Desktop Shell:** Tauri v2
- **Backend (System Operations):** Rust
- **Frontend (UI Layer):** React (Vite) + TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Icons:** Lucide React

## 3. Komunikasi Antar Layer (Tauri IPC)

Sistem menggunakan _Asynchronous Message Passing_ melalui mekanisme IPC bawaan Tauri.

**Alur Kerja Contoh (Proses Scan):**

1. **[Frontend - React]** Pengguna menekan tombol "Scan". Zustand mengupdate _state_ `isScanning = true`.
2. **[Bridge - IPC]** React memanggil fungsi Tauri: `invoke('scan_system_directories')`.
3. **[Backend - Rust]** Fungsi `scan_system_directories` dieksekusi. Rust menggunakan _crate_ `ignore` atau `walkdir` dengan `rayon` (multithreading) untuk memindai ribuan file secara paralel tanpa memblokir _main thread_.
4. **[Bridge - IPC]** Rust memancarkan (_emit_) _event progress_ secara berkala atau mengembalikan _payload_ JSON berisi hasil _scan_.
5. **[Frontend - React]** React menerima _payload_, memperbarui UI, dan mengubah state `isScanning = false`.

## 4. Rust Crate Dependencies (Backend)

Beberapa library Rust (Crate) yang akan digunakan:

- `tokio`: Async runtime untuk mengelola I/O tanpa _blocking_.
- `rayon`: Data-parallelism library untuk menghitung ukuran folder besar secara simultan.
- `serde` & `serde_json`: Untuk serialisasi/deserialisasi data saat komunikasi dengan Frontend.
- `sysinfo`: Untuk mendapatkan informasi _real-time_ tentang kapasitas disk mac/PC.
