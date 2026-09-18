# Beberes Completed Milestones & Changelog (DONE)

Daftar fitur, peningkatan arsitektur sistem, dan penyempurnaan UI/UX yang telah selesai diimplementasikan secara penuh.

---

## 1. Prioritas Utama (Immediate UX Polish)

- [x] **Hold Cmd+Q to Quit**
  - Mencegah penutupan aplikasi yang tidak disengaja saat proses pembersihan atau pemindaian berjalan.
  - Menampilkan HUD melayang di tengah layar dengan indikator melingkar (*radial progress*) selama 1,2 detik.
  - Membatalkan keluar jika tombol dilepas sebelum waktu habis; keluar secara aman (*graceful exit*) jika ditahan hingga penuh.
  - Menyediakan sakelar toggle konfigurasi di Settings (Umum).

- [x] **macOS Standard Window Behavior: Close to Hide**
  - Mengikuti standar macOS Human Interface Guidelines (HIG).
  - Mengklik tombol merah (x) pada jendela utama hanya menyembunyikan window (`window.hide()`), bukan menghentikan proses aplikasi.
  - Mengklik ikon di Dock akan menampilkan kembali jendela secara instan tanpa harus restart.

---

## 2. Integrasi Sistem macOS & Backend Rust

- [x] **Menu Bar / Status Tray Menu**
  - Ikon status bar Beberes di Menu Bar atas macOS.
  - Menu kontekstual status tray native macOS.
  - Aksi cepat: Tombol *Quick Smart Clean*, pintasan buka jendela utama, dan keluar dari aplikasi.

- [x] **Peringatan Ambang Batas Disk Rendah (Low Disk Space Alert)**
  - Pemeriksaan berkala di latar belakang untuk memantau kapasitas penyimpanan sistem.
  - Banner peringatan proaktif jika ruang kosong tersisa di bawah 10% atau 15 GB.
  - Sakelar toggle konfigurasi di Settings.

- [x] **Thermal & Battery Throttling Awareness**
  - Deteksi status baterai dan mode hemat daya (*Low Power Mode*) di macOS melalui perintah `pmset`.
  - Menyesuaikan thread pool Rayon secara dinamis agar pemindaian tidak menyebabkan panas berlebih dan tidak menguras daya saat menggunakan baterai di bawah 20%.
  - Indikator status daya dan pembatasan beban kerja pada TopBar.

---

## 3. Fitur Kenyamanan & Polish Antarmuka

- [x] **Audio Haptic Feedback (Sound Effects Khas macOS)**
  - Efek suara sintetis Web Audio API saat pembersihan berhasil diselesaikan (*trash empty / clean whoosh*).
  - Efek nada konfirmasi ringan saat pemindaian dan pembersihan sistem selesai.
  - Opsi pengaturan untuk mematikan suara (*Mute sound effects*) di Settings.

- [x] **Peringatan Keamanan Berkas Kritis (Smart Safety Warning)**
  - Memberikan indikator peringatan khusus jika ada berkas di atas 5 GB atau berkas yang baru saja dimodifikasi dalam kurun waktu 24 jam terakhir.
  - Dialog konfirmasi tambahan sebelum menghapus berkas kritis di Large & Duplicates dan Quick Review.

- [x] **Statistik Dampak Kumulatif (Impact Stats & Milestones)**
  - Pelacakan total gigabyte yang berhasil dikosongkan sejak aplikasi pertama kali dipasang.
  - Jumlah siklus pembersihan dan total berkas yang berhasil diproses pada Dashboard dan Settings.

---

## 4. Distribusi & Installer Experience (macOS Native Standard)

- [x] **Zero-Asset Lightweight DMG Packaging & Retina Background**
  - Jendela Finder DMG dengan background Retina HiDPI elegan, panah penunjuk gradient ber-glow, dan badge instalasi simetris.
  - Kanvas *dark bleed* (1600x1000) yang menyatu sempurna agar tidak ada warna putih saat jendela di-resize.
  - Ukuran installer DMG tetap super ringkas (~3.7 MB kompresi UDZO HFS+).
- [x] **In-App Responsive "Move to Applications" Flow**
  - Deteksi otomatis saat aplikasi dijalankan di luar `/Applications` (misal dari DMG yang di-mount atau folder Downloads).
  - Dialog interaktif responsif berbasis web & glassmorphism yang menjelaskan keuntungan memindahkan aplikasi (auto-update, izin keamanan, Spotlight).
  - Aksi 1-klik untuk menyalin secara aman dengan `/usr/bin/ditto`, meluncurkan aplikasi dari `/Applications`, dan menutup proses lama.

---

## 5. Ekspansi Multi-Techstack Developer Workspace

- [x] **Dukungan Penuh 12 Ekosistem Developer**
  - **Flutter & Dart**: Pemindaian `~/.pub-cache`, direktori `.dart_tool/`, dan folder `build/` pada proyek ber-`pubspec.yaml`.
  - **Go (Golang)**: Pemindaian module cache `~/go/pkg/mod/cache` dan build cache kompilasi `~/Library/Caches/go-build`.
  - **Java / JVM (Maven)**: Pemindaian cache lokal artefak maven di `~/.m2/repository`.
  - **PHP / Composer**: Pemindaian `~/.composer/cache` dan direktori `vendor/` pada proyek ber-`composer.json` yang tidak disentuh > 90 hari.
  - **AI & Local LLM Models**: Pemindaian bobot model di `~/.cache/huggingface/hub`, blob model lokal di `~/.ollama/models`, PyTorch checkpoints di `~/.cache/torch`, dan cache `transformers`.
  - **Ruby & Bundler**: Pemindaian `~/.bundle/cache` dan direktori spesifikasi `~/.gem`.
  - **.NET / C#**: Pemindaian paket global di `~/.nuget/packages`.
  - **C / C++ & CMake**: Pemindaian index cache `~/.cache/clangd` dan direktori build `cmake-build-debug/`, `cmake-build-release/`, serta `build/` pada proyek ber-`CMakeLists.txt`.
  - **Optimasi Algoritma Single-Pass Traversal**: Penelusuran pohon direktori proyek yang disatukan dan diparalelkan dengan Rayon untuk performa sub-detik tanpa membebani disk I/O.

