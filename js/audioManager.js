/**
 * audioManager.js
 * ---------------
 * Sound effects generated with the Web Audio API (simple oscillator beeps)
 * instead of shipping .mp3/.wav files. This keeps the project 100%
 * self-contained (the sounds/ folder is left in the project structure for
 * anyone who wants to drop in real sound files later — see loadCustom()).
 */
class AudioManager {
  constructor() {
    this._ctx = null; // created lazily on first user gesture (browser policy)
    this.muted = false;
  }

  _getContext() {
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioCtx();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone({ freq, duration = 0.12, type = 'sine', gain = 0.2, glideTo = null }) {
    if (this.muted) return;
    const ctx = this._getContext();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
    }

    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  playCorrect() {
    this._tone({ freq: 523.25, glideTo: 783.99, duration: 0.18, type: 'triangle', gain: 0.22 });
  }

  playWrong() {
    this._tone({ freq: 220, glideTo: 110, duration: 0.22, type: 'sawtooth', gain: 0.18 });
  }

  playCombo() {
    this._tone({ freq: 660, glideTo: 990, duration: 0.15, type: 'square', gain: 0.15 });
  }

  playTick() {
    this._tone({ freq: 880, duration: 0.04, type: 'square', gain: 0.05 });
  }

  playClick() {
    this._tone({ freq: 400, duration: 0.05, type: 'sine', gain: 0.12 });
  }

  playGameOver() {
    if (this.muted) return;
    const notes = [392, 349.23, 293.66, 261.63];
    notes.forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, duration: 0.25, type: 'triangle', gain: 0.18 }), i * 150);
    });
  }

  setMuted(muted) {
    this.muted = muted;
  }
}

window.AudioManager = AudioManager;
