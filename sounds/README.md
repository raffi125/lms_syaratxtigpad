# sounds/

Efek suara di game ini dihasilkan secara **sintesis** memakai Web Audio API
(lihat `js/audioManager.js`), jadi folder ini sengaja kosong secara default —
tidak ada file audio eksternal yang perlu diunduh/dimuat, dan game tetap
100% jalan hanya dengan membuka `index.html`.

## Ingin pakai file suara asli (mp3/wav/ogg)?

1. Taruh file suara di folder ini, misalnya:
   ```
   sounds/correct.mp3
   sounds/wrong.mp3
   sounds/combo.mp3
   sounds/tick.mp3
   sounds/gameover.mp3
   ```
2. Di `js/audioManager.js`, tambahkan method baru yang memutar file, contoh:
   ```js
   loadCustom(name, src) {
     const audio = new Audio(src);
     return audio;
   }

   playCorrectFile() {
     if (this.muted) return;
     new Audio('sounds/correct.mp3').play();
   }
   ```
3. Ganti pemanggilan `this.audio.playCorrect()` dkk di `js/game.js` sesuai
   kebutuhan, atau modifikasi method yang sudah ada agar memutar file jika
   tersedia, dan fallback ke synth tone jika tidak.

> Catatan: memutar file lokal dengan tag `<audio>`/`new Audio()` tetap aman
> dibuka lewat `file://` (tidak kena masalah CORS seperti `fetch()` pada JSON).
