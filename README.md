# BISINDO Fingerspelling — Game Edukasi

Game web edukasi untuk berlatih membaca fingerspelling (peraga huruf) BISINDO.
Dibuat dengan **HTML5 + CSS3 + Vanilla JavaScript (ES6)** murni — tanpa
framework, tanpa library eksternal, tanpa build step.

> Konsep & alur permainan terinspirasi dari
> https://www.signlanguageforum.com/bsl/fingerspelling/fingerspelling-game/
> Tidak ada kode maupun aset dari situs tersebut yang disalin — seluruh kode
> dan CSS di project ini dibuat dari nol. Foto peraga huruf A–Z memakai
> koleksi "Abjad BISINDO JABAR" yang kamu berikan.

## Cara menjalankan

Cukup buka `index.html` langsung di browser (double click, atau
klik-kanan → Open with → browser pilihanmu). Tidak perlu server, tidak perlu
`npm install`.

```
project/
├── index.html          ← buka file ini
├── css/style.css
├── js/*.js
├── data/words.json
├── assets/sprites/*.webp
├── sounds/README.md
└── tools/generate_sprites.py
```

## Tentang aset gambar

`assets/sprites/*.webp` berisi foto peraga huruf BISINDO asli (A–Z) dari
koleksi yang kamu berikan ("Abjad BISINDO JABAR"), sudah dikompres ke WebP
(diresize ke lebar 700px, quality 82) supaya ringan — total ukuran turun
dari ±14.5MB jadi ±0.3MB tanpa terlihat penurunan kualitas yang berarti di
ukuran tampil game. Kontennya tidak diubah (tidak di-crop, watermark/label
"R (Right) / L (Left)" pada foto asli tetap dibiarkan apa adanya).

Karena tiap huruf adalah **satu foto statis** (bukan rekaman multi-frame),
animasi di canvas berupa transisi *fade-in → tahan tampil → fade-out*
antar huruf (lihat `js/spriteAnimator.js`), bukan animasi gerak tangan
frame-per-frame.

### Mengganti / menambah foto huruf lain

1. Siapkan foto baru, disimpan sebagai `assets/sprites/<HURUF>.webp`
   (huruf besar, satu file per huruf).
2. Tidak perlu ukuran/rasio yang persis sama — `SpriteAnimator` otomatis
   menyesuaikan (`contain`, tidak crop) ke ukuran canvas.
3. Kalau mau mengubah kecepatan tampil (fade-in/hold/fade-out), ubah
   `HOLD_MS`, `FADE_IN_MS`, `FADE_OUT_MS` di `js/spriteAnimator.js`.

Skrip pembuat placeholder lama (`tools/generate_sprites.py`) masih
disertakan sebagai cadangan — berguna kalau suatu saat kamu butuh
placeholder sementara untuk huruf yang belum ada fotonya.

## Arsitektur kode

Semua modul JS ditulis sebagai `class` terpisah, di-load sebagai script
biasa (bukan ES module) supaya tetap bisa jalan dari `file://` tanpa
CORS error, dengan urutan dependency yang jelas di `index.html`:

| File | Tanggung jawab |
|---|---|
| `js/storageManager.js` | Wrapper `localStorage` — high score & preferensi (dark mode, mute). |
| `js/audioManager.js` | Efek suara, disintesis lewat Web Audio API (tidak perlu file audio). |
| `js/data.js` | `WordDatabase` — daftar kata per level & pemilihan kata acak (anti-repeat). |
| `js/spriteAnimator.js` | `SpriteCache` (lazy load + cache foto), `SpriteAnimator` (render 1 huruf via Canvas + `requestAnimationFrame`, transisi fade-in/hold/fade-out), `SequencePlayer` (mainkan seluruh kata huruf-per-huruf). |
| `js/game.js` | `Game` — state machine inti: ronde, skor, combo, timer, pause/restart. Tidak menyentuh DOM sama sekali (bisa diuji terpisah). |
| `js/ui.js` | `UIManager` — satu-satunya file yang menyentuh DOM. Menjembatani event dari `Game` ke tampilan, dan input pengguna kembali ke `Game`. |
| `js/main.js` | Merangkai semua modul saat halaman dimuat. |

