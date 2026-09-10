"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseService } from "@/lib/supabaseService";
import { DBGameWord } from "@/types";
import { gameAudio } from "@/lib/gameAudio";
import WordBankModal from "@/components/WordBankModal";
import {
  getPlayerXP,
  addPlayerGamePoints,
  calculateGameLeaderboard,
  type GameRankTier,
} from "@/lib/gameRanking";

type GameMode = "fingerspelling" | "rush" | "memory";

export default function GamePage() {
  const { currentRole, currentUser, users, showToast, logActivity } = useApp();
  const isManager = currentRole === "mentor" || currentRole === "admin";

  const [activeTab, setActiveTab] = useState<GameMode>("fingerspelling");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Word Bank Data from Supabase
  const [gameWords, setGameWords] = useState<{ [key: string]: string[] }>({
    easy: [],
    medium: [],
    hard: [],
  });
  const [isLoadingWords, setIsLoadingWords] = useState(true);
  const [wordBankModalOpen, setWordBankModalOpen] = useState(false);
  const [allWordItems, setAllWordItems] = useState<DBGameWord[]>([]);

  // Player Arcade XP & Gamification (Murni Poin Game, Terpisah dari Nilai Kuis)
  const [playerXP, setPlayerXP] = useState<number>(() => getPlayerXP());

  // Dengarkan event pembaruan skor game secara real-time
  useEffect(() => {
    const handleScoreUpdate = (e: any) => {
      if (e.detail?.newTotalXP !== undefined) {
        setPlayerXP(e.detail.newTotalXP);
      } else {
        setPlayerXP(getPlayerXP());
      }
    };
    window.addEventListener("kolab_game_score_updated", handleScoreUpdate);
    window.addEventListener("storage", handleScoreUpdate);
    return () => {
      window.removeEventListener("kolab_game_score_updated", handleScoreUpdate);
      window.removeEventListener("storage", handleScoreUpdate);
    };
  }, []);

  // Perolehan Poin Game Murni (TIDAK mengubah ataupun mencemari nilai kuis evaluasi)
  const awardScoreToUser = (points: number) => {
    const nextXP = addPlayerGamePoints(currentUser.id, points);
    setPlayerXP(nextXP);
  };

  // =========================================================================
  // SISTEM RANKING DINAMIS BERDASARKAN POIN GAME SELURUH PESERTA
  // =========================================================================
  const gameSummary = calculateGameLeaderboard(users, currentUser, playerXP);
  const { myRank, myTier: currentRankTier, betterThanPercent, totalParticipants } = gameSummary;

  // Toggle Sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    gameAudio.enabled = next;
    if (next) gameAudio.playClick();
  };

  // Load Game Words from Supabase
  const reloadGameWords = async () => {
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
  };

  const fetchWordBank = async () => {
    try {
      const words = await SupabaseService.getAllGameWords();
      setAllWordItems(words);
    } catch (e) {
      console.warn("Gagal memuat daftar kata:", e);
    }
  };

  useEffect(() => {
    reloadGameWords();
    if (isManager) {
      fetchWordBank();
    }
  }, [isManager]);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // =========================================================================
  // MODE 1: BISINDO WORD QUEST (INTERAKTIF & KOTAK KATA)
  // =========================================================================
  const [spellingState, setSpellingState] = useState<"menu" | "playing" | "gameover">("menu");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [currentWord, setCurrentWord] = useState("");
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [isPlayingAnim, setIsPlayingAnim] = useState(true);
  const [animSpeed, setAnimSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [userInput, setUserInput] = useState("");
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [round, setRound] = useState(1);
  const [roundTimer, setRoundTimer] = useState(30);
  const [feedback, setFeedback] = useState<{
    msg: string;
    success: boolean;
    word?: string;
  } | null>(null);

  const [highScores, setHighScores] = useState({ easy: 450, medium: 520, hard: 680 });

  const speedDuration = animSpeed === "slow" ? 2200 : animSpeed === "normal" ? 1300 : 700;

  // Mode 1: Timer
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

  // Mode 1: Animasi Pergantian Huruf
  useEffect(() => {
    let animTimer: NodeJS.Timeout;
    if (
      spellingState === "playing" &&
      !feedback &&
      isPlayingAnim &&
      currentWord &&
      currentWord.length > 0
    ) {
      animTimer = setInterval(() => {
        setCurrentLetterIdx((prev) => (prev + 1) % currentWord.length);
      }, speedDuration);
    }
    return () => clearInterval(animTimer);
  }, [spellingState, currentWord, feedback, isPlayingAnim, speedDuration]);

  const startSpellingGame = () => {
    const words = gameWords[selectedDifficulty] || [];
    if (!words || words.length === 0) {
      showToast("Kosakata level ini belum ada, silakan tambahkan di Bank Kata.", "info");
      return;
    }
    const firstWord = words[Math.floor(Math.random() * words.length)].toUpperCase().trim();
    setCurrentWord(firstWord);
    setCurrentLetterIdx(0);
    setIsPlayingAnim(true);
    setUserInput("");
    setRevealedHints([]);
    setScore(0);
    setCombo(0);
    setRound(1);
    setRoundTimer(selectedDifficulty === "easy" ? 35 : selectedDifficulty === "medium" ? 30 : 25);
    setFeedback(null);
    setSpellingState("playing");
    gameAudio.playClick();
  };

  const handleSpellingTimeout = () => {
    setCombo(0);
    gameAudio.playWrong();
    setFeedback({
      msg: `Waktu Habis! Jawaban yang tepat: ${currentWord}`,
      success: false,
      word: currentWord,
    });
  };

  const handleSpellingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    if (userInput.trim().toUpperCase() === currentWord) {
      const bonusCombo = combo * 25;
      const addedScore = 100 + bonusCombo;
      const newScore = score + addedScore;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      awardScoreToUser(addedScore);

      gameAudio.playCorrect();
      gameAudio.playCombo(newCombo);

      setFeedback({
        msg: `Hebat Sekali! Jawaban Tepat: ${currentWord} (+${addedScore} Poin)`,
        success: true,
        word: currentWord,
      });
    } else {
      setCombo(0);
      gameAudio.playWrong();
      setFeedback({
        msg: `Kurang Tepat! Jawaban sebenarnya: ${currentWord}`,
        success: false,
        word: currentWord,
      });
    }
  };

  const handlePrevLetter = () => {
    if (!currentWord) return;
    setIsPlayingAnim(false);
    setCurrentLetterIdx((prev) => (prev - 1 + currentWord.length) % currentWord.length);
    gameAudio.playClick();
  };

  const handleNextLetter = () => {
    if (!currentWord) return;
    setIsPlayingAnim(false);
    setCurrentLetterIdx((prev) => (prev + 1) % currentWord.length);
    gameAudio.playClick();
  };

  const handleJumpToLetter = (idx: number) => {
    setIsPlayingAnim(false);
    setCurrentLetterIdx(idx);
    gameAudio.playClick();
  };

  const handleUseHint = () => {
    if (!currentWord) return;
    const unrevealed: number[] = [];
    currentWord.split("").forEach((_, idx) => {
      if (!revealedHints.includes(idx)) {
        unrevealed.push(idx);
      }
    });

    if (unrevealed.length === 0) {
      showToast("Semua huruf sudah terbuka!", "info");
      return;
    }

    const chosenIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newRevealed = [...revealedHints, chosenIdx];
    setRevealedHints(newRevealed);

    let chars = userInput.padEnd(currentWord.length, " ").split("");
    chars[chosenIdx] = currentWord[chosenIdx];
    setUserInput(chars.join("").trimEnd());

    setScore((prev) => Math.max(0, prev - 15));
    gameAudio.playClick();
    showToast(`Bantuan dipakai (-15 Poin): Huruf ke-${chosenIdx + 1} adalah "${currentWord[chosenIdx]}"!`, "info");
  };

  const handleSpellingNextRound = () => {
    if (round >= 6) {
      const curHigh = highScores[selectedDifficulty];
      if (score > curHigh) {
        setHighScores((prev) => ({ ...prev, [selectedDifficulty]: score }));
      }
      setSpellingState("gameover");
      gameAudio.playFanfare();
      logActivity({
        title: "Bermain Game BISINDO Word Quest",
        description: `Menyelesaikan tebak ejaan isyarat level ${selectedDifficulty} skor ${score} poin`,
        category: "game",
        statusText: `${score} Poin`,
        statusBadge: "purple",
        icon: "fa-solid fa-gamepad text-purple-500",
      });
      return;
    }

    const words = gameWords[selectedDifficulty] || [];
    if (!words || words.length === 0) {
      setSpellingState("menu");
      return;
    }

    const nextWord = words[Math.floor(Math.random() * words.length)].toUpperCase().trim();
    setCurrentWord(nextWord);
    setCurrentLetterIdx(0);
    setIsPlayingAnim(true);
    setUserInput("");
    setRevealedHints([]);
    setRound((prev) => prev + 1);
    setRoundTimer(selectedDifficulty === "easy" ? 35 : selectedDifficulty === "medium" ? 30 : 25);
    setFeedback(null);
    gameAudio.playClick();
  };

  const activeLetterInSpelling = (currentWord && currentWord[currentLetterIdx]) || "A";

  // =========================================================================
  // MODE 2: SIGN RUSH 2.0 (REFLEKS KILAT DENGAN OPSI WAKTU & FEVER COMBO 🔥)
  // =========================================================================
  const [rushRunning, setRushRunning] = useState(false);
  const [rushGameOver, setRushGameOver] = useState(false);
  const [rushSubMode, setRushSubMode] = useState<"guess_letter" | "guess_sign" | "mix">("guess_letter");
  const rushDuration = 3; // Fixed 3 detik per soal!
  const [rushCurrentType, setRushCurrentType] = useState<"guess_letter" | "guess_sign">("guess_letter");
  const [rushTargetLetter, setRushTargetLetter] = useState("A");
  const [rushOptions, setRushOptions] = useState<string[]>(["A", "B", "C", "D"]);
  const [rushScore, setRushScore] = useState(0);
  const [rushLives, setRushLives] = useState(3);
  const [rushRound, setRushRound] = useState(1);
  const [rushTimer, setRushTimer] = useState(3);
  const [rushStreak, setRushStreak] = useState(0);

  const nextRushQuestion = () => {
    const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const otherLetters = ALPHABET.filter((l) => l !== target)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const opts = [target, ...otherLetters].sort(() => 0.5 - Math.random());

    let type: "guess_letter" | "guess_sign" =
      rushSubMode === "mix"
        ? Math.random() > 0.5
          ? "guess_letter"
          : "guess_sign"
        : rushSubMode;

    setRushTargetLetter(target);
    setRushOptions(opts);
    setRushCurrentType(type);
    setRushTimer(3);
  };

  const startSignRush = () => {
    setRushScore(0);
    setRushLives(3);
    setRushRound(1);
    setRushStreak(0);
    setRushGameOver(false);
    setRushRunning(true);
    nextRushQuestion();
    gameAudio.playClick();
  };

  // Tombol Nyerah Sign Rush
  const handleSurrenderRush = () => {
    setRushRunning(false);
    setRushGameOver(true);
    gameAudio.playWrong();
    showToast(`Kamu menyerah di ronde #${rushRound}. Skor akhir: ${rushScore} Poin`, "info");
    logActivity({
      title: "Menyerah di Sign Rush",
      description: `Menyerah di ronde #${rushRound} dengan perolehan skor ${rushScore} poin (Tantangan 3 Detik)`,
      category: "game",
      statusText: `${rushScore} Poin`,
      statusBadge: "amber",
      icon: "fa-solid fa-flag text-red-500",
    });
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
      const multiplier = rushStreak >= 4 ? 3 : rushStreak >= 2 ? 2 : 1;
      const pointsAdded = 60 * multiplier;

      setRushScore((prev) => prev + pointsAdded);
      const newStreak = rushStreak + 1;
      setRushStreak(newStreak);
      setRushRound((prev) => prev + 1);
      awardScoreToUser(pointsAdded);

      gameAudio.playCorrect();
      if (newStreak >= 2) gameAudio.playCombo(newStreak);

      nextRushQuestion();
    } else {
      gameAudio.playWrong();
      setRushStreak(0);
      const nextLives = rushLives - 1;
      setRushLives(nextLives);
      if (nextLives <= 0) {
        setRushGameOver(true);
        setRushRunning(false);
        gameAudio.playFanfare();
        logActivity({
          title: "Bermain Sign Rush 2.0",
          description: `Mencapai ronde #${rushRound} dengan perolehan skor ${rushScore} poin (Tantangan 3 Detik)`,
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

  // =========================================================================
  // MODE 3: MEMORY MATCH 3D (PASANGAN ISYARAT & ABJAD)
  // =========================================================================
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
    gameAudio.playClick();
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

    gameAudio.playClick();

    const newCards = memoryCards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    setMemoryCards(newCards);

    const newSelected = [...selectedCards, id];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves((prev) => prev + 1);
      const card1 = memoryCards.find((c) => c.id === newSelected[0])!;
      const card2 = memoryCards.find((c) => c.id === newSelected[1])!;

      if (card1.matchId === card2.matchId) {
        setTimeout(() => {
          gameAudio.playCorrect();
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.matchId === card1.matchId ? { ...c, matched: true, flipped: true } : c
            )
          );
          setSelectedCards([]);

          const allMatched = memoryCards.every(
            (c) => c.matchId === card1.matchId || c.matched
          );
          if (allMatched) {
            awardScoreToUser(75);
            gameAudio.playFanfare();
            showToast("Hebat! Semua kartu berhasil dicocokkan! (+75 Poin)", "success");
            logActivity({
              title: "Menyelesaikan Memory Match Isyarat",
              description: `Menyelesaikan tebak pasangan kartu isyarat tingkat ${memoryDifficulty} dalam ${memoryMoves + 1} langkah`,
              category: "game",
              statusText: "Berhasil",
              statusBadge: "green",
              icon: "fa-solid fa-brain text-syarat",
            });
          }
        }, 400);
      } else {
        setTimeout(() => {
          gameAudio.playWrong();
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.id === card1.id || c.id === card2.id ? { ...c, flipped: false } : c
            )
          );
          setSelectedCards([]);
        }, 850);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* HUB ARCADE HEADER: SISTEM RANK BERDASARKAN JUMLAH PESERTA & XP             */}
        {/* ========================================================================= */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-gradient-to-bl from-syarat/10 via-tigpad/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-syarat via-blue-600 to-tigpad text-white flex items-center justify-center text-xl shadow-lg flex-shrink-0">
                <i className="fa-solid fa-gamepad"></i>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-tigpad/15 text-tigpad text-[10px] font-extrabold uppercase tracking-wide">
                    Arcade Edukasi BISINDO
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm ${currentRankTier.badge}`}>
                    <i className={currentRankTier.icon}></i>
                    <span>{currentRankTier.title} ({currentRankTier.tierName})</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
                  Taman Bermain & Latihan Isyarat
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Uji ketangkasan membaca gerakan isyarat BISINDO dan raih peringkat tertinggi di antara seluruh peserta!
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-center justify-end">
              {/* Tombol Menuju Papan Peringkat Game Terdedikasi */}
              <Link
                href="/ranking-game"
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-amber-500/40 shadow-sm"
                title="Buka halaman Papan Peringkat Game & Klasemen Peserta"
              >
                <i className="fa-solid fa-trophy text-amber-500"></i>
                <span>Ranking Game ({totalParticipants})</span>
              </Link>

              {/* Tombol Kelola Bank Kata untuk Mentor/Admin */}
              {isManager && (
                <button
                  type="button"
                  onClick={() => {
                    setWordBankModalOpen(true);
                    fetchWordBank();
                    gameAudio.playClick();
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-500/30 shadow-sm"
                  title="Kelola kosakata kuis spelling"
                >
                  <i className="fa-solid fa-book-bookmark text-purple-500"></i>
                  <span>Bank Kata</span>
                </button>
              )}

              {/* Sound Effect Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={`p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                  soundEnabled
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                }`}
                title={soundEnabled ? "Suara Aktif (Klik untuk Mute)" : "Suara Muted (Klik untuk Bunyi)"}
              >
                <i className={`fa-solid ${soundEnabled ? "fa-volume-high" : "fa-volume-xmark"}`}></i>
              </button>

              {/* XP Badge */}
              <div className="px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-amber-500 flex items-center gap-1.5 shadow-inner">
                <i className="fa-solid fa-bolt text-amber-500"></i>
                <span>{playerXP} XP</span>
              </div>
            </div>
          </div>

          {/* STANDING BAR: PERINGKAT DARI JUMLAH PESERTA */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                #{myRank}
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Peringkat ke-<strong>{myRank}</strong> dari <strong>{totalParticipants} Peserta</strong></span>
                  <span className="text-[10px] text-slate-400 font-normal">({currentRankTier.levelText})</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {betterThanPercent > 0 ? (
                    <>Ketangkasan isyarat kamu lebih unggul dari <span className="font-bold text-emerald-600 dark:text-emerald-400">{betterThanPercent}%</span> seluruh peserta!</>
                  ) : (
                    <>Raih poin di permainan untuk melesat naik di klasemen peserta!</>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Standing Progress Bar */}
            <div className="w-full sm:w-56 flex flex-col gap-1 items-end">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-syarat to-tigpad h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, 100 - (myRank / totalParticipants) * 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  Total: {playerXP} XP
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Link
                  href="/ranking-game"
                  className="font-extrabold text-syarat hover:underline flex items-center gap-0.5"
                >
                  <span>Buka Ranking Game</span>
                  <i className="fa-solid fa-arrow-right text-[8px]"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* GAME MODE TABS (3 MODE SERU) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab("fingerspelling");
                gameAudio.playClick();
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === "fingerspelling"
                  ? "bg-gradient-to-r from-syarat to-blue-600 text-white shadow-md scale-[1.01]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-spell-check text-sm"></i>
              <span>1. Word Quest (Tebak Ejaan)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("rush");
                gameAudio.playClick();
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === "rush"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md scale-[1.01]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-bolt text-sm"></i>
              <span>2. Sign Rush 2.0 (Refleks Kilat)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("memory");
                gameAudio.playClick();
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === "memory"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-[1.01]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <i className="fa-solid fa-clone text-sm"></i>
              <span>3. Memory Match 3D</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: BISINDO WORD QUEST (TEBAK KATA INTERAKTIF)                        */}
        {/* ========================================================================= */}
        {activeTab === "fingerspelling" && (
          <section className="glass-card p-5 sm:p-7 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-spell-check text-syarat"></i>
                  <span>Bisindo Word Quest</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Perhatikan gerakan abjad tangan, kendalikan animasi sesuai tempo, dan susun kata yang benar!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Skor Tertinggi:</span>
                <span className="px-2.5 py-1 rounded-xl bg-syarat/10 text-syarat font-black text-xs">
                  {highScores[selectedDifficulty]} Poin
                </span>
              </div>
            </div>

            {spellingState === "menu" && (
              <div className="space-y-6 text-center max-w-lg mx-auto py-4">
                <div>
                  <h3 className="font-black text-xl mb-1">Pilih Tingkat Kesulitan Kata</h3>
                  <p className="text-xs text-slate-500">
                    Pilih kategori panjang kata untuk memulai putaran tantangan:
                  </p>
                </div>

                <div className="level-select">
                  <button
                    onClick={() => {
                      setSelectedDifficulty("easy");
                      gameAudio.playClick();
                    }}
                    className={`level-card ${selectedDifficulty === "easy" ? "selected" : ""}`}
                  >
                    <span className="level-name">Mudah</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.easy?.length ?? 0) > 0
                        ? `${gameWords.easy.length} kata (3-4 huruf)`
                        : "Belum ada kata"}
                    </span>
                    <span className="level-highscore">Skor tertinggi: {highScores.easy}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDifficulty("medium");
                      gameAudio.playClick();
                    }}
                    className={`level-card ${selectedDifficulty === "medium" ? "selected" : ""}`}
                  >
                    <span className="level-name">Sedang</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.medium?.length ?? 0) > 0
                        ? `${gameWords.medium.length} kata (5-6 huruf)`
                        : "Belum ada kata"}
                    </span>
                    <span className="level-highscore">Skor tertinggi: {highScores.medium}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedDifficulty("hard");
                      gameAudio.playClick();
                    }}
                    className={`level-card ${selectedDifficulty === "hard" ? "selected" : ""}`}
                  >
                    <span className="level-name">Sulit</span>
                    <span className="level-desc">
                      {isLoadingWords
                        ? "Memuat data..."
                        : (gameWords.hard?.length ?? 0) > 0
                        ? `${gameWords.hard.length} kata (7+ huruf)`
                        : "Belum ada kata"}
                    </span>
                    <span className="level-highscore">Skor tertinggi: {highScores.hard}</span>
                  </button>
                </div>

                {!isLoadingWords && (gameWords[selectedDifficulty]?.length ?? 0) === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-700 dark:text-amber-300">
                    Kosakata tingkat {selectedDifficulty} masih kosong di database.
                    {isManager && " Silakan buka 'Bank Kata' di atas untuk menambah atau mengisi kosakata standar."}
                  </div>
                ) : (
                  <button
                    onClick={startSpellingGame}
                    disabled={isLoadingWords}
                    className="btn-duotone px-8 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2"
                  >
                    <i className="fa-solid fa-play"></i>
                    <span>Mulai Main Word Quest</span>
                  </button>
                )}
              </div>
            )}

            {spellingState === "playing" && (
              <div className="space-y-5">
                {/* HUD Panel */}
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
                    <span className="hud-value">{round}/6</span>
                  </div>
                  <div className="hud-stat">
                    <span className="hud-label">Waktu</span>
                    <span className={`hud-value ${roundTimer <= 5 ? "timer-warning" : ""}`}>
                      {roundTimer}s
                    </span>
                  </div>
                </div>

                {/* ANIMATION CONTROLLER TOOLBAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevLetter}
                      className="p-2 rounded-xl glass-card hover:bg-slate-200 text-xs font-bold transition"
                      title="Huruf sebelumnya"
                    >
                      <i className="fa-solid fa-backward-step"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingAnim(!isPlayingAnim);
                        gameAudio.playClick();
                      }}
                      className="px-3 py-2 rounded-xl btn-duotone text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <i className={`fa-solid ${isPlayingAnim ? "fa-pause" : "fa-play"}`}></i>
                      <span>{isPlayingAnim ? "Jeda Animasi" : "Putar Animasi"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextLetter}
                      className="p-2 rounded-xl glass-card hover:bg-slate-200 text-xs font-bold transition"
                      title="Huruf selanjutnya"
                    >
                      <i className="fa-solid fa-forward-step"></i>
                    </button>
                  </div>

                  {/* Pengatur Kecepatan Animasi */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 font-bold mr-1 text-[11px]">Tempo:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAnimSpeed("slow");
                        gameAudio.playClick();
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition ${
                        animSpeed === "slow" ? "bg-syarat text-white shadow" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      🐢 Lambat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnimSpeed("normal");
                        gameAudio.playClick();
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition ${
                        animSpeed === "normal" ? "bg-syarat text-white shadow" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      🚶 Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnimSpeed("fast");
                        gameAudio.playClick();
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold transition ${
                        animSpeed === "fast" ? "bg-syarat text-white shadow" : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      ⚡ Kilat
                    </button>
                  </div>

                  {/* Bantuan Bocoran Huruf */}
                  <button
                    type="button"
                    onClick={handleUseHint}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition border border-amber-500/30"
                    title="Buka 1 huruf bocoran (-15 poin)"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
                    <span>Bocoran 1 Huruf (-15p)</span>
                  </button>
                </div>

                {/* STAGE TAMPILAN PERAGA ISYARAT */}
                <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="relative flex flex-col items-center justify-center min-h-[220px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/assets/sprites/${activeLetterInSpelling}.webp`}
                      alt={`Isyarat ${activeLetterInSpelling}`}
                      className="max-h-52 sm:max-h-60 object-contain rounded-2xl drop-shadow-2xl transition-all duration-200"
                    />

                    <div className="mt-3 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat font-extrabold text-xs">
                        Huruf ke-{currentLetterIdx + 1} dari {currentWord.length}
                      </span>
                    </div>
                  </div>

                  {/* TIMELINE DOTS */}
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {currentWord.split("").map((_, idx) => {
                      const isActive = idx === currentLetterIdx;
                      const isRevealed = revealedHints.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleJumpToLetter(idx)}
                          className={`w-8 h-8 rounded-xl font-black text-xs transition-all flex items-center justify-center ${
                            isActive
                              ? "bg-syarat text-white ring-2 ring-syarat shadow-md scale-110"
                              : isRevealed
                              ? "bg-amber-500/20 text-amber-700 border border-amber-500/40"
                              : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-slate-400"
                          }`}
                          title={`Lihat huruf ke-${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* KOTAK KATA INTERAKTIF (LETTER SLOTS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>Kotak Kata ({currentWord.length} Huruf):</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Ketik langsung lewat keyboard atau tombol huruf di bawah
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap py-2">
                    {currentWord.split("").map((correctChar, idx) => {
                      const userChar = userInput[idx] || "";
                      const isCurrentActive = idx === currentLetterIdx;
                      const isHinted = revealedHints.includes(idx);

                      return (
                        <div
                          key={idx}
                          onClick={() => handleJumpToLetter(idx)}
                          className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-black text-xl sm:text-2xl cursor-pointer transition-all ${
                            isCurrentActive
                              ? "border-2 border-syarat bg-syarat/10 ring-2 ring-syarat/30 shadow-md scale-105 text-syarat"
                              : userChar
                              ? "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                              : "border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400"
                          }`}
                        >
                          <span>{userChar || (isHinted ? correctChar : "_")}</span>
                          {isHinted && (
                            <span className="text-[9px] text-amber-500 font-bold mt-[-2px]">★</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FORM INPUT TEKS / SUBMIT */}
                {!feedback ? (
                  <form onSubmit={handleSpellingSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                      placeholder={`Ketik kata ${currentWord.length} huruf yang kamu amati...`}
                      maxLength={currentWord.length}
                      className="answer-input uppercase flex-1 text-center font-black tracking-widest text-lg"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-duotone px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span>Kirim Jawaban</span>
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-slide-up">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-black text-sm ${feedback.success ? "text-emerald-600" : "text-red-500"}`}>
                        <i className={`fa-solid ${feedback.success ? "fa-circle-check" : "fa-circle-xmark"} mr-1.5`}></i>
                        {feedback.msg}
                      </p>
                      <button
                        onClick={handleSpellingNextRound}
                        className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <span>Lanjut Ronde Berikutnya</span>
                        <i className="fa-solid fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* VIRTUAL KEYBOARD DENGAN SUARA KLIK */}
                <div className="pt-1">
                  <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-13 gap-1.5">
                    {ALPHABET.map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => {
                          if (userInput.length < currentWord.length) {
                            setUserInput((prev) => prev + char);
                            gameAudio.playClick();
                          }
                        }}
                        className="vkey"
                      >
                        {char}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setUserInput((prev) => prev.slice(0, -1));
                        gameAudio.playClick();
                      }}
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
                <h3 className="text-2xl font-black">Word Quest Selesai!</h3>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-400 font-bold uppercase">Skor Total Diperoleh</div>
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
                    Pilih Level
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: SIGN RUSH 2.0 (REFLEKS KILAT + PILIHAN WAKTU & FEVER STREAK 🔥)  */}
        {/* ========================================================================= */}
        {activeTab === "rush" && (
          <section className="glass-card p-5 sm:p-7 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
                  <i className="fa-solid fa-bolt"></i> Mode Refleks Cepat & Streak Api
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1 text-slate-800 dark:text-white">
                  Sign Rush 2.0: Tebak Kilat Isyarat
                </h2>
                <p className="text-xs text-slate-500">
                  Uji kecepatan refleks visualmu! Jawab secepatnya sebelum batas waktu habis dan picu FEVER MODE 🔥.
                </p>
              </div>

              {/* Sub-Mode Selector */}
              {!rushRunning && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRushSubMode("guess_letter")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      rushSubMode === "guess_letter" ? "bg-amber-500 text-white shadow" : "text-slate-500"
                    }`}
                  >
                    🔤 Tebak Huruf
                  </button>
                  <button
                    type="button"
                    onClick={() => setRushSubMode("guess_sign")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      rushSubMode === "guess_sign" ? "bg-amber-500 text-white shadow" : "text-slate-500"
                    }`}
                  >
                    🖐️ Tebak Isyarat
                  </button>
                  <button
                    type="button"
                    onClick={() => setRushSubMode("mix")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      rushSubMode === "mix" ? "bg-amber-500 text-white shadow" : "text-slate-500"
                    }`}
                  >
                    🎲 Campuran
                  </button>
                </div>
              )}
            </div>

            {!rushRunning && !rushGameOver && (
              <div className="text-center py-6 space-y-5 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-xl">Tantangan Refleks Isyarat 3 Detik! ⚡</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Uji refleks visualmu secepat kilat! Kamu hanya punya <strong>3 detik per soal</strong> dan 3 nyawa (❤️ ❤️ ❤️). Raih streak combo untuk memicu <strong>FEVER MODE 🔥</strong>!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-info text-amber-500"></i>
                  <span>Merasa kewalahan di tengah jalan? Tenang, tersedia tombol <strong>Nyerah</strong> sewaktu-waktu!</span>
                </div>

                <button
                  onClick={startSignRush}
                  className="btn-duotone px-8 py-3.5 rounded-2xl font-extrabold text-xs shadow-xl inline-flex items-center gap-2 hover:scale-105 transition"
                >
                  <i className="fa-solid fa-play"></i>
                  <span>Mulai Sign Rush (3 Detik per Soal)</span>
                </button>
              </div>
            )}

            {rushRunning && !rushGameOver && (
              <div className="space-y-5">
                {/* Stats Header */}
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nyawa</span>
                    <div className="flex items-center gap-1 text-sm text-red-500 mt-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <i
                          key={i}
                          className={`fa-solid fa-heart ${i < rushLives ? "text-red-500" : "text-slate-300 dark:text-slate-700"}`}
                        ></i>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Skor</span>
                    <span className="font-black text-base text-amber-500">
                      {rushScore}
                    </span>
                  </div>

                  <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ronde</span>
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      #{rushRound}
                    </span>
                  </div>

                  <div className={`glass-card p-3 rounded-2xl flex flex-col items-center justify-center ${
                    rushStreak >= 3 ? "bg-amber-500/20 border-amber-500/40 animate-pulse" : ""
                  }`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Streak</span>
                    <span className="font-black text-xs text-orange-500 flex items-center gap-1">
                      {rushStreak >= 3 ? "🔥" : ""} {rushStreak}x
                    </span>
                  </div>
                </div>

                {/* FEVER MODE BANNER */}
                {rushStreak >= 3 && (
                  <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs text-center shadow-lg flex items-center justify-center gap-2">
                    <i className="fa-solid fa-fire text-amber-200 animate-bounce"></i>
                    <span>FEVER MODE AKTIF! Poin ×{rushStreak >= 5 ? "3" : "2"} Berlipat Ganda!</span>
                    <i className="fa-solid fa-fire text-amber-200 animate-bounce"></i>
                  </div>
                )}

                {/* ANIMATED COUNTDOWN TIMER BAR */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold px-1">
                    <span className="text-slate-400 text-[11px]">Sisa Waktu Berpikir:</span>
                    <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                      rushTimer <= 1
                        ? "bg-red-500 text-white animate-pulse"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      ⏱️ {rushTimer}s / 3s
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-300 ${
                        rushTimer <= 1
                          ? "bg-red-500 animate-pulse"
                          : rushTimer <= 2
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500"
                      }`}
                      style={{ width: `${(rushTimer / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* TARGET TAMPILAN SOAL */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[220px]">
                  {rushCurrentType === "guess_letter" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/assets/sprites/${rushTargetLetter}.webp`}
                        alt="Tebak Isyarat"
                        className="w-40 h-40 object-contain drop-shadow-xl"
                      />
                      <span className="text-xs font-black text-slate-500 mt-2">
                        Pilih huruf abjad yang sesuai dengan isyarat tangan di atas:
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-32 rounded-3xl bg-white dark:bg-slate-950 border-2 border-syarat flex items-center justify-center text-6xl font-black text-syarat shadow-inner">
                        {rushTargetLetter}
                      </div>
                      <span className="text-xs font-black text-slate-500 mt-3">
                        Pilih foto peraga isyarat yang benar untuk huruf &quot;{rushTargetLetter}&quot;:
                      </span>
                    </>
                  )}
                </div>

                {/* PILIHAN JAWABAN (4 KARTU) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {rushOptions.map((letter) => {
                    return rushCurrentType === "guess_letter" ? (
                      <button
                        key={letter}
                        onClick={() => handleRushAnswer(letter)}
                        className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-700 font-black text-2xl text-center hover:border-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-md active:scale-95 text-slate-800 dark:text-slate-100"
                      >
                        {letter}
                      </button>
                    ) : (
                      <button
                        key={letter}
                        onClick={() => handleRushAnswer(letter)}
                        className="p-3 rounded-2xl glass-card border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center hover:border-amber-500 hover:bg-amber-500/10 transition-all shadow-md active:scale-95"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/sprites/${letter}.webp`}
                          alt={`Opsi ${letter}`}
                          className="w-20 h-20 object-contain drop-shadow"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* TOMBOL NYERAH */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleSurrenderRush}
                    className="px-5 py-2.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm"
                    title="Menyerah dan akhiri permainan Sign Rush"
                  >
                    <i className="fa-solid fa-flag"></i>
                    <span>🏳️ Nyerah (Akhiri Permainan)</span>
                  </button>
                </div>
              </div>
            )}

            {rushGameOver && (
              <div className="p-8 rounded-3xl text-center space-y-4 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 text-3xl font-black flex items-center justify-center mx-auto shadow-inner">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <h3 className="text-2xl font-black">Sign Rush Selesai!</h3>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Skor Akhir Diraih</div>
                  <div className="text-3xl font-black text-amber-500 mt-1">{rushScore} Poin</div>
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

        {/* ========================================================================= */}
        {/* MODE 3: MEMORY MATCH 3D (PASANGAN ISYARAT)                                */}
        {/* ========================================================================= */}
        {activeTab === "memory" && (
          <section className="glass-card p-5 sm:p-7 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 inline-flex items-center gap-1.5 shadow-sm">
                  <i className="fa-solid fa-clone"></i> Mode Kartu Memori 3D
                </span>
                <h2 className="text-xl font-black tracking-tight mt-1 text-slate-800 dark:text-white">
                  Memory Match: Pasangan Isyarat
                </h2>
                <p className="text-xs text-slate-500">
                  Buka dan cocokkan kartu foto peraga tangan BISINDO dengan abjad yang tepat.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => {
                    setMemoryDifficulty("easy");
                    initMemoryGame("easy");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    memoryDifficulty === "easy" ? "bg-emerald-600 text-white shadow" : "text-slate-500"
                  }`}
                >
                  Mudah (6 Pasang)
                </button>
                <button
                  onClick={() => {
                    setMemoryDifficulty("medium");
                    initMemoryGame("medium");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    memoryDifficulty === "medium" ? "bg-emerald-600 text-white shadow" : "text-slate-500"
                  }`}
                >
                  Sedang (8 Pasang)
                </button>
                <button
                  onClick={() => {
                    setMemoryDifficulty("hard");
                    initMemoryGame("hard");
                  }}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    memoryDifficulty === "hard" ? "bg-emerald-600 text-white shadow" : "text-slate-500"
                  }`}
                >
                  Sulit (10 Pasang)
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-slate-500 px-1">
              <span>Jumlah Percobaan: <strong>{memoryMoves} Langkah</strong></span>
              <button
                onClick={() => initMemoryGame()}
                className="px-3 py-1.5 rounded-xl glass-card border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                      <div className="flip-card-front rounded-2xl flex items-center justify-center text-2xl font-black shadow-md bg-gradient-to-tr from-emerald-600 to-teal-700 text-white">
                        <i className="fa-solid fa-hands text-xl opacity-75"></i>
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
                          <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
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


      {/* Modal Kelola Bank Kata untuk Mentor/Admin */}
      {isManager && (
        <WordBankModal
          isOpen={wordBankModalOpen}
          onClose={() => setWordBankModalOpen(false)}
          allWordItems={allWordItems}
          fetchWordBank={fetchWordBank}
          reloadGameWords={reloadGameWords}
          showToast={showToast}
          logActivity={logActivity}
        />
      )}
    </DashboardLayout>
  );
}
