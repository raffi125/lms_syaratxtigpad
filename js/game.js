/**
 * game.js
 * -------
 * Core game logic, decoupled from the DOM. UIManager (ui.js) subscribes to
 * events emitted here and is the only file that touches the document.
 *
 * Flow per round (matches the spec's gameplay steps):
 *   1. pick random word for the current level
 *   2. split word into letters
 *   3. play fingerspelling animation letter-by-letter (SequencePlayer)
 *   4. once done, open the answer input + start the countdown timer
 *   5. checkAnswer() compares input vs the word
 *   6. score + combo updated, high score persisted
 *   7. next() moves on to a new random word
 */

/** Minimal pub/sub so game.js never needs to know about the DOM. */
class EventEmitter {
  constructor() { this._listeners = {}; }
  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  }
  emit(event, payload) {
    (this._listeners[event] || []).forEach((fn) => fn(payload));
  }
}

const LEVEL_CONFIG = {
  easy: { answerSeconds: 18, pointsPerLetter: 8, label: 'Mudah' },
  medium: { answerSeconds: 24, pointsPerLetter: 10, label: 'Sedang' },
  hard: { answerSeconds: 32, pointsPerLetter: 13, label: 'Sulit' },
};

const ROUNDS_PER_GAME = 8; // a "run" ends after this many words (Game Over screen)

class Game extends EventEmitter {
  /**
   * @param {object} deps
   * @param {WordDatabase} deps.wordDatabase
   * @param {SequencePlayer} deps.sequencePlayer
   * @param {StorageManager} deps.storage
   * @param {AudioManager} deps.audio
   */
  constructor({ wordDatabase, sequencePlayer, storage, audio }) {
    super();
    this.wordDatabase = wordDatabase;
    this.sequencePlayer = sequencePlayer;
    this.storage = storage;
    this.audio = audio;

    this.level = 'easy';
    this.state = 'menu'; // menu | showing | answering | feedback | paused | gameover
    this.score = 0;
    this.combo = 0;
    this.round = 0;
    this.currentWord = null;
    this.highScore = 0;

    this._timerId = null;
    this._timeLeft = 0;
    this._preStateBeforePause = null;
  }

  /** Begins a fresh run at the chosen difficulty level. */
  start(level) {
    this.level = level;
    this.score = 0;
    this.combo = 0;
    this.round = 0;
    this.highScore = this.storage.getHighScore(level);
    this.emit('scoreChange', { score: this.score, combo: this.combo, highScore: this.highScore });
    this._nextRound();
  }

  /** Advances to a new random word (used both to start and after feedback). */
  _nextRound() {
    this.round += 1;
    if (this.round > ROUNDS_PER_GAME) {
      this._endGame();
      return;
    }

    this.currentWord = this.wordDatabase.getRandomWord(this.level);
    this._clearTimer();
    this._setState('showing');
    this.emit('roundStart', {
      round: this.round,
      totalRounds: ROUNDS_PER_GAME,
      word: this.currentWord,
      level: this.level,
    });

    this.sequencePlayer
      .play(this.currentWord, (letterIndex, total, letter) => {
        this.emit('letterProgress', { letterIndex, total, letter });
      })
      .then(() => {
        if (this.state === 'showing') this._beginAnswerPhase();
      })
      .catch((err) => {
        this.emit('error', { message: err.message });
      });
  }

  _beginAnswerPhase() {
    const cfg = LEVEL_CONFIG[this.level];
    this._timeLeft = cfg.answerSeconds;
    this._setState('answering');
    this.emit('timerTick', { timeLeft: this._timeLeft, total: cfg.answerSeconds });

    this._timerId = setInterval(() => {
      this._timeLeft -= 1;
      this.emit('timerTick', { timeLeft: this._timeLeft, total: cfg.answerSeconds });
      if (this._timeLeft <= 1) this.audio.playTick();
      if (this._timeLeft <= 0) {
        this._clearTimer();
        this._submit(''); // time's up counts as a (likely wrong) submission
      }
    }, 1000);
  }

  /** Called by the UI when the player presses Submit / hits Enter. */
  submitAnswer(rawAnswer) {
    if (this.state !== 'answering') return;
    this._clearTimer();
    this._submit(rawAnswer);
  }

  _submit(rawAnswer) {
    const normalize = (s) => (s || '').trim().toUpperCase();
    const isCorrect = normalize(rawAnswer) === this.currentWord;
    const cfg = LEVEL_CONFIG[this.level];

    if (isCorrect) {
      this.combo += 1;
      const comboBonus = Math.min(this.combo - 1, 5) * 2; // small escalating bonus, capped
      const gained = this.currentWord.length * cfg.pointsPerLetter + comboBonus;
      this.score += gained;
      this.audio.playCorrect();
      if (this.combo > 1) this.audio.playCombo();
    } else {
      this.combo = 0;
      this.audio.playWrong();
    }

    const isNewHighScore = this.storage.setHighScoreIfBetter(this.level, this.score);
    if (isNewHighScore) this.highScore = this.score;

    this._setState('feedback');
    this.emit('scoreChange', { score: this.score, combo: this.combo, highScore: this.highScore });
    this.emit('roundResult', {
      correct: isCorrect,
      answer: rawAnswer,
      word: this.currentWord,
      score: this.score,
      combo: this.combo,
      isNewHighScore,
    });
  }

  /** Called by the UI's "Lanjut" (Next) button. */
  next() {
    if (this.state !== 'feedback') return;
    this._nextRound();
  }

  _endGame() {
    this._clearTimer();
    this.sequencePlayer.cancel();
    this._setState('gameover');
    this.audio.playGameOver();
    this.emit('gameOver', { score: this.score, highScore: this.highScore, level: this.level });
  }

  pause() {
    if (this.state === 'showing' || this.state === 'answering') {
      this._preStateBeforePause = this.state;
      this.sequencePlayer.pause();
      this._setState('paused');
      this.emit('paused');
    }
  }

  resume() {
    if (this.state !== 'paused') return;
    this.sequencePlayer.resume();
    this._setState(this._preStateBeforePause);
    this.emit('resumed');
  }

  restart() {
    this._clearTimer();
    this.sequencePlayer.cancel();
    this.start(this.level);
  }

  quitToMenu() {
    this._clearTimer();
    this.sequencePlayer.cancel();
    this._setState('menu');
  }

  _setState(state) {
    this.state = state;
    this.emit('stateChange', { state });
  }

  _clearTimer() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  static get LEVEL_CONFIG() { return LEVEL_CONFIG; }
  static get ROUNDS_PER_GAME() { return ROUNDS_PER_GAME; }
}

window.Game = Game;
window.LEVEL_CONFIG = LEVEL_CONFIG;
