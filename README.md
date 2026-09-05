# Kolab Syarat x TIGPAD - Platform Edukasi & Sertifikasi BISINDO (Production)

Aplikasi resmi web pembelajaran Bahasa Isyarat Indonesia (BISINDO), presensi live mentoring Zoom, kuis evaluasi otomatis, game interaktif ejaan gestur, dan penerbitan sertifikat digital resmi berbasis **Next.js 14 (App Router)** dan **Supabase Cloud Database**.

---

## 📁 Struktur Folder Proyek (Clean Architecture)

```text
kolab_syarat/
├── .env.example          # Template environment untuk deployment
├── .env.local            # Environment lokal Next.js
├── .gitignore            # Git ignore list
├── next.config.mjs       # Konfigurasi Next.js
├── package.json          # Dependencies & npm scripts
├── postcss.config.mjs    # PostCSS konfigurasi
├── tailwind.config.ts    # Desain sistem & warna Syarat x TIGPAD
├── tsconfig.json         # Konfigurasi TypeScript
├── supabase_schema.sql   # Skrip DDL Database Supabase (Schema Polos & RLS Production)
│
├── public/               # Asset statis publik (Sprites alfabet jari, Audio game, Icons)
│   ├── assets/           # Logo & Sprites alfabet jari BISINDO
│   └── sounds/           # Efek suara game
│
└── src/                  # Kode sumber aplikasi
    ├── app/              # Next.js App Router (Halaman & Routing)
    │   ├── dashboard/    # Dashboard ringkasan progres belajar
    │   ├── modul/        # Modul video & pembaca PDF interaktif
    │   ├── kuis/         # Kuis evaluasi kompetensi & skor otomatis
    │   ├── game/         # Game tebak ejaan alfabet jari BISINDO
    │   ├── zoom/         # Sesi Zoom meeting & verifikasi presensi
    │   ├── sertifikat/   # Verifikasi publik & kelola penerbitan sertifikat
    │   ├── users/        # Khusus Admin: Kelola user & hak akses
    │   ├── reports/      # Laporan analitik pelatihan & rekap
    │   ├── profile/      # Profil peserta/mentor/admin & ganti foto
    │   ├── login/        # Halaman autentikasi / ganti peran
    │   ├── globals.css   # Styling Tailwind CSS & Glassmorphism
    │   ├── layout.tsx    # Root layout aplikasi
    │   └── page.tsx      # Landing page utama
    │
    ├── components/       # Komponen UI Reusable
    │   ├── DashboardLayout.tsx
    │   ├── Navbar.tsx
    │   ├── Sidebar.tsx
    │   └── Toast.tsx
    │
    ├── context/          # State Management Global
    │   └── AppContext.tsx
    │
    ├── lib/              # Client & Layanan Integrasi
    │   ├── supabase.ts   # Inisialisasi Supabase Client & Sanitasi URL
    │   └── supabaseService.ts # API Service CRUD Database Supabase
    │
    └── types/            # Definisi Interface & Tipe TypeScript Terpusat
        └── index.ts
```

---

## 🚀 Setup & Menjalankan Aplikasi

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi Supabase
1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Buka menu **SQL Editor**, salin seluruh isi berkas `supabase_schema.sql`, lalu klik **Run**.
3. Buka menu **Project Settings -> API**, salin **Project URL** dan **Anon Public Key**.
4. Masukkan ke dalam berkas `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Jalankan Mode Development
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

### 4. Build untuk Production
```bash
npm run build
npm run start
```

---

## 🔒 Fitur Keamanan & Arsitektur
- **Row Level Security (RLS)**: Diaktifkan untuk seluruh tabel database di Supabase.
- **Zero Mock / Pure Production State**: Database awal polos tanpa data dummy / fake. Data dibuat secara dinamis melalui sistem.
- **TypeScript Strictly Typed**: Menggunakan interface terpusat di `src/types/index.ts` untuk keandalan runtime dan tipe data.
- **Cadangan Mentahan Terpisah**: Berkas HTML mentahan asli tersimpan aman di direktori terpisah `kolab_syarat_mentahan`.
