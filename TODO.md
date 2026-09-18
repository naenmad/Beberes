# Beberes Development Roadmap & TODO

Daftar rencana pematangan repositori, presentasi visual kelas dunia, dan infrastruktur distribusi open-source.

---

## 1. Visual Showcase & Tangkapan Layar (Screenshots & Mockups)
- [x] **Tangkapan Layar & Frame Mockup Antarmuka macOS**
  - Membuat direktori `docs/screenshots/` untuk menyimpan aset tampilan UI beresolusi tinggi.
  - Menyiapkan screenshot showcase untuk modul-modul unggulan:
    - `dashboard-hero.png`: *Storage & System Overview Dashboard* (dengan status kapasitas, ring meter, dan milestone bar).
    - `developer-workspace.png`: *Developer Workspace Clean* (pembersihan Cargo target, Docker VMs, node_modules).
    - `confirm-cleanup.png`: *Smart Safety Whitelist* (dialog konfirmasi interaktif perlindungan direktori sistem).
  - Menyematkan galeri visual di `README.md` dengan tata letak rapi, modern, dan informatif.

---

## 2. Dukungan Komunitas & Donasi (GitHub Sponsors & Funding)
- [x] **Konfigurasi Resmi GitHub Funding (`.github/FUNDING.yml`)**
  - Mengaktifkan tombol pink native "Sponsor this project" di header repositori GitHub.
  - Mengonfigurasi platform donasi:
    - GitHub Sponsors: `naenmad`
    - Trakteer: `https://trakteer.id/naenmad`
    - Ko-fi: `https://ko-fi.com/naenmad`
- [x] **Seksi Sponsor di `README.md`**
  - Menambahkan bagian *"Support & Sponsoring"* di bagian bawah README dengan tombol dan link donasi yang elegan.

---

## 3. Kebijakan Keamanan & Kepatuhan Open Source (Security Policy)
- [x] **Dokumen `SECURITY.md`**
  - Menjelaskan kebijakan pelaporan celah keamanan secara bertanggung jawab (*responsible disclosure*).
  - Menegaskan prinsip privasi Beberes (100% lokal, zero telemetri, tanpa koneksi cloud).
  - Panduan bagi peneliti keamanan untuk melaporkan temuan melalui GitHub Private Vulnerability Reporting.

---

## 4. Rencana Distribusi Paket (Homebrew Cask Tap)
- [x] **Panduan & Formula Homebrew Cask**
  - Menambahkan instruksi instalasi via `brew tap naenmad/beberes && brew install --cask beberes` di `README.md`.
  - Menyiapkan spesifikasi Cask ruby template di `docs/Cask/beberes.rb` untuk repository `homebrew-beberes`.

---

## 5. Metadata Repositori & Badge Polish
- [x] **Penyempurnaan Header & Lencana GitHub**
  - Menambahkan lencana status GitHub Sponsors pink, Latest Release, License GPL-3.0, Tauri v2, Rust 2021, macOS (Apple Silicon & Intel), dan 100% Local First.
  - Menyusun navigasi daftar isi README yang lengkap.
