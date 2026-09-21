# Panduan Penggunaan Beberes (GUI & CLI Manual) 📖

Dokumen ini berisi panduan lengkap penggunaan aplikasi **Beberes** versi **1.4.0 (Codename: Chandra)**, baik melalui Graphical User Interface (GUI) maupun antarmuka baris perintah (Terminal CLI).

---

## Daftar Isi
1. [Pengenalan & Izin Sistem (Full Disk Access)](#1-pengenalan--izin-sistem-full-disk-access)
2. [Panduan Penggunaan Antarmuka Grafis (GUI)](#2-panduan-penggunaan-antarmuka-grafis-gui)
   - [Pintasan Keyboard (Shortcuts)](#pintasan-keyboard-shortcuts)
   - [Modul 1: Dashboard & Ringkasan Sistem](#modul-1-dashboard--ringkasan-sistem)
   - [Modul 2: Hardware & Battery Intelligence](#modul-2-hardware--battery-intelligence)
   - [Modul 3: System Clean & Browser Cache](#modul-3-system-clean--browser-cache)
   - [Modul 4: App Uninstaller & Residuals](#modul-4-app-uninstaller--residuals)
   - [Modul 5: Trash Manager & Auto-Prune](#modul-5-trash-manager--auto-prune)
   - [Modul 6: Tidy Up (Downloads & Desktop)](#modul-6-tidy-up-downloads--desktop)
   - [Modul 7: Large & Duplicate Files](#modul-7-large--duplicate-files)
   - [Modul 8: Quick Review Triage](#modul-8-quick-review-triage)
   - [Modul 9: Disk Space Visualizer](#modul-9-disk-space-visualizer)
   - [Modul 10: Developer Workspace (Hibernation & Zombie Ports)](#modul-10-developer-workspace)
   - [Modul 11: Git Repository Sweeper](#modul-11-git-repository-sweeper)
   - [Modul 12: Browser Extensions & macOS Plugins](#modul-12-browser-extensions--macos-plugins)
   - [Modul 13: Similar Photos & Burst Shots](#modul-13-similar-photos--burst-shots)
   - [Menu Bar Status Tray & Dropzone](#menu-bar-status-tray--dropzone)
   - [Context Menu (Klik Kanan) & Quick Look](#context-menu-klik-kanan--quick-look)
   - [Pengaturan Tema & Error Boundary](#pengaturan-tema--error-boundary)
3. [Panduan Penggunaan Terminal (CLI)](#3-panduan-penggunaan-terminal-cli)
   - [Instalasi Symlink CLI](#instalasi-symlink-cli)
   - [Daftar Perintah CLI](#daftar-perintah-cli)
   - [Contoh Penggunaan & Otomasi Skrip](#contoh-penggunaan--otomasi-skrip)
4. [Pemecahan Masalah (Troubleshooting)](#4-pemecahan-masalah-troubleshooting)

---

## 1. Pengenalan & Izin Sistem (Full Disk Access)

macOS memiliki subsistem keamanan **TCC (Transparency, Consent, and Control)** yang melindungi folder pengguna (seperti `Downloads`, `Desktop`, `Trash`, dan direktori browser).

### Cara Mengaktifkan Full Disk Access Sekali Saja:
Agar Beberes dapat memindai dan membersihkan disk tanpa memunculkan pop-up izin berulang pada setiap halaman:
1. Buka **Settings (`⌘,`)** di Beberes, lalu klik tab **Folders & Security**.
2. Klik tombol **Open Privacy Settings**.
3. Di macOS System Settings (**Privacy & Security > Full Disk Access**), aktifkan sakelar untuk **Beberes**.
4. Selesai! Beberes kini memiliki izin master untuk memeriksa seluruh area yang diizinkan.

---

## 2. Panduan Penggunaan Antarmuka Grafis (GUI)

### Pintasan Keyboard (Shortcuts)
Navigasi Beberes didesain mengikuti standar ergonomi Apple:

| Tombol | Fungsi |
| :--- | :--- |
| `⌘ 1` | Buka halaman **Dashboard** |
| `⌘ 2` | Buka halaman **Hardware & Battery Intelligence** |
| `⌘ 3` | Buka halaman **System Clean** |
| `⌘ 4` | Buka halaman **App Uninstaller** |
| `⌘ 5` | Buka halaman **Trash Manager** |
| `⌘ 6` | Buka halaman **Tidy Up** |
| `⌘ 7` | Buka halaman **Large & Duplicate Files** |
| `⌘ 8` | Buka halaman **Quick Review** |
| `⌘ 9` | Buka halaman **Disk Space Visualizer** |
| `⌘ ,` | Buka **Settings & Preferences** |
| `⌘ K` | Buka **Spotlight Quick Search** |
| `⌘ R` | Lakukan pemindaian ulang menyeluruh (**Global Rescan**) |
| `Space` | Pratinjau file (**Quick Look**) pada item yang dipilih |
| `Escape` | Menutup modal, popover, atau context menu yang sedang terbuka |

---

### Modul 1: Dashboard & Ringkasan Sistem
- **Mac Hygiene Score (0–100%)**: Indikator kesehatan disk Mac Anda berdasarkan ukuran cache, file sampah, dan kapasitas sisa.
- **Smart Clean ("Bereskan Sekaligus")**: Tombol satu-klik untuk membersihkan seluruh area aman (cache sistem, log usang, dan membersihkan RAM yang tidak aktif).
- **RAM Memory Pressure**: Memantau penggunaan memori fisik dan swap secara *real-time*.

### Modul 2: Hardware & Battery Intelligence
- Menampilkan suhu baterai aktual (`°C`), siklus pengisian daya (*cycle count*), status pengisian cepat, dan kapasitas desain mAh pabrik vs kapasitas kesehatan saat ini.

### Modul 3: System Clean & Browser Cache
- Membersihkan cache aplikasi pengguna (`~/Library/Caches`), log diagnostik lama (`~/Library/Logs`), dan cache browser (Safari, Chrome, Brave, Arc, Edge, Firefox) tanpa menghapus sesi login atau cookie penting.

### Modul 4: App Uninstaller & Residuals
- Menghapus aplikasi secara tuntas, termasuk berkas pendukung tersembunyi (*residual data*) di `Application Support`, `Caches`, dan `Preferences` yang biasanya tertinggal saat Anda hanya menyeret file `.app` ke Trash.
- Dilengkapi perlindungan terhadap aplikasi bawaan Apple yang dilindungi sistem.

### Modul 5: Trash Manager & Auto-Prune
- Memeriksa isi Tempat Sampah Mac dan drive eksternal.
- **Auto-Prune (> 30 Hari)**: Mendeteksi file sampah yang sudah mengendap lebih dari sebulan dan menyediakan opsi pembersihan cepat dengan tombol **"Prune > 30d"**.

### Modul 6: Tidy Up (Downloads & Desktop)
- Merapikan folder Downloads dan Desktop yang berantakan dengan mengelompokkan file secara cerdas ke folder kategori (Documents, Images, Archives, Code, dll.).
- Mendeteksi sisa installer (`.dmg`, `.pkg`) yang sudah tidak dibutuhkan lagi.

### Modul 7: Large & Duplicate Files
- **Large Files**: Mengurutkan file berdasarkan ukuran terbesar untuk identifikasi cepat pemboros ruang disk.
- **Duplicate Files**: Menggunakan *content hashing* SHA-256 untuk mendeteksi file kembar identik meskipun namanya berbeda.

### Modul 8: Quick Review Triage
- Sarana inspeksi cepat berbasis keyboard: gunakan panah kiri/kanan untuk meninjau file satu per satu, ganti nama di tempat, simpan, atau buang ke Trash.

### Modul 9: Disk Space Visualizer
- Visualisasi peta penyimpanan interaktif (*treemap*). Klik kotak folder untuk masuk (*drill-down*), periksa alokasi persentase penyimpanan, dan gunakan rekam jejak (*breadcrumbs*) untuk navigasi kembali.

### Modul 10: Developer Workspace
Dirancang khusus untuk programmer dan rekayasawan perangkat lunak:
- **Build & Caches**: Membersihkan `node_modules`, Cargo `target/`, Xcode `DerivedData`, Flutter build, dan Docker VM.
- **Project Hibernate**: Memindai repositori proyek yang tidak pernah dibuka selama 30/90/180 hari dan membersihkan dependensinya untuk menghemat puluhan gigabyte.
- **Zombie Port Hunter**: Mendeteksi proses server lokal yang menyangkut di port (misal port 3000, 5000, 8080) dan menghentikannya secara instan.

### Modul 11: Git Repository Sweeper
- Mengompresi repositori git lokal dengan *aggressive garbage collection* (`git gc --prune=now`).
- Menghapus *branch* lokal yang sudah di-*merge* ke branch utama untuk menjaga repositori tetap ramping.

### Modul 12: Browser Extensions & macOS Plugins
- Mengaudit ekstensi yang terpasang di seluruh browser web utama lengkap dengan logo asli masing-masing ekstensi.
- Memeriksa QuickLook generator dan plugin sistem macOS lainnya.

### Modul 13: Similar Photos & Burst Shots
- Mengelompokkan foto yang diambil secara beruntun (*burst shot*) atau memiliki kemiripan visual tinggi secara lokal tanpa mengirim data ke cloud.

---

### Context Menu (Klik Kanan) & Quick Look
Pada tampilan **Disk Visualizer** dan **Large & Duplicate Files**, klik kanan pada baris mana saja untuk memunculkan menu konteks melayang:
- **Quick Look (`Space`)**: Membuka jendela pratinjau macOS native.
- **Reveal in Finder**: Menyorot file langsung di aplikasi Finder.
- **Copy Path (`⌥⌘C`)**: Menyalin jalur file lengkap ke papan klip.
- **Browse Directory Inside**: Masuk ke dalam direktori yang dipilih.

---

### Pengaturan Tema & Error Boundary
- **Primary Accent Color**: Pilih warna aksen favorit (Electric Purple, Apple Blue, Emerald Green, Sunset Amber, Rose Pink, Cyan, dll.).
- **Human-Friendly Error Boundary**: Jika terjadi kendala antarmuka, Beberes menampilkan layar penanganan error yang tenang dengan kode referensi terstruktur dan tombol 1-klik untuk melaporkan issue ke GitHub.
- **Simulator Crash Test**: Anda dapat menguji tampilan error boundary kapan saja melalui **Settings > System > Uji Tampilan Error (Crash Test)**.

---

## 3. Panduan Penggunaan Terminal (CLI)

Beberes dilengkapi alat terminal native berkecepatan tinggi (`beberes`) yang ditulis dalam bahasa Rust dengan startup di bawah **10 milidetik**.

### Instalasi Symlink CLI
Buka Beberes GUI, masuk ke **Settings > System**, dan klik **Install CLI**.  
Atau pasang tautan simbolik secara manual melalui terminal:
```bash
sudo ln -sf /Applications/Beberes.app/Contents/MacOS/beberes-app /usr/local/bin/beberes
```

Verifikasi instalasi dengan mengetik:
```bash
beberes --help
```

---

### Daftar Perintah CLI

#### 1. Memeriksa Status Sistem (`beberes status`)
Menampilkan ringkasan penggunaan disk penyimpanan, kapasitas memori RAM fisik, status baterai, dan jumlah item di Trash:
```bash
beberes status
```

#### 2. Audit Kesehatan & Izin (`beberes doctor`)
Memeriksa apakah izin Full Disk Access sudah aktif, mendeteksi snapshot lokal APFS yang memakan ruang tersembunyi, dan memeriksa *thermal throttling*:
```bash
beberes doctor
```

#### 3. Pembersihan Cache Sistem (`beberes clean --system`)
Membersihkan file cache aplikasi pengguna dan log diagnostik:
```bash
beberes clean --system
```

#### 4. Pembersihan Workspace Developer (`beberes clean --dev`)
Membersihkan cache build proyek yang dorman dan direktori dependensi:
```bash
beberes clean --dev
```

#### 5. Mengosongkan Trash (`beberes clean --trash`)
Mengosongkan isi Tempat Sampah macOS:
```bash
beberes clean --trash
```

#### 6. Pembersihan Menyeluruh (`beberes clean --all`)
Menjalankan pembersihan gabungan untuk sistem, developer cache, dan trash:
```bash
beberes clean --all
```

#### 7. Memangkas File Sampah Usang (`beberes prune-trash`)
Menghapus file di Trash yang berumur lebih dari 30 hari:
```bash
beberes prune-trash
```

#### 8. Meluncurkan Aplikasi Grafis (`beberes gui`)
Membuka jendela grafis Beberes langsung dari terminal:
```bash
beberes gui
```

---

### Contoh Penggunaan & Otomasi Skrip

Anda dapat menjadwalkan Beberes CLI agar berjalan secara otomatis setiap minggu menggunakan `crontab` macOS:

```bash
# Buka editor crontab
crontab -e

# Tambahkan baris berikut untuk membersihkan sisa sampah > 30 hari setiap hari Minggu jam 09:00 pagi
0 9 * * 0 /usr/local/bin/beberes prune-trash >/dev/null 2>&1
```

---

## 4. Pemecahan Masalah (Troubleshooting)

### Kendala: "Beberes is damaged and can't be opened"
Hal ini terjadi karena aplikasi open-source belum ditandatangani dengan sertifikat berbayar Apple ($99/tahun).
**Solusi Cepat:** Buka Terminal dan jalankan:
```bash
xattr -cr /Applications/Beberes.app
```

### Kendala: Pop-up Izin Terus Muncul
Pastikan aplikasi telah terpasang di folder `/Applications/Beberes.app` dan telah diberikan izin **Full Disk Access** pada **System Settings > Privacy & Security > Full Disk Access**.
