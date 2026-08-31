# KOLAB SYARAT X TIGPAD
### Platform Edukasi & Pembelajaran Interaktif Bahasa Isyarat Indonesia (BISINDO)

Platform Pembelajaran Daring (LMS) modern, inklusif, dan interaktif hasil kolaborasi resmi antara **SYARAT** (Bahasa Isyarat) dan **TIGPAD** (Teknologi Inklusi Guna Padjadjaran) yang terbuka untuk seluruh masyarakat dan peserta umum.

---

## 🌟 Fitur Utama & Halaman Web

1. **`index.html` & `landing.html` (Portal Beranda & Edukasi Publik)**
   - **Hero Feature Bento Showcase**: Menampilkan pilar utama platform (5 Modul Video & PDF, Kuis Evaluasi 30 Menit, Game BisindoSpelling Interaktif, dan Sertifikat Resmi).
   - Kurikulum 6 modul BISINDO, statistik peserta umum, card peranan pengguna multi-role, dan FAQ interaktif.
   - Desain ultra responsif untuk perangkat Ponsel (Mobile), Tablet, dan Komputer (PC Desktop), dilengkapi drawer navigasi mobile dan sinkronisasi tema gelap/terang.

2. **`login.html` (Portal Autentikasi Pengguna)**
   - Role switcher instan (Peserta Umum, Mentor BISINDO, Administrator LMS) dengan auto-fill demo kredensial akun.
   - Feedback animasi dan sinkronisasi sesi peran ke `localStorage` (`kolab_role`).

3. **`dashboard.html` (Dashboard Overview Pembelajaran)**
   - Salam waktu dinamis (*Selamat Pagi / Siang / Sore / Malam*).
   - Bento grid KPI adaptif sesuai peran (`peserta`, `mentor`, `admin`).
   - Progress ring kurikulum (80% Selesai), banner CTA Lanjutkan Belajar, countdown sesi Live Zoom tatap muka, dan timeline aktivitas.

4. **`modul.html` (Video Player & Pembaca Dokumen Kurikulum)**
   - 6 Pertemuan Lengkap BISINDO (Budaya Tuli, Isyarat Dasar 1-3, Percakapan, Simulasi & Evaluasi).
   - Dual-mode player: Video Tutorial (YouTube Embed + Local HTML5 `video_dummy.mp4`) & PDF Reader Dokumen (`connectpdf_dummy_5page.pdf`).
   - Fitur "Tandai Selesai" tersimpan permanen di `localStorage`, serta modal kelola materi untuk Mentor/Admin.

5. **`kuis.html` (Engine Ujian Evaluasi & Anti-Cheat)**
   - Ujian evaluasi dengan countdown timer otomatis.
   - Dialog petunjuk pengerjaan & proteksi ujian.
   - Palet navigasi nomor soal, ragam tipe soal (Pilihan Ganda, Benar/Salah, Isian), review hasil instan, dan Bank Soal CRUD untuk Mentor.

6. **`game.html` (BISINDO Arcade Hub 3-in-1)**
   - **Mode 1 (BisindoSpelling Ejaan Kata)**: Animasi rangkaian abjad BISINDO pada kanvas dengan transisi fade delta-time (`js/spriteAnimator.js`), input form / virtual keyboard, dan timer.
   - **Mode 2 (Sign Rush - Refleks Cepat 4 Pilihan)**: Drill kecepatan tinggi dengan timer mundur 4 detik per soal, sistem 3 nyawa (❤️❤️❤️), dan Fever Multiplier bonus (x1 s/d x5).
   - **Mode 3 (Memory Match - Kartu 3D Flip)**: Permainan mencocokkan kartu 3D flip antara foto peraga isyarat BISINDO dan huruf abjad (Tingkat Mudah: 6 pasang, Sedang: 8 pasang, Sulit: 10 pasang), skor langkah, timer, dan rating bintang (⭐⭐⭐).
   - Dilengkapi synthesizer audio Web Audio API terintegrasi, master audio toggle, dan Panel Kelola Bank Kata untuk Mentor/Admin.

7. **`zoom.html` (Live Zoom & Presensi Peserta)**
   - Countdown penghitung waktu mundur sesi tatap muka daring.
   - Tombol satu-klik salin Meeting ID & Passcode.
   - Formulir Presensi Check-in peserta dan tabel verifikasi kehadiran untuk Mentor.

8. **`sertifikat.html` (Sertifikat Kelulusan Resmi & Verifikasi)**
   - Bingkai ornamen elegan klasik dengan lambang resmi sertifikasi BISINDO.
   - QR Code verifikasi keaslian dokumen dan tanda tangan pembina/mentor.
   - Mode cetak ramah printer (`@media print`) dan form pencarian nomor registrasi sertifikat.

9. **`reports.html` (Laporan & Analitik Perkembangan)**
   - Ringkasan KPI kelulusan, skor rata-rata, dan kehadiran Zoom.
   - Tabel rekapitulasi nilai peserta dengan filter pencarian instan dan ekspor PDF.

10. **`users.html` (Kelola Pengguna LMS - Khusus Admin)**
    - Manajemen data akun pengguna dan peserta pelatihan.
    - Filter tab peranan (Semua, Peserta, Mentor, Admin), pencarian live, dan modal tambah/edit pengguna.

11. **`profile.html` (Profil Pengguna & Kartu Identitas Digital)**
    - Kartu Identitas Digital peserta beraksen gradien duotone.
    - Pengunggah pasfoto profil langsung tersimpan di `localStorage` (`kolab_profile_photo`).
    - Editor data diri dan statistik kemajuan pembelajaran.

---

## 🎨 Desain & Teknologi

- **Vanilla HTML5 + Modern CSS3 + JavaScript (ES6)**: Didesain murni tanpa framework berat atau build tool tambahan. Dapat dijalankan langsung melalui protokol `file://` atau server lokal.
- **Tailwind CSS & DaisyUI CDN**: Styling modern dengan palet warna resmi Syarat Blue (`#163C8A`) dan Tigpad Orange (`#F97316`).
- **Glassmorphism & Dark Mode**: Efek kaca frosted glass (`.glass-card`, `.glass-nav`) dan ambient floating orbs yang tersinkronisasi dengan dark mode (`kolab_theme`).

---

## 🚀 Cara Menjalankan

Cukup buka `index.html` langsung di peramban web (Google Chrome, Firefox, Safari, Microsoft Edge). Tidak memerlukan dependensi Node.js atau instalasi server tambahan.

---

## 👥 Hak Akses & Peran (Multi-Role Demo)

| Peran | Akun Demo | Fitur Utama |
|---|---|---|
| **Peserta Umum** | `rina.rahmawati@email.com` | Belajar 5 Modul Video/PDF, Ujian Kuis Proctoring, Game Tebak BISINDO, Presensi Zoom, Unduh Sertifikat Resmi |
| **Mentor BISINDO** | `mentor@kolab.id` | Kelola Materi Modul, Kelola Sesi & Presensi Zoom, Bank Soal Kuis, Bank Kata Game, Pantau Nilai Peserta |
| **Administrator LMS** | `admin@kolab.id` | Manajemen Pengguna (CRUD Akun), Laporan & Analitik Kelulusan Komprehensif |

---

*Dikembangkan untuk Komunitas dan Masyarakat Umum — Inklusi untuk Semua.*

