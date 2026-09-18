# Beberes Design System & UI/UX Guidelines

Dokumen ini adalah acuan resmi standarisasi desain visual, hierarki antarmuka, tata letak (layout), dan interaksi komponen untuk seluruh modul aplikasi Beberes.

---

## 1. Filosofi Desain

- **Tema:** *macOS Native Floating Glassmorphism*.
- **Karakteristik Utama:**
  - Bersih, lapang, berkesan ringan dan presisi khas ekosistem Apple.
  - Menggunakan panel kaca semi-transparan (*frosted glass*) dengan `backdrop-blur` halus.
  - Memisahkan elemen navigasi dan aksi mengambang (*floating islands*) dari konten utama untuk kesan modern dan tidak kaku.
  - **Prinsip Single Source of Truth:** Kontrol global tidak boleh diduplikasi di tingkat halaman lokal.

---

## 2. Arsitektur Layout Aplikasi

Aplikasi memiliki 4 lapisan tata letak terstandarisasi:

```
+------------------------------------------------------------------------------------+
|  [Floating Sidebar]   |  [TopBar: Judul Halaman | Spotlight Search | Global Controls]
|                       |------------------------------------------------------------
|  - Logo & Versi       |  [PageHeader: Ikon 40x40 | Judul H1 | Subjudul | Action Button]
|  - Navigasi Tab       |------------------------------------------------------------
|  - Drive Selector     |  [Sub-Header: Search Input | Filter Pills | Select All]
|  - Settings & About   |------------------------------------------------------------
|                       |  [Konten Halaman: Cards, Tabel, List Item]
|                       |
|                       |  [FloatingActionBar: Mengambang di tengah bawah jika terseleksi]
+------------------------------------------------------------------------------------+
```

### A. Floating Sidebar (`FloatingSidebar.tsx`)
- Mengambang dengan margin dari tepi kiri layar (`my-3 ml-3`).
- Tinggi: `h-[calc(100vh-1.5rem)]`.
- Sudut membulat besar: `rounded-3xl shadow-lg glass-panel`.
- Dapat di-resize (`64px` collapsed hingga `320px` max).
- Bagian bawah memuat **DriveSelector** untuk beralih antar volume (Internal SSD, Flashdisk, External Drive).

### B. TopBar Global (`TopBar.tsx`)
TopBar bertindak sebagai pusat status dan kontrol sistem global:
1. **Sisi Kiri:** Judul halaman aktif dan indikator sisa penyimpanan disk yang sedang dipantau.
2. **Tengah:** Pill pencarian Spotlight universal (`Cmd+K`).
3. **Sisi Kanan (HANYA di sini kontrol global ditempatkan):**
   - **Mode Penghapusan Global:** Toggle mode *Move to Trash* vs *Direct Permanent Delete*.
   - **Tombol Pintas Smart Clean:** Tombol akses cepat ke pembersihan cache umum.
   - **Pemilih Bahasa:** Dropdown multibahasa (ID, EN, ZH, JA, dll.).
   - **Tema Tampilan:** Toggle Dark / Light mode.

> **Aturan Penting:** Jangan pernah menduplikasi toggle mode penghapusan (*Direct Delete / Trash*) di header modul individual atau di dalam tabel. TopBar adalah satu-satunya pengendali mode ini.

### C. PageHeader Standar (`PageHeader.tsx`)
Setiap modul wajib menggunakan komponen `<PageHeader>` di bagian paling atas:
- **Ikon Kiri:** Kontainer `w-10 h-10 rounded-2xl` dengan latar belakang semi-transparan `bg-black/4 dark:bg-white/6`.
- **Teks:**
  - Judul halaman: `text-xl font-bold tracking-tight`.
  - Subjudul: `text-xs text-slate-500 dark:text-neutral-400 mt-0.5`.
  - Opsional Badge: Menampilkan jumlah item atau status cepat.
- **Aksi Kanan:** Maksimal 1-2 tombol aksi utama halaman (misal: tombol *Scan/Refresh*).

### D. Sub-Header (Pencarian & Filter)
- Input pencarian menggunakan ikon search di kiri dengan placeholder kontekstual.
- Filter pill menggunakan badge kapsul `rounded-full px-3 py-1 font-semibold text-xs`.
- Tombol Select All / Deselect All ditempatkan rapi sejajar di sebelah kanan bar pencarian.

