# Product Requirement Document (PRD)

**Proyek:** Beberes (High-Performance System Cleaner)
**Status:** Draft / Perencanaan Awal
**Platform:** macOS (Primary - Universal Binary), Windows/Linux (Secondary)

## 1. Executive Summary

Beberes adalah utilitas sistem desktop yang dirancang khusus untuk membebaskan ruang penyimpanan (_storage_) dengan cara membersihkan file sampah, _cache_ aplikasi, dan sisa-sisa direktori pengembangan (development caches). Aplikasi ini dibangun dengan prinsip _zero-bloatware_, memanfaatkan kekuatan Rust dan Tauri untuk performa maksimal dengan penggunaan RAM seminimal mungkin.

## 2. Target Pengguna

- **Pengguna Umum (Mac Users):** Membutuhkan cara cepat dan aman untuk membersihkan _system cache_, _trash_, dan file log yang memakan ruang SSD.
- **Software Developers / Engineers:** Membutuhkan alat otomatis untuk menghapus `node_modules` lama, _build cache_ (Cargo, Gradle, Maven), dan _dangling volumes/images_ dari OrbStack atau Docker.

## 3. Fitur Utama (Core Features)

### A. Smart System Scan

- Pemindaian 1-klik untuk area umum: System Cache, User Logs, Browser Cache, dan Trash Bin.
- Estimasi _real-time_ ukuran file yang bisa dibersihkan.

### B. Developer Cache Cleaner (Niche Feature)

- **Node/JS:** Deteksi folder `node_modules` di proyek yang tidak aktif selama > 3 bulan.
- **Rust/Cargo:** Pembersihan `~/.cargo/registry` dan folder `target/` yang sudah usang.
- **Containers:** Deteksi volume dan _image_ OrbStack/Docker yang _dangling_ (tidak terpakai).

### C. Deep Clean & Custom Path

- Pengguna dapat menambahkan direktori kustom (misal: folder _Downloads_ atau _Video Projects_) untuk dianalisis file terbesarnya.

### D. Safe Delete Mechanism

- _Whitelist_ otomatis untuk mencegah penghapusan file krusial macOS (seperti `/System` atau `/Library/CoreServices`).
- Sistem konfirmasi sebelum melakukan penghapusan permanen.

## 4. Metrik Keberhasilan (Success Metrics)

- **Performa Memori:** Aplikasi dalam keadaan _idle_ memakan RAM < 50 MB.
- **Kecepatan:** Waktu _scan_ untuk 100 GB direktori < 5 detik menggunakan _Rust multithreading_.
- **Ukuran App:** Ukuran _binary/bundle_ akhir (DMG/App) < 15 MB.
