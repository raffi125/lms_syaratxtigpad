/**
 * data.js
 * -------
 * Word database + difficulty classification.
 *
 * NOTE ON file:// vs fetch():
 * Browsers block fetch() of local JSON files opened via file:// (CORS).
 * To guarantee "just double-click index.html and it works", the word list
 * is embedded here as a plain JS object instead of being fetched from
 * data/words.json at runtime. data/words.json is still kept in the project
 * as the human-editable source of truth / documentation — if you edit the
 * words, mirror the change in this file too (or serve the project over
 * http:// and switch WordDatabase to fetch() the JSON instead).
 */

window.WORD_BANK = {
  easy: ['IBU', 'AIR', 'AYAH', 'BUKU', 'SUSU', 'NASI', 'BOLA', 'ADIK', 'MATA', 'APEL'],
  medium: ['RUMAH', 'MAKAN', 'KUCING', 'KAMAR', 'KAKAK', 'SEPEDA', 'PISANG', 'BANGKU', 'MOBIL'],
  hard: ['SEKOLAH', 'JENDELA', 'KOMPUTER', 'LAPANGAN', 'MATAHARI', 'PERPUSTAKAAN'],
};
const WORD_BANK = window.WORD_BANK;

/**
 * WordDatabase
 * Small wrapper around WORD_BANK that knows how to classify word length
 * into a difficulty tier and hand back random words without repeats.
 */
class WordDatabase {
  constructor(bank = window.WORD_BANK) {
    this.bank = bank;
    this._recentByLevel = { easy: [], medium: [], hard: [] };
  }

  /** Classifies a word by length using the spec's rules (3-4 / 5-6 / 7+). */
  static classify(word) {
    const len = word.length;
    if (len <= 4) return 'easy';
    if (len <= 6) return 'medium';
    return 'hard';
  }

  /** All words for a level ('easy' | 'medium' | 'hard' | 'all'). */
  getWords(level) {
    if (level === 'all') {
      return [...this.bank.easy, ...this.bank.medium, ...this.bank.hard];
    }
    return this.bank[level] || [];
  }

  /**
   * Picks a random word for the given level, avoiding immediate repeats
   * where the pool is large enough to do so.
   */
  getRandomWord(level) {
    const pool = this.getWords(level);
    if (pool.length === 0) return null;

    const recent = this._recentByLevel[level] || [];
    let candidates = pool.filter((w) => !recent.includes(w));
    if (candidates.length === 0) candidates = pool; // pool exhausted, allow repeats

    const word = candidates[Math.floor(Math.random() * candidates.length)];

    if (this._recentByLevel[level]) {
      this._recentByLevel[level].push(word);
      // remember at most half the pool to keep variety without starving it
      const cap = Math.max(1, Math.floor(pool.length / 2));
      if (this._recentByLevel[level].length > cap) this._recentByLevel[level].shift();
    }

    return word;
  }
}

// Exposed as a global for the other plain-script modules (no bundler in use).
window.WordDatabase = WordDatabase;