Pemisahan `game.js` (logika) vs `ui.js` (tampilan) ini sengaja dibuat agar:
- Kode mudah dibaca (tiap file fokus satu tanggung jawab).
- Logika game bisa dites tanpa browser/DOM.
- Tampilan bisa diubah total tanpa menyentuh logika skor/combo/timer.

### Alur permainan (`Game` state machine)

```
menu → showing (animasi huruf berjalan) → answering (input dibuka + timer jalan)
     → feedback (benar/salah ditampilkan) → showing (ronde berikutnya)
     → ... → gameover (setelah 8 ronde)
```

State `paused` bisa "menimpa" `showing`/`answering` kapan saja lewat tombol
jeda, dan kembali ke state semula saat dilanjutkan.

### Sprite & animasi

- 1 file WebP per huruf = 1 foto peraga BISINDO asli (bukan sprite sheet
  multi-frame).
- `SpriteCache` memuat gambar **lazy** (baru di-download saat huruf itu
  benar-benar akan tampil) dan **cache** di memori (`Map`) supaya huruf yang
  sama tidak pernah di-download dua kali.
- `SpriteAnimator` menggambar foto ke `<canvas>` dengan `drawImage`, dengan
  transisi fade-in → tahan tampil → fade-out yang dihitung dari delta-time
  murni via `requestAnimationFrame` (bukan `setInterval`), jadi FPS stabil
  dan hemat baterai saat tab tidak aktif.
- `SequencePlayer` mengurutkan pemutaran seluruh huruf dalam satu kata, plus
  jeda singkat antar huruf, dan melaporkan progres ke UI (untuk progress bar).

### Skor & combo

- Setiap huruf bernilai poin dasar sesuai level (Mudah/Sedang/Sulit —
  lihat `LEVEL_CONFIG` di `js/game.js`), dikalikan panjang kata.
- Combo naik 1 setiap jawaban benar berturut-turut, beri bonus poin kecil
  (dibatasi maksimum), dan reset ke 0 saat jawaban salah/waktu habis.
- High score disimpan **per level** di `localStorage` lewat `StorageManager`.

## Fitur yang tersedia

- ✅ Kata acak (anti-repeat dalam sesi) dari `data/words.json` / `js/data.js`
- ✅ 3 tingkat kesulitan (Mudah 3–4 huruf, Sedang 5–6, Sulit 7+)
- ✅ Timer mundur per ronde
- ✅ Combo multiplier
- ✅ High score per level (localStorage)
- ✅ Efek suara (benar/salah/combo/tick/game over) via Web Audio API
- ✅ Pause & Resume
- ✅ Restart
- ✅ Dark mode (tersimpan di localStorage, mengikuti preferensi sistem di awal)
- ✅ Responsive — nyaman dipakai di desktop maupun mobile
- ✅ Progress bar huruf per kata
- ✅ Lazy loading + caching sprite

## Menambah / mengubah kata

Edit array di `js/data.js` (`WORD_BANK`). File `data/words.json` disediakan
sebagai sumber referensi yang mudah dibaca/diedit manusia — tapi karena
`fetch()` terhadap file lokal diblokir browser saat dibuka lewat `file://`
(kebijakan CORS), yang benar-benar dipakai saat runtime adalah salinan di
`js/data.js`. Kalau kamu meng-host project ini lewat server HTTP, kamu bisa
mengubah `WordDatabase` untuk `fetch('data/words.json')` sungguhan.

## Menyesuaikan tingkat kesulitan / jumlah ronde

Ubah konstanta di `js/game.js`:
- `LEVEL_CONFIG` — durasi timer & poin per huruf per level.
- `ROUNDS_PER_GAME` — jumlah kata per sesi sebelum layar Game Over muncul.
