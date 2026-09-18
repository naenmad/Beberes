# Beberes Development Roadmap & TODO

Daftar rencana fitur, peningkatan arsitektur sistem, dan penyempurnaan UI/UX untuk rilis mendatang.

---

## 1. Prioritas Utama (Immediate UX Polish)

- [ ] **Hold Cmd+Q to Quit**
  - Mencegah penutupan aplikasi yang tidak disengaja saat proses pembersihan atau pemindaian berjalan.
  - Menampilkan HUD melayang di tengah layar dengan indikator melingkar (radial progress) selama 1,2 detik.
  - Membatalkan keluar jika tombol dilepas sebelum waktu habis; keluar secara aman (*graceful exit*) jika ditahan hingga penuh.
  - Menyediakan sakelar toggle konfigurasi di Settings (Umum).

- [ ] **macOS Standard Window Behavior: Close to Hide**
  - Mengikuti standar macOS Human Interface Guidelines (HIG).
  - Mengklik tombol merah (x) pada jendela utama hanya menyembunyikan window (`window.hide()`), bukan menghentikan proses aplikasi.
  - Mengklik ikon di Dock akan menampilkan kembali jendela secara instan tanpa harus restart.

---

## 2. Integrasi Sistem macOS & Backend Rust

- [ ] **Menu Bar / Status Tray Menu**
  - Ikon status bar Beberes di Menu Bar atas macOS.
  - Popover ringkas yang menampilkan persentase penggunaan disk dan status memori.
  - Aksi cepat: Tombol *Quick Smart Clean*, pintasan buka jendela utama, dan keluar dari aplikasi.

- [ ] **Peringatan Ambang Batas Disk Rendah (Low Disk Space Alert)**
  - Pemeriksaan berkala di latar belakang untuk memantau kapasitas penyimpanan sistem.
  - Mengirim notifikasi native macOS jika ruang kosong tersisa di bawah 10% atau 15 GB.

- [ ] **Thermal & Battery Throttling Awareness**
  - Deteksi status baterai dan mode hemat daya (*Low Power Mode*) di macOS.
  - Menyesuaikan thread pool Rayon secara dinamis agar pemindaian tidak menyebabkan panas berlebih dan tidak menguras daya saat menggunakan baterai di bawah 20%.

---

## 3. Fitur Kenyamanan & Polish Antarmuka

- [ ] **Audio Haptic Feedback (Sound Effects Khas macOS)**
  - Efek suara halus saat pembersihan berhasil diselesaikan (*trash empty / clean whoosh*).
  - Efek nada konfirmasi ringan saat pemindaian sistem selesai.
  - Opsi pengaturan untuk mematikan suara (*Mute sound effects*) di Settings.

- [ ] **Peringatan Keamanan Berkas Kritis (Smart Safety Warning)**
  - Memberikan indikator peringatan khusus jika ada berkas di atas 5 GB atau berkas yang baru saja dimodifikasi dalam kurun waktu 24 jam terakhir.

- [ ] **Statistik Dampak Kumulatif (Impact Stats & Milestones)**
  - Pelacakan total gigabyte yang berhasil dikosongkan sejak aplikasi pertama kali dipasang.
  - Jumlah berkas residual dan cache yang berhasil dibersihkan.
