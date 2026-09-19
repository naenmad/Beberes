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

---

## 6. Roadmap Fitur Unggulan Versi 1.3.0

- [ ] **Menu Bar Popover Widget (Mini Beberes di Status Bar macOS)**
  - Mengembangkan popover interaktif saat ikon Beberes di Menu Bar atas diklik tanpa perlu membuka jendela utama.
  - Menampilkan ringkasan meter beban kerja secara real-time: pemakaian RAM, CPU, dan sisa kapasitas SSD.
  - Tombol aksi instan: 1-Click Purge Memory, Quick Trash Empty, dan skor kesehatan sistem (*Mac Hygiene Score*).

- [ ] **Scheduled Background Cleaning (Pembersihan Otomatis Terjadwal via LaunchAgent)**
  - Otomasi pembersihan di latar belakang berbasis interval waktu (Harian, Mingguan, atau Bulanan).
  - Pilihan aturan cerdas:
    - Pengosongan tempat sampah otomatis (*Auto-empty Trash*) untuk berkas yang telah melewati 30 hari.
    - Pembersihan otomatis cache developer (seperti Xcode DerivedData) jika ukuran direktori melebihi ambang batas (misal > 20 GB).
    - Notifikasi macOS asli setelah jadwal pembersihan selesai dengan rincian kapasitas yang berhasil dihemat.

- [ ] **Mac Battery & Hardware Intelligence (Kesehatan Baterai & Suhu Hardware)**
  - Integrasi IOKit dan Apple Silicon SMC untuk membaca kondisi perangkat keras secara mendalam.
  - Indikator kesehatan baterai asli (*Maximum Capacity %*) dan penghitung siklus pengisian daya (*Battery Cycle Count*).
  - Pemantau suhu prosesor dan sensor termal (*Thermal State: Normal, Fair, Serious*) beserta deteksi *thermal throttling*.
  - Deteksi dan rekomendasi aplikasi rakus daya (*Energy Hog Hunter*) yang membebani baterai di latar belakang.

- [ ] **Similar / Burst Photo & Media Hunter (Deteksi Foto & Tangkapan Layar Mirip)**
  - Implementasi algoritma *perceptual hashing* (pHash) untuk mendeteksi berkas gambar yang serupa namun tidak identik byte-per-byte.
  - Identifikasi foto jepretan beruntun (*burst shots*), duplikasi resolusi berbeda, dan akumulasi screenshot bertubi-tubi di folder Pictures dan Downloads.
  - Tampilan pratinjau berdampingan (*side-by-side comparison*) dengan rekomendasi otomatis untuk menyimpan versi resolusi tertinggi dan membuang salinannya.

- [ ] **Browser Extensions & macOS Plugin Manager**
  - Pemindaian dan manajemen terpusat untuk ekstensi peramban (Safari, Google Chrome, Brave, Arc, dan Firefox).
  - Pemeriksaan dan pembersihan plugin sistem macOS yang sering terlupakan: QuickLook Plugins (`/Library/QuickLook`), Spotlight Importers, dan Audio Units/VST (`/Library/Audio/Plug-Ins`).

- [ ] **Exportable System Health & Cleaning Report (Ekspor PDF & Markdown)**
  - Kemampuan membuat dan mengunduh laporan komprehensif kondisi kesehatan Mac dalam format PDF atau Markdown dengan 1-klik.
  - Memuat riwayat total kapasitas yang berhasil dibersihkan (*All-Time Cleaned*), daftar aplikasi pemakan memori terbesar, konfigurasi perangkat, dan saran perawatan berkala.

