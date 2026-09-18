# UI/UX Design Guidelines

## 1. Konsep Desain (Design Philosophy)

- **Tema:** _Minimalist macOS Native_. Aplikasi harus terasa seperti utilitas bawaan Apple.
- **Karakteristik:** Bersih, lapang (banyak _white-space_), transisi mulus, dan informasi langsung pada intinya.

## 2. Palet Warna (Color Palette)

Menggunakan referensi Tailwind CSS:

- **Background Utama (Light Mode):** `bg-slate-50`
- **Background Utama (Dark Mode):** `bg-neutral-900`
- **Surface/Card:** `bg-white` (Light) / `bg-neutral-800` (Dark) dengan sedikit transparansi/blur (opsional jika tidak membebani performa).
- **Aksen Utama (Aksi Primer):** Blue (`bg-blue-500` / `bg-blue-600` untuk _hover_).
- **Status Aman/Bersih:** Emerald (`text-emerald-500`).
- **Status Peringatan (Kapasitas Penuh):** Amber (`text-amber-500`).
- **Status Bahaya (Junk/Trash):** Rose (`text-rose-500`).

## 3. Tipografi

- **Font Utama:** Inter (atau font sistem bawaan `font-sans` di Tailwind yang akan mengarah ke San Francisco di Mac).
- **Hierarki:**
  - H1 (Header Area): Text 2xl, Font Bold.
  - H2 (Card Titles): Text lg, Font Semi-bold.
  - Body: Text sm, Font Regular, warna abu-abu (Slate-500).

## 4. Layout Struktur (Wireframe)

Aplikasi menggunakan layout **Sidebar + Main Content**.

### A. Sidebar (Navigasi Kiri)

- Lebar tetap (sekitar `w-64`).
- Berisi logo aplikasi "Beberes".
- Menu Navigasi:
  - Dashboard (Ringkasan)
  - System Clean (Pembersihan Umum)
  - Dev Workspace (Pembersihan khusus Developer)
  - Settings (Pengaturan & Whitelist)

### B. Main Content (Area Kanan)

- **Header:** Judul halaman aktif dan indikator sisa penyimpanan (_Storage Ring Chart_).
- **Body:**
  - Daftar kategori file yang bisa dibersihkan dalam bentuk _Card_ atau Tabel.
  - Terdapat _Checkbox_ di sebelah kiri setiap baris untuk seleksi manual.
- **Footer (Sticky):** Total ukuran file terpilih dan tombol besar **"Clean Selected (XX GB)"**.

## 5. Interaksi & Animasi

- **Hover States:** Perubahan warna latar belakang yang halus saat kursor mengarah ke baris tabel atau tombol (`transition-colors duration-200`).
- **Loading State:** Penggunaan _Skeleton loader_ atau _spinner_ (Lucide `Loader2` dengan animasi `animate-spin`) saat pemindaian Rust sedang berjalan.
