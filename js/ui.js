/**
 * ui.js
 * -----
 * The only file that touches the DOM. It:
 *  - Subscribes to Game's events (stateChange, roundStart, letterProgress,
 *    timerTick, scoreChange, roundResult, gameOver, paused/resumed)
 *  - Wires up user interactions (buttons, form submit) back into Game
 *  - Applies dark mode / mute preferences via StorageManager
 *
 * Keeping this separate from game.js means the game logic can be unit
 * tested (or reused with a totally different UI) without touching canvas
 * or document APIs.
 */
class UIManager {
  constructor({ game, storage, audio, spriteAnimator }) {
    this.game = game;
    this.storage = storage;
    this.audio = audio;
    this.spriteAnimator = spriteAnimator;
    this.selectedLevel = null;

    this._cacheDom();
    this._bindGameEvents();
    this._bindUserEvents();
    this._restorePreferences();
    this._refreshHighScores();
  }

  /* ---------------------------------------------------------- */
  /* DOM caching                                                  */
  /* ---------------------------------------------------------- */
  _cacheDom() {
    const $ = (sel) => document.querySelector(sel);
    this.el = {
      screens: {
        menu: $('#screen-menu'),
        game: $('#screen-game'),
        gameover: $('#screen-gameover'),
      },
      btnMute: $('#btn-mute'),
      btnDarkmode: $('#btn-darkmode'),
      levelCards: Array.from(document.querySelectorAll('.level-card')),
      btnPlay: $('#btn-play'),

      hudScore: $('#hud-score'),
      hudCombo: $('#hud-combo'),
      hudRound: $('#hud-round'),
      hudTimer: $('#hud-timer'),
      btnPause: $('#btn-pause'),

      progressFill: $('#progress-bar-fill'),
      stageCaption: $('#stage-caption'),

      answerForm: $('#answer-form'),
      answerInput: $('#answer-input'),
      btnSubmit: $('#btn-submit'),

      feedbackPanel: $('#feedback-panel'),
      feedbackMessage: $('#feedback-message'),
      btnNext: $('#btn-next'),

      btnRestart: $('#btn-restart'),
      btnQuit: $('#btn-quit'),

      pauseOverlay: $('#pause-overlay'),
      btnResume: $('#btn-resume'),

      finalScore: $('#final-score'),
      gameoverHighscoreMsg: $('#gameover-highscore-msg'),
      btnPlayAgain: $('#btn-play-again'),
      btnBackMenu: $('#btn-back-menu'),
    };
  }

  /* ---------------------------------------------------------- */
  /* Game -> UI                                                   */
  /* ---------------------------------------------------------- */
  _bindGameEvents() {
    this.game.on('roundStart', (data) => this._onRoundStart(data));
    this.game.on('letterProgress', (data) => this._onLetterProgress(data));
    this.game.on('timerTick', (data) => this._onTimerTick(data));
    this.game.on('scoreChange', (data) => this._onScoreChange(data));
    this.game.on('roundResult', (data) => this._onRoundResult(data));
    this.game.on('gameOver', (data) => this._onGameOver(data));
    this.game.on('stateChange', (data) => this._onStateChange(data));
    this.game.on('paused', () => { this.el.pauseOverlay.hidden = false; });
    this.game.on('resumed', () => { this.el.pauseOverlay.hidden = true; });
    this.game.on('error', (data) => {
      this.el.stageCaption.textContent = `⚠ ${data.message}`;
    });
  }

  _onStateChange({ state }) {
    if (state === 'answering') {
      this.el.answerInput.disabled = false;
      this.el.btnSubmit.disabled = false;
      this.el.answerInput.focus();
    } else if (state !== 'feedback') {
      this.el.answerInput.disabled = true;
      this.el.btnSubmit.disabled = true;
    }
  }

  _onRoundStart({ round, totalRounds, word }) {
    this.el.hudRound.textContent = `${round}/${totalRounds}`;
    this.el.progressFill.style.width = '0%';
    this.el.stageCaption.textContent = 'Perhatikan animasi...';
    this.el.feedbackPanel.hidden = true;
    this.el.answerInput.value = '';
    this.el.answerInput.disabled = true;
    this.el.btnSubmit.disabled = true;
    this.el.hudTimer.textContent = '--';
    this.spriteAnimator.clear();
  }

  _onLetterProgress({ letterIndex, total, letter }) {
    const pct = Math.round((letterIndex / total) * 100);
    this.el.progressFill.style.width = `${pct}%`;
    if (letter) {
      this.el.stageCaption.textContent = `Huruf ${letterIndex + 1} dari ${total}`;
    } else {
      this.el.progressFill.style.width = '100%';
      this.el.stageCaption.textContent = 'Sekarang ketik jawabanmu!';
    }
  }

