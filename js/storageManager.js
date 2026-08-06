/**
 * storageManager.js
 * -----------------
 * Thin wrapper around localStorage so the rest of the app never touches
 * window.localStorage directly (easier to test / swap out later, and keeps
 * key names + JSON parsing in one place).
 */
class StorageManager {
  constructor(namespace = 'bisindoFingerspelling') {
    this.ns = namespace;
  }

  _key(key) {
    return `${this.ns}:${key}`;
  }

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch (e) {
      // e.g. private browsing / storage disabled — fail silently, game still works
      return false;
    }
  }

  getHighScore(level) {
    return this.get(`highscore:${level}`, 0);
  }

  setHighScoreIfBetter(level, score) {
    const current = this.getHighScore(level);
    if (score > current) {
      this.set(`highscore:${level}`, score);
      return true; // new record
    }
    return false;
  }

  getPreference(name, fallback) {
    return this.get(`pref:${name}`, fallback);
  }

  setPreference(name, value) {
    this.set(`pref:${name}`, value);
  }
}

window.StorageManager = StorageManager;
