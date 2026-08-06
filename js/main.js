/**
 * main.js
 * -------
 * Entry point. Instantiates every module and wires them together.
 * Kept intentionally tiny — all real logic lives in the other files.
 */
document.addEventListener('DOMContentLoaded', () => {
  const storage = new StorageManager();
  const audio = new AudioManager();
  const wordDatabase = new WordDatabase();

  const canvas = document.getElementById('sprite-canvas');
  const spriteCache = new SpriteCache('assets/sprites/');
  const spriteAnimator = new SpriteAnimator(canvas);
  const sequencePlayer = new SequencePlayer(spriteCache, spriteAnimator);

  const game = new Game({ wordDatabase, sequencePlayer, storage, audio });

  // eslint-disable-next-line no-unused-vars
  const ui = new UIManager({ game, storage, audio, spriteAnimator });

  // Warm the cache for the first few letters players are statistically
  // likely to see first, so the very first animation starts instantly.
  spriteCache.preload(['A', 'B', 'I', 'K', 'M', 'R', 'S']);

  // Exposed only to make manual debugging in the browser console easier
  // (e.g. `__debug.game.score`). Not required for the game to function.
  window.__debug = { game, storage, audio, spriteCache };

  // ---- Auto-resize when embedded in an <iframe> ------------------------
  // If this page is loaded inside an <iframe> (e.g. dari index.html KOLAB
  // SYARAT), report the actual content height to the parent page via
  // postMessage so the parent can size the iframe to fit exactly —
  // no wasted whitespace, no internal scrollbar, and it adjusts live as
  // the game moves between screens (menu vs bermain vs feedback).
  if (window.parent && window.parent !== window) {
    const reportHeight = () => {
      window.parent.postMessage(
        {
          source: 'bisindo-fingerspelling-game',
          type: 'resize',
          height: document.documentElement.scrollHeight,
        },
        '*'
      );
    };
    new ResizeObserver(reportHeight).observe(document.body);
    window.addEventListener('load', reportHeight);
    reportHeight();
  }
});