  _onTimerTick({ timeLeft }) {
    this.el.hudTimer.textContent = `${Math.max(timeLeft, 0)}s`;
    this.el.hudTimer.parentElement.classList.toggle('urgent', timeLeft <= 5);
  }

  _onScoreChange({ score, combo, highScore }) {
    this.el.hudScore.textContent = score;
    this.el.hudCombo.textContent = `×${combo}`;
    this._updateHighScoreCard(this.game.level, highScore);
  }

  _onRoundResult({ correct, word, isNewHighScore }) {
    this.el.feedbackPanel.hidden = false;
    this.el.feedbackMessage.textContent = correct
      ? `✅ Benar! Jawabannya "${word}"`
      : `❌ Kurang tepat. Jawaban yang benar: "${word}"`;
    this.el.feedbackMessage.className = `feedback-message ${correct ? 'correct' : 'wrong'}`;
    if (isNewHighScore) {
      this.el.feedbackMessage.textContent += ' 🏆 Rekor baru!';
    }
  }

  _onGameOver({ score, highScore }) {
    this.el.finalScore.textContent = score;
    this.el.gameoverHighscoreMsg.textContent =
      score >= highScore && score > 0 ? '🏆 Skor tertinggi baru!' : `Skor tertinggi: ${highScore}`;
    this._showScreen('gameover');
  }

  /* ---------------------------------------------------------- */
  /* UI -> Game / preferences                                     */
  /* ---------------------------------------------------------- */
  _bindUserEvents() {
    this.el.levelCards.forEach((card) => {
      card.addEventListener('click', () => {
        this.audio.playClick();
        this.selectedLevel = card.dataset.level;
        this.el.levelCards.forEach((c) => c.classList.toggle('selected', c === card));
        this.el.btnPlay.disabled = false;
      });
    });

    this.el.btnPlay.addEventListener('click', () => {
      if (!this.selectedLevel) return;
      this.audio.playClick();
      this._showScreen('game');
      this.game.start(this.selectedLevel);
    });

    this.el.answerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.game.submitAnswer(this.el.answerInput.value);
    });

    this.el.btnNext.addEventListener('click', () => {
      this.audio.playClick();
      this.game.next();
    });

    this.el.btnPause.addEventListener('click', () => {
      this.audio.playClick();
      this.game.pause();
    });
    this.el.btnResume.addEventListener('click', () => {
      this.audio.playClick();
      this.game.resume();
    });

    this.el.btnRestart.addEventListener('click', () => {
      this.audio.playClick();
      this.game.restart();
    });
    this.el.btnQuit.addEventListener('click', () => {
      this.audio.playClick();
      this.game.quitToMenu();
      this._showScreen('menu');
    });

    this.el.btnPlayAgain.addEventListener('click', () => {
      this.audio.playClick();
      this.el.screens.gameover.classList.remove('active');
      this._showScreen('game');
      this.game.start(this.game.level);
    });
    this.el.btnBackMenu.addEventListener('click', () => {
      this.audio.playClick();
      this.el.screens.gameover.classList.remove('active');
      this._showScreen('menu');
    });

    this.el.btnMute.addEventListener('click', () => this._toggleMute());
    this.el.btnDarkmode.addEventListener('click', () => this._toggleDarkMode());
  }

  _showScreen(name) {
    Object.entries(this.el.screens).forEach(([key, node]) => {
      node.classList.toggle('active', key === name);
    });
  }

  _updateHighScoreCard(level, value) {
    const node = document.querySelector(`[data-highscore-for="${level}"]`);
    if (node) node.textContent = `Skor tertinggi: ${value}`;
  }

  _refreshHighScores() {
    ['easy', 'medium', 'hard'].forEach((level) => {
      this._updateHighScoreCard(level, this.storage.getHighScore(level));
    });
  }

  _toggleMute() {
    const newMuted = !this.audio.muted;
    this.audio.setMuted(newMuted);
    this.storage.setPreference('muted', newMuted);
    this.el.btnMute.textContent = newMuted ? '🔇' : '🔊';
  }

  _toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = !isDark;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    this.storage.setPreference('darkMode', next);
    this.el.btnDarkmode.textContent = next ? '☀️' : '🌙';
  }

  _restorePreferences() {
    const muted = this.storage.getPreference('muted', false);
    this.audio.setMuted(muted);
    this.el.btnMute.textContent = muted ? '🔇' : '🔊';

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = this.storage.getPreference('darkMode', prefersDark);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    this.el.btnDarkmode.textContent = darkMode ? '☀️' : '🌙';
  }
}

window.UIManager = UIManager;
