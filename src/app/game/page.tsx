"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseService } from "@/lib/supabaseService";

type GameMode = "fingerspelling" | "rush" | "memory";

interface WordItem {
  word: string;
  level: "easy" | "medium" | "hard";
}

export default function GamePage() {
  const { showToast, logActivity } = useApp();

  const [activeTab, setActiveTab] = useState<GameMode>("fingerspelling");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameWords, setGameWords] = useState<{ [key: string]: string[] }>({
    easy: [],
    medium: [],
    hard: [],
  });
  const [isLoadingWords, setIsLoadingWords] = useState(true);

  // Load dynamic game words purely from Supabase (Zero LocalStorage)
  useEffect(() => {
    // Clear residual localStorage for game words to guarantee pure remote state
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem("bisindoSpelling");
        localStorage.removeItem("game_words");
        localStorage.removeItem("DEFAULT_GAME_WORDS");
      } catch (e) {
        // ignore
      }
    }

    async function loadWords() {
      setIsLoadingWords(true);
      try {
        const [easy, medium, hard] = await Promise.all([
          SupabaseService.getGameWords("easy"),
          SupabaseService.getGameWords("medium"),
          SupabaseService.getGameWords("hard"),
        ]);
        setGameWords({
          easy: easy || [],
          medium: medium || [],
          hard: hard || [],
        });
      } catch (e) {
        console.warn("Gagal memuat kosakata dari Supabase:", e);
        setGameWords({ easy: [], medium: [], hard: [] });
      } finally {
        setIsLoadingWords(false);
      }
    }
    loadWords();
  }, []);

  // =================== MODE 1: BISINDOSPELLING ===================
  const [spellingState, setSpellingState] = useState<"menu" | "playing" | "gameover">("menu");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [currentWord, setCurrentWord] = useState("");
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(1);
  const [roundTimer, setRoundTimer] = useState(25);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // High scores in state
  const [highScores, setHighScores] = useState({ easy: 450, medium: 520, hard: 680 });

  // Timer for Mode 1
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (spellingState === "playing" && roundTimer > 0 && !feedback) {
      timer = setInterval(() => {
        setRoundTimer((prev) => {
          if (prev <= 1) {
            handleSpellingTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [spellingState, roundTimer, feedback]);

  // Letter cycling animation for Mode 1
  useEffect(() => {
    let animTimer: NodeJS.Timeout;
    if (spellingState === "playing" && !feedback && currentWord && currentWord.length > 0) {
      animTimer = setInterval(() => {
        setCurrentLetterIdx((prev) => (prev + 1) % currentWord.length);
      }, 1200);
    }
    return () => clearInterval(animTimer);
  }, [spellingState, currentWord, feedback]);

  const startSpellingGame = () => {
    const words = gameWords[selectedDifficulty] || [];
    if (!words || words.length === 0) {
      showToast("Maaf Belum ada, segera dibuatin", "info");
      return;
    }
    const firstWord = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(firstWord);
    setCurrentLetterIdx(0);
    setUserInput("");
    setScore(0);
    setCombo(0);
    setRound(1);
    setRoundTimer(25);
    setFeedback(null);
    setSpellingState("playing");
  };

  const handleSpellingTimeout = () => {
    setCombo(0);
    setFeedback({ msg: `Waktu Habis! Jawaban yang benar: ${currentWord}`, success: false });
  };

  const handleSpellingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    if (userInput.trim().toUpperCase() === currentWord) {
      const addedScore = 100 + combo * 20;
      const newScore = score + addedScore;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setFeedback({ msg: `Hebat! Benar! (+${addedScore} Poin)`, success: true });
    } else {
      setCombo(0);
      setFeedback({ msg: `Kurang Tepat! Jawaban: ${currentWord}`, success: false });
    }
  };

  const handleSpellingNextRound = () => {
    if (round >= 8) {
      // Game over
      const curHigh = highScores[selectedDifficulty];
      if (score > curHigh) {
        setHighScores((prev) => ({ ...prev, [selectedDifficulty]: score }));
      }
      setSpellingState("gameover");
      logActivity({
        title: "Bermain Game BISINDO Spelling",
        description: `Menyelesaikan mode tebak kata isyarat level ${selectedDifficulty} dengan perolehan skor ${score} poin`,
        category: "game",
        statusText: `${score} Poin`,
        statusBadge: "purple",
        icon: "fa-solid fa-gamepad text-purple-500",
      });
      return;
    }

    const words = gameWords[selectedDifficulty] || [];
    if (!words || words.length === 0) {
      showToast("Maaf Belum ada, segera dibuatin", "info");
      setSpellingState("menu");
      return;
    }
    const nextWord = words[Math.floor(Math.random() * words.length)];
    setCurrentWord(nextWord);
    setCurrentLetterIdx(0);
    setUserInput("");
    setRound((prev) => prev + 1);
    setRoundTimer(25);
    setFeedback(null);
  };

  // =================== MODE 2: SIGN RUSH ===================
  const [rushRunning, setRushRunning] = useState(false);
  const [rushTargetLetter, setRushTargetLetter] = useState("A");
  const [rushOptions, setRushOptions] = useState<string[]>(["A", "B", "C", "D"]);
  const [rushScore, setRushScore] = useState(0);
  const [rushLives, setRushLives] = useState(3);
  const [rushRound, setRushRound] = useState(1);
  const [rushTimer, setRushTimer] = useState(4);
  const [rushGameOver, setRushGameOver] = useState(false);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const nextRushQuestion = () => {
    const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const otherLetters = ALPHABET.filter((l) => l !== target)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const opts = [target, ...otherLetters].sort(() => 0.5 - Math.random());

    setRushTargetLetter(target);
    setRushOptions(opts);
    setRushTimer(4);
  };

  const startSignRush = () => {
    setRushScore(0);
    setRushLives(3);
    setRushRound(1);
    setRushGameOver(false);
    setRushRunning(true);
    nextRushQuestion();
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rushRunning && !rushGameOver && rushTimer > 0) {
      timer = setInterval(() => {
        setRushTimer((prev) => {
          if (prev <= 1) {
            handleRushAnswer("TIMEOUT");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [rushRunning, rushGameOver, rushTimer]);

  const handleRushAnswer = (letter: string) => {
    if (!rushRunning || rushGameOver) return;

    if (letter === rushTargetLetter) {
      setRushScore((prev) => prev + 50);
      setRushRound((prev) => prev + 1);
      nextRushQuestion();
    } else {
      const nextLives = rushLives - 1;
      setRushLives(nextLives);
      if (nextLives <= 0) {
        setRushGameOver(true);
        setRushRunning(false);
        logActivity({
          title: "Bermain Game Sign Rush",
          description: `Bermain tebak cepat alfabet isyarat mencapai ronde ${rushRound} dengan skor ${rushScore} poin`,
          category: "game",
          statusText: `${rushScore} Poin`,
          statusBadge: "amber",
          icon: "fa-solid fa-bolt text-amber-500",
        });
      } else {
        setRushRound((prev) => prev + 1);
        nextRushQuestion();
      }
    }
  };

  // =================== MODE 3: MEMORY MATCH ===================
  interface MemoryCard {
    id: number;
    matchId: string;
    type: "image" | "letter";
    value: string;
    flipped: boolean;
    matched: boolean;
  }

  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryDifficulty, setMemoryDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [memoryCompleted, setMemoryCompleted] = useState(false);

  const initMemoryGame = (diff = memoryDifficulty) => {
    const pairCount = diff === "easy" ? 6 : diff === "medium" ? 8 : 10;
    const shuffledAlphabet = [...ALPHABET].sort(() => 0.5 - Math.random()).slice(0, pairCount);

    const cards: MemoryCard[] = [];
    shuffledAlphabet.forEach((letter, idx) => {
      cards.push({
        id: idx * 2,
        matchId: letter,
        type: "image",
        value: letter,
        flipped: false,
        matched: false,
      });
      cards.push({
        id: idx * 2 + 1,
        matchId: letter,
        type: "letter",
        value: letter,
        flipped: false,
        matched: false,
      });
    });

    cards.sort(() => 0.5 - Math.random());
    setMemoryCards(cards);
    setSelectedCards([]);
    setMemoryMoves(0);
    setMemoryCompleted(false);
  };

  useEffect(() => {
    if (activeTab === "memory") {
      initMemoryGame();
    }
  }, [activeTab]);

  const handleCardClick = (id: number) => {
    if (selectedCards.length >= 2) return;
    const card = memoryCards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newCards = memoryCards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    setMemoryCards(newCards);

    const newSelected = [...selectedCards, id];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves((prev) => prev + 1);
      const card1 = memoryCards.find((c) => c.id === newSelected[0])!;
      const card2 = memoryCards.find((c) => c.id === newSelected[1])!;

      if (card1.matchId === card2.matchId) {
        // Matched!
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.matchId === card1.matchId ? { ...c, matched: true, flipped: true } : c
            )
          );
          setSelectedCards([]);

          // Check win
          const allMatched = memoryCards.every(
            (c) => c.matchId === card1.matchId || c.matched
          );
          if (allMatched) {
            setMemoryCompleted(true);
            showToast("Selamat! Semua kartu memori cocok!", "success");
            logActivity({
              title: "Menyelesaikan Memory Match Isyarat",
              description: `Menyelesaikan tebak pasangan kartu isyarat tingkat ${memoryDifficulty} dalam ${memoryMoves + 1} langkah`,
              category: "game",
              statusText: "Berhasil",
              statusBadge: "green",
              icon: "fa-solid fa-brain text-syarat",
            });
          }
        }, 500);
      } else {
        // Flip back
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.id === card1.id || c.id === card2.id ? { ...c, flipped: false } : c
            )
          );
          setSelectedCards([]);
        }, 900);
      }
    }
  };

  const activeLetterInSpelling = (currentWord && currentWord[currentLetterIdx]) || "A";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Game Arcade Hub Header & Mode Selector */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/30 inline-flex items-center gap-1.5 shadow-sm">
                  <i className="fa-solid fa-gamepad"></i> BISINDO Arcade Hub
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Pusat Game Edukasi BISINDO
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih mode permainan interaktif di bawah untuk mengasah penguasaan bahasa isyarat Anda.
              </p>
            </div>

            {/* Audio Master Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="px-3.5 py-2 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:border-tigpad transition-all shadow-sm"
              >
                <i
                  className={`fa-solid ${
                    soundEnabled ? "fa-volume-high text-tigpad" : "fa-volume-xmark text-slate-400"
                  }`}
                ></i>
                <span>Suara: {soundEnabled ? "On" : "Off"}</span>
              </button>
            </div>
          </div>

          {/* Game Mode Switcher Tabs */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("fingerspelling")}
              className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                activeTab === "fingerspelling"
                  ? "bg-gradient-to-r from-syarat to-tigpad text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-hands-asl-interpreting"></i>
              <span>1. BisindoSpelling Ejaan</span>
            </button>
            <button
              onClick={() => setActiveTab("rush")}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "rush"
                  ? "bg-gradient-to-r from-syarat to-tigpad text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-bolt text-amber-500"></i>
              <span>2. Sign Rush (Refleks)</span>
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "memory"
                  ? "bg-gradient-to-r from-syarat to-tigpad text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-clone text-emerald-500"></i>
              <span>3. Memory Match (Kartu)</span>
            </button>
          </div>
        </div>

        {/* ================= MODE 1: BISINDOSPELLING CHALLENGE ================= */}
        {activeTab === "fingerspelling" && (
          <section className="glass-card p-5 sm:p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-hands-asl-interpreting text-syarat dark:text-syarat-light"></i>
                  <span>BisindoSpelling Word Challenge</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Perhatikan animasi abjad BISINDO di kanvas, lalu ketik kata yang kamu lihat sebelum waktu habis.
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Skor Tertinggi Ejaan
                </span>
                <div className="text-sm font-black text-syarat dark:text-syarat-light">
                  {highScores[selectedDifficulty]} Poin
                </div>
              </div>
            </div>

            {spellingState === "menu" && (
              <div className="space-y-6 text-center max-w-lg mx-auto py-4">
                <div>
                  <h3 className="font-black text-xl mb-1">Pilih Tingkat Kesulitan</h3>
                  <p className="text-xs text-slate-500">
                    Pilih kategori kata untuk memulai putaran permainan:
                  </p>
                </div>

                <div className="level-select">
                  <button
                    onClick={() => setSelectedDifficulty("easy")}
                    className={`level-card ${selectedDifficulty === "easy" ? "selected" : ""}`}
                  >
                    <span className="level-name">Mudah</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.easy?.length ?? 0) > 0
                        ? `${gameWords.easy.length} kata tersedia`
                        : "Maaf Belum ada, segera dibuatin"}
                    </span>
                    <span className="level-highscore">
                      Skor tertinggi: {highScores.easy}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedDifficulty("medium")}
                    className={`level-card ${selectedDifficulty === "medium" ? "selected" : ""}`}
                  >
                    <span className="level-name">Sedang</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.medium?.length ?? 0) > 0
                        ? `${gameWords.medium.length} kata tersedia`
                        : "Maaf Belum ada, segera dibuatin"}
                    </span>
                    <span className="level-highscore">
                      Skor tertinggi: {highScores.medium}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedDifficulty("hard")}
                    className={`level-card ${selectedDifficulty === "hard" ? "selected" : ""}`}
                  >
                    <span className="level-name">Sulit</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.hard?.length ?? 0) > 0
                        ? `${gameWords.hard.length} kata tersedia`
                        : "Maaf Belum ada, segera dibuatin"}
                    </span>
                    <span className="level-highscore">
                      Skor tertinggi: {highScores.hard}
                    </span>
                  </button>
                </div>

                {/* Status jika sedang memuat atau jika data kata kosong */}
                {isLoadingWords ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                    <span className="loading loading-spinner loading-sm text-syarat"></span>
                    <span>Menghubungkan ke Supabase...</span>
                  </div>
                ) : (gameWords[selectedDifficulty]?.length ?? 0) === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-center space-y-1.5 max-w-md mx-auto">
                    <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm sm:text-base">
                      <i className="fa-regular fa-face-smile text-lg"></i>
                      <span>Maaf Belum ada, segera dibuatin</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kosakata untuk tingkat {selectedDifficulty === "easy" ? "Mudah" : selectedDifficulty === "medium" ? "Sedang" : "Sulit"} belum tersedia di server.
                    </p>
                  </div>
                ) : null}

                {/* Tombol Mulai */}
                {!isLoadingWords && (gameWords[selectedDifficulty]?.length ?? 0) === 0 ? (
                  <button
                    disabled
                    className="px-8 py-3.5 rounded-2xl font-extrabold text-sm bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <i className="fa-solid fa-ban"></i>
                    <span>Maaf Belum ada, segera dibuatin</span>
                  </button>
                ) : (
                  <button
                    onClick={startSpellingGame}
                    disabled={isLoadingWords}
                    className="btn-duotone px-8 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-play"></i>
                    <span>Mulai Bermain Ejaan</span>
                  </button>
                )}
              </div>
            )}

            {spellingState === "playing" && (
              <div className="space-y-4">
                {/* HUD */}
                <div className="hud">
                  <div className="hud-stat">
                    <span className="hud-label">Skor</span>
                    <span className="hud-value">{score}</span>
                  </div>
                  <div className="hud-stat">
                    <span className="hud-label">Combo</span>
                    <span className="hud-value combo">×{combo}</span>
                  </div>
                  <div className="hud-stat">
                    <span className="hud-label">Ronde</span>
                    <span className="hud-value">{round}/8</span>
                  </div>
                  <div className="hud-stat">
                    <span className="hud-label">Waktu</span>
                    <span className="hud-value text-tigpad">{roundTimer}s</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${
                        currentWord.length > 0
                          ? ((currentLetterIdx + 1) / currentWord.length) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                {/* Stage */}
                <div className="stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/sprites/${activeLetterInSpelling}.webp`}
                    alt={`Peraga ${activeLetterInSpelling}`}
                    className="max-h-56 sm:max-h-64 object-contain rounded-2xl shadow-xl transition-all"
                  />
                  <div className="stage-caption mt-2">
                    Huruf ke-{currentWord.length > 0 ? currentLetterIdx + 1 : 0} dari {currentWord.length}
                  </div>
                </div>

                {/* Form or feedback */}
                {!feedback ? (
                  <form onSubmit={handleSpellingSubmit} className="answer-form flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value.toUpperCase())}
                      placeholder="Ketik kata BISINDO yang kamu lihat..."
                      className="answer-input uppercase flex-1"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-duotone px-6 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span>Kirim Jawaban</span>
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                  </form>
                ) : (
                  <div className="feedback-panel">
                    <p
                      className={`feedback-message ${
                        feedback.success ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {feedback.msg}
                    </p>
                    <button
                      onClick={handleSpellingNextRound}
                      className="btn-duotone px-5 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Lanjut ▶
                    </button>
                  </div>
                )}

                {/* Virtual Keyboard */}
                <div className="pt-2">
                  <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-1.5">
                    {ALPHABET.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => setUserInput((prev) => prev + char)}
                        className="vkey"
                      >
                        {char}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUserInput((prev) => prev.slice(0, -1))}
                      className="vkey col-span-2 text-xs"
                    >
                      ⌫ Hapus
                    </button>
                  </div>
                </div>
              </div>
            )}

            {spellingState === "gameover" && (
              <div className="p-8 rounded-3xl text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-syarat to-tigpad text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-lg">
                  🎉
                </div>
                <h3 className="text-2xl font-black">Permainan Selesai!</h3>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-400 font-bold uppercase">Skor Akhir</div>
                  <div className="text-4xl font-black text-syarat dark:text-syarat-light mt-1">
                    {score}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={startSpellingGame}
                    className="btn-duotone flex-1 py-3 rounded-xl text-xs font-bold shadow-md"
                  >
                    Main Lagi
                  </button>
                  <button
                    onClick={() => setSpellingState("menu")}
                    className="px-4 py-3 rounded-xl glass-card text-xs font-bold"
                  >
                    Menu Utama
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= MODE 2: SIGN RUSH ================= */}
        {activeTab === "rush" && (
          <section className="glass-card p-5 sm:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
                  <i className="fa-solid fa-bolt"></i> Mode Refleks Cepat
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1">
                  Sign Rush: Tebak Isyarat Kilat
                </h2>
                <p className="text-xs text-slate-500">
                  Tebak huruf isyarat BISINDO secepat mungkin dalam batas waktu 4 detik per soal!
                </p>
              </div>
            </div>

            {!rushRunning && !rushGameOver && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-3xl mx-auto">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <h3 className="font-extrabold text-xl">Uji Kecepatan Refleks Isyarat</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Anda memiliki 3 nyawa. Waktu setiap soal adalah 4 detik. Pilih huruf yang benar!
                </p>
                <button
                  onClick={startSignRush}
                  className="btn-duotone px-8 py-3.5 rounded-2xl font-extrabold text-xs shadow-xl inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-play"></i>
                  <span>Mulai Sign Rush</span>
                </button>
              </div>
            )}

            {rushRunning && !rushGameOver && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-card p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nyawa</span>
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <i
                          key={i}
                          className={`fa-solid fa-heart ${i < rushLives ? "" : "opacity-20"}`}
                        ></i>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Skor</span>
                    <span className="font-black text-base text-syarat dark:text-syarat-light">
                      {rushScore}
                    </span>
                  </div>
                  <div className="glass-card p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ronde</span>
                    <span className="font-bold text-xs text-slate-600 dark:text-slate-300">
                      #{rushRound}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 h-full transition-all duration-300"
                    style={{ width: `${(rushTimer / 4) * 100}%` }}
                  ></div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[220px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/sprites/${rushTargetLetter}.webp`}
                    alt="Tebak Isyarat"
                    className="w-44 h-44 object-contain rounded-2xl drop-shadow-xl"
                  />
                  <div className="text-[11px] font-extrabold text-slate-500 mt-2">
                    Pilih huruf yang sesuai:
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {rushOptions.map((letter) => (
                    <button
                      key={letter}
                      onClick={() => handleRushAnswer(letter)}
                      className="p-4 rounded-2xl glass-card border font-black text-xl text-center hover:border-tigpad hover:bg-tigpad hover:text-white transition-all shadow-md active:scale-95"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rushGameOver && (
              <div className="p-8 rounded-3xl text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 text-3xl font-black flex items-center justify-center mx-auto">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <h3 className="text-2xl font-black">Sign Rush Selesai!</h3>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Skor Akhir</div>
                  <div className="text-3xl font-black text-amber-500 mt-1">{rushScore}</div>
                </div>
                <button
                  onClick={startSignRush}
                  className="btn-duotone w-full py-3 rounded-2xl font-bold text-xs shadow-xl"
                >
                  Main Sign Rush Lagi
                </button>
              </div>
            )}
          </section>
        )}

        {/* ================= MODE 3: MEMORY MATCH ================= */}
        {activeTab === "memory" && (
          <section className="glass-card p-5 sm:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 inline-flex items-center gap-1.5 shadow-sm">
                  <i className="fa-solid fa-clone"></i> Mode Kartu Memori 3D
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1">
                  Memory Match: Pasangan Isyarat
                </h2>
                <p className="text-xs text-slate-500">
                  Buka dan cocokkan kartu foto peraga tangan BISINDO dengan huruf abjad yang tepat.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs font-bold">
                <button
                  onClick={() => {
                    setMemoryDifficulty("easy");
                    initMemoryGame("easy");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    memoryDifficulty === "easy"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Mudah (6)
                </button>
                <button
                  onClick={() => {
                    setMemoryDifficulty("medium");
                    initMemoryGame("medium");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    memoryDifficulty === "medium"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Sedang (8)
                </button>
                <button
                  onClick={() => {
                    setMemoryDifficulty("hard");
                    initMemoryGame("hard");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    memoryDifficulty === "hard"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Sulit (10)
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
              <span>Langkah (Moves): {memoryMoves}</span>
              <button
                onClick={() => initMemoryGame()}
                className="px-3 py-1.5 rounded-xl glass-card hover:bg-slate-200 text-slate-700 dark:text-slate-300"
              >
                ↻ Acak Ulang
              </button>
            </div>

            {/* Memory Card Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {memoryCards.map((card) => {
                const isRevealed = card.flipped || card.matched;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    className="card-perspective h-28 sm:h-36 cursor-pointer"
                  >
                    <div
                      className={`flip-card-inner h-full w-full rounded-2xl ${
                        isRevealed ? "flipped" : ""
                      } ${card.matched ? "matched" : ""}`}
                    >
                      <div className="flip-card-front rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                        ?
                      </div>
                      <div className="flip-card-back rounded-2xl flex items-center justify-center p-2 shadow-md">
                        {card.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/assets/sprites/${card.value}.webp`}
                            alt={card.value}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-3xl font-black text-syarat dark:text-syarat-light">
                            {card.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
