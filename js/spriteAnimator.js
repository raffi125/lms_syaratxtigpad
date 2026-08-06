/**
 * spriteAnimator.js
 * -----------------
 * Handles:
 *  1. SpriteCache    - lazy-loads & caches one Image per letter (A-Z), so a
 *                      letter's photo is only ever downloaded once.
 *  2. SpriteAnimator - plays a single letter's photo on a <canvas> with a
 *                      fade-in / hold / fade-out sequence, driven entirely
 *                      by requestAnimationFrame (never setInterval).
 *  3. SequencePlayer - plays a whole word (array of letters) back-to-back,
 *                      one photo per letter, with progress callbacks for
 *                      the UI (progress bar).
 *
 * NOTE: each assets/sprites/<LETTER>.webp is ONE real BISINDO fingerspelling
 * photo (not an animated sprite sheet). "Animation" here means the
 * on-canvas fade/scale entrance-and-exit transition between letters, not
 * frame-by-frame hand motion — since the source material for each letter
 * is a single reference photo, not a multi-frame recording.
 */

const HOLD_MS = 900;       // how long each letter's photo stays fully visible
const FADE_IN_MS = 220;    // entrance transition
const FADE_OUT_MS = 160;   // exit transition
const GAP_BETWEEN_LETTERS_MS = 220; // brief blank pause between letters

/**
 * SpriteCache
 * Lazy loading: an image is only requested from disk the first time that
 * letter is actually needed, then kept in memory for the rest of the game.
 */
class SpriteCache {
  constructor(basePath = 'assets/sprites/') {
    this.basePath = basePath;
    this._cache = new Map(); // letter -> HTMLImageElement
    this._pending = new Map(); // letter -> Promise
  }

  /** Returns a Promise<HTMLImageElement> for the given letter, cached after first load. */
  load(letter) {
    letter = letter.toUpperCase();
    if (this._cache.has(letter)) {
      return Promise.resolve(this._cache.get(letter));
    }
    if (this._pending.has(letter)) {
      return this._pending.get(letter);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this._cache.set(letter, img);
        this._pending.delete(letter);
        resolve(img);
      };
      img.onerror = () => {
        this._pending.delete(letter);
        reject(new Error(`Gagal memuat gambar peraga huruf "${letter}"`));
      };
      img.src = `${this.basePath}${letter}.webp`;
    });

    this._pending.set(letter, promise);
    return promise;
  }

  /** Preload several letters ahead of time (e.g. the next word) without blocking. */
  preload(letters) {
    [...new Set(letters.map((l) => l.toUpperCase()))].forEach((l) => {
      this.load(l).catch(() => {}); // best-effort, errors surfaced when actually played
    });
  }

  isCached(letter) {
    return this._cache.has(letter.toUpperCase());
  }
}

/**
 * SpriteAnimator
 * Draws one letter's photo onto a canvas with a fade/scale-in, a hold, and
 * a fade-out, using requestAnimationFrame. Speed is controlled by a
 * "playbackRate" multiplier so Pause can freeze it (rate 0) without
 * tearing down the loop.
 */
class SpriteAnimator {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._rafId = null;
    this.playbackRate = 1; // 1 = normal, 0 = paused
  }

  /** Draws the image centered/"contained" inside the canvas at a given opacity+scale. */
  _drawFrame(img, opacity, scale) {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    if (opacity <= 0) return;

    // "contain" fit: scale the photo to fit inside the canvas without cropping
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let drawW, drawH;
    if (imgRatio > canvasRatio) {
      drawW = width;
      drawH = width / imgRatio;
    } else {
      drawH = height;
      drawW = height * imgRatio;
    }
    drawW *= scale;
    drawH *= scale;

    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(img, dx, dy, drawW, drawH);
    this.ctx.restore();
  }

  /**
   * Plays fade-in -> hold -> fade-out for the given image and resolves when finished.
   * @param {HTMLImageElement} img
   * @returns {Promise<void>}
   */
  playOnce(img) {
    this._stop();

    const totalMs = FADE_IN_MS + HOLD_MS + FADE_OUT_MS;

    return new Promise((resolve) => {
      let elapsed = 0;
      let lastTimestamp = null;

      const step = (timestamp) => {
        if (lastTimestamp === null) lastTimestamp = timestamp;
        const delta = (timestamp - lastTimestamp) * this.playbackRate;
        lastTimestamp = timestamp;
        elapsed += delta;

        let opacity = 1;
        let scale = 1;

        if (elapsed < FADE_IN_MS) {
          const t = elapsed / FADE_IN_MS;
          opacity = t;
          scale = 0.92 + 0.08 * t; // subtle scale-up entrance
        } else if (elapsed < FADE_IN_MS + HOLD_MS) {
          opacity = 1;
          scale = 1;
        } else if (elapsed < totalMs) {
          const t = (elapsed - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS;
          opacity = 1 - t;
          scale = 1;
        } else {
          opacity = 0;
        }

        this._drawFrame(img, opacity, scale);

        if (elapsed >= totalMs) {
          this._rafId = null;
          resolve();
          return;
        }
        this._rafId = requestAnimationFrame(step);
      };

      this._drawFrame(img, 0, 0.92); // first paint, fully transparent
      this._rafId = requestAnimationFrame(step);
    });
  }

  pause() { this.playbackRate = 0; }
  resume() { this.playbackRate = 1; }

  _stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  clear() {
    this._stop();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/**
 * SequencePlayer
 * Plays an entire word: [letter1, letter2, ...] -> photo, gap, photo, gap...
 * Reports progress via onProgress(index, total) so the UI can drive a progress bar.
 */
class SequencePlayer {
  constructor(spriteCache, animator) {
    this.spriteCache = spriteCache;
    this.animator = animator;
    this._cancelled = false;
    this._paused = false;
    this._resumeWaiters = [];
  }

  pause() {
    this._paused = true;
    this.animator.pause();
  }

  resume() {
    this._paused = false;
    this.animator.resume();
    this._resumeWaiters.forEach((fn) => fn());
    this._resumeWaiters = [];
  }

  cancel() {
    this._cancelled = true;
    this.animator.clear();
  }

  _waitWhilePaused() {
    if (!this._paused) return Promise.resolve();
    return new Promise((resolve) => this._resumeWaiters.push(resolve));
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * @param {string} word e.g. "RUMAH"
   * @param {(letterIndex:number, total:number, letter:string) => void} onProgress
   * @returns {Promise<void>} resolves once the whole word has been shown (or rejects on load error)
   */
  async play(word, onProgress) {
    this._cancelled = false;
    const letters = word.split('');

    // Preload upcoming letters a little ahead so playback doesn't stall.
    this.spriteCache.preload(letters);

    for (let i = 0; i < letters.length; i += 1) {
      if (this._cancelled) return;
      await this._waitWhilePaused();
      if (this._cancelled) return;

      const letter = letters[i];
      onProgress(i, letters.length, letter);

      const img = await this.spriteCache.load(letter);
      if (this._cancelled) return;
      await this._waitWhilePaused();
      if (this._cancelled) return;

      await this.animator.playOnce(img);
      if (this._cancelled) return;

      if (i < letters.length - 1) {
        await this._waitWhilePaused();
        await this._sleep(GAP_BETWEEN_LETTERS_MS);
      }
    }

    if (!this._cancelled) onProgress(letters.length, letters.length, null);
  }
}

window.SpriteCache = SpriteCache;
window.SpriteAnimator = SpriteAnimator;
window.SequencePlayer = SequencePlayer;
window.SPRITE_CONFIG = { HOLD_MS, FADE_IN_MS, FADE_OUT_MS };