### E. Floating Action Bar (`FloatingActionBar.tsx`)
Pengganti sticky bottom bar lama yang menempel kaku di dalam alur scroll halaman.
- **Arsitektur Overlay (React Portal):**
  - Menggunakan `createPortal` yang ditambatkan ke elemen root overlay `#floating-action-bar-root` di [MainLayout.tsx](file:///Users/mac/Developer/Beberes/src/components/layout/MainLayout.tsx).
  - Berada di luar kontainer `<main>` yang memiliki `overflow-y-auto`, sehingga bar benar-benar **terkunci permanen (pakem)** di bagian bawah layar viewport dan tidak ikut tergulung saat halaman di-scroll.
  - Area scroll `<main>` diberikan padding bawah lapang (`pb-24 sm:pb-28`) agar data terbawah tidak terhalang oleh bar.
- **Gaya Visual:**
  - Panel kaca: `glass-panel rounded-2xl shadow-2xl border border-black/8 dark:border-white/10 backdrop-blur-2xl px-5 py-3`.
  - Animasi transisi halus: `animate-slide-up duration-200`.
- **Elemen di Dalamnya:**
  - Indikator seleksi: Ikon peringatan + `X terpilih (XX GB)`.
  - Mode badge informatif (baca-saja, sinkron dengan TopBar).
  - Tombol deselect cepat (ikon silang).
  - Tombol aksi utama: `Clean Selected (XX GB)` dengan varian warna dinamis (Primary Blue untuk Trash, Danger Rose untuk Direct Delete).

---

## 3. Spesifikasi Komponen & Aturan Ukuran

### Checkbox (`src/components/ui/Checkbox.tsx`)
- **Ukuran Wajib:** `w-[18px] h-[18px] shrink-0 rounded-md border-2`.
- **Warna Saat Tercentang:** `bg-blue-500 border-blue-500 text-white`.
- **Warna Tidak Tercentang:** `border-slate-300 dark:border-neutral-600 hover:border-blue-400`.
- **Larangan:** Jangan gunakan `<input type="checkbox">` mentah tanpa class terstandarisasi. Selalu gunakan komponen `<Checkbox />`.

### Tombol (`src/components/ui/Button.tsx`)
- **Varian:**
  - `primary`: Background biru cerah (`bg-blue-600 hover:bg-blue-500 text-white shadow-xs`).
  - `secondary`: Glass finish lembut (`bg-black/5 dark:bg-white/8 hover:bg-black/8 dark:hover:bg-white/12`).
  - `danger`: Background merah tegas (`bg-rose-600 hover:bg-rose-500 text-white`).
  - `ghost`: Transparan tanpa border (`hover:bg-black/5 dark:hover:bg-white/5`).
- **Ukuran:**
  - `sm`: `px-3 py-1.5 text-xs rounded-xl`.
  - `md`: `px-4 py-2 text-sm rounded-xl`.

### Cards & Container (`src/components/ui/Card.tsx`)
- Menggunakan class `glass-panel rounded-2xl border border-black/6 dark:border-white/8`.
- Animasi pemuatan item bertingkat (*stagger animation*) dengan delay berbasis indeks.

---

## 4. Palet Warna & Semantik

| Status / Peran | Kode Warna Tailwind | Contoh Penggunaan |
| :--- | :--- | :--- |
| **Surface / Glass** | `glass-panel`, `backdrop-blur-xl` | Latar belakang sidebar, topbar, modal, dan card. |
| **Aksi Utama (Primary)** | `blue-500` / `blue-600` | Tombol Clean to Trash, tombol konfirmasi, aksen fokus. |
| **Bahaya / Permanen** | `rose-500` / `rose-600` | Direct Permanent Delete, hapus paksa, Trash Manager. |
| **Aman / Selesai** | `emerald-500` / `emerald-600` | Status disk bersih, sukses membersihkan, file original. |
| **Peringatan / Inaktif** | `amber-500` / `amber-600` | Full Disk Access notice, file lawas, peringatan kapasitas. |
| **Developer / Workspace** | `indigo-500` / `purple-500` | Cache build compiler, Git Sweeper, target Rust. |

---

## 5. Panduan Izin Sistem macOS (TCC & Full Disk Access)

macOS membatasi akses aplikasi pihak ketiga ke direktori tertentu (misalnya folder `~/.Trash`, `~/Library/Mail`, Safari).

**Aturan Penanganan di Beberes:**
1. Jika pembacaan folder ditolak (`PermissionDenied` / code `1`), backend Rust mengembalikan flag `permission_denied: true` alih-alih memberikan impresi salah bahwa folder kosong.
2. Frontend menampilkan kartu informasi khusus dengan ikon `ShieldAlert`, penjelasan singkat mengapa izin dibutuhkan, dan tombol **"Buka Pengaturan Sistem"** yang langsung membuka panel:
   `x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles`
3. Fitur yang tidak memerlukan izin langsung (seperti mengosongkan tempat sampah via AppleScript Finder) tetap disediakan sebagai aksi alternatif.
