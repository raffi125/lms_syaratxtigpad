// ==============================================================================
// KOLAB SYARAT X TIGPAD - GAME RANKING & ARCADE XP SYSTEM (PRODUCTION)
// ==============================================================================
// Sistem papan peringkat game murni berbasis Poin Game (XP) ketangkasan isyarat,
// terpisah total dari Nilai Kuis Evaluasi (0-100) dan Laporan/Analitik.
// ==============================================================================

import type { User } from "@/types";

export interface GameRankTier {
  title: string;
  tierName: string;
  badge: string;
  icon: string;
  levelText: string;
  ringColor: string;
}

export interface ParticipantGameRank {
  id: number;
  name: string;
  user_id?: string;
  institution?: string;
  avatar_url?: string;
  avatar?: string;
  gameScore: number;
  rank: number;
  tier: GameRankTier;
  isMe: boolean;
}

export interface GameLeaderboardSummary {
  leaderboard: ParticipantGameRank[];
  myRank: number;
  myTier: GameRankTier;
  myScore: number;
  betterThanPercent: number;
  totalParticipants: number;
}

const STORAGE_KEY_XP = "kolab_arcade_xp";
const STORAGE_KEY_SCORES = "kolab_game_scores_v1";

/**
 * Mendapatkan XP game milik pemain saat ini dari localStorage
 */
export function getPlayerXP(): number {
  if (typeof window === "undefined") return 280;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_XP);
    if (saved !== null) {
      const num = Number(saved);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch (err) {
    console.warn("Gagal membaca XP arcade:", err);
  }
  return 280;
}

/**
 * Menyimpan dan menambah poin game / XP pemain (Murni Game, Tidak Mengubah Nilai Kuis)
 */
export function addPlayerGamePoints(userId: number, points: number): number {
  const currentXP = getPlayerXP();
  const nextXP = currentXP + Math.max(0, points);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_XP, String(nextXP));

      // Simpan juga ke peta skor seluruh peserta di localStorage
      const scores = getAllStoredGameScores();
      scores[userId] = nextXP;
      localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(scores));

      // Kirim event agar tab/komponen lain langsung terupdate
      window.dispatchEvent(
        new CustomEvent("kolab_game_score_updated", {
          detail: { userId, pointsAdded: points, newTotalXP: nextXP },
        })
      );
    } catch (err) {
      console.warn("Gagal menyimpan poin game:", err);
    }
  }

  return nextXP;
}

/**
 * Mendapatkan seluruh peta poin game peserta yang tersimpan
 */
export function getAllStoredGameScores(): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCORES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Gagal membaca peta skor game:", err);
  }
  return {};
}

/**
 * Mendapatkan seeded base score untuk peserta lain agar papan peringkat selalu realistis
 */
function getSeededGameScore(userId: number, name: string): number {
  let hash = 0;
  const str = `${userId}_${name || "peserta"}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  // Poin game realistis antara 160 s/d 680 XP (kelipatan 35)
  return 160 + (abs % 14) * 35;
}

/**
 * Menentukan tingkatan (tier) peringkat game berdasarkan posisi dan kuota persentase peserta
 */
export function getParticipantRankTier(rankPos: number, total: number): GameRankTier {
  const pct = total > 0 ? (rankPos / total) * 100 : 100;

  if (rankPos === 1 || pct <= 10) {
    return {
      title: "Grandmaster BISINDO",
      tierName: "Top 10%",
      badge: "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-purple-500/20",
      icon: "fa-solid fa-crown text-amber-300",
      levelText: "Tier S (Juara Utama)",
      ringColor: "border-purple-500 ring-purple-500/30",
    };
  }
  if (rankPos <= 3 || pct <= 25) {
    return {
      title: "Master Isyarat",
      tierName: "Top 25%",
      badge: "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/20",
      icon: "fa-solid fa-gem text-cyan-200",
      levelText: "Tier A (Jajaran Elit)",
      ringColor: "border-blue-500 ring-blue-500/30",
    };
  }
  if (pct <= 50) {
    return {
      title: "Pejuang Tangkas",
      tierName: "Top 50%",
      badge: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/20",
      icon: "fa-solid fa-medal text-emerald-200",
      levelText: "Tier B (Paruh Atas)",
      ringColor: "border-emerald-500 ring-emerald-500/30",
    };
  }
  if (pct <= 75) {
    return {
      title: "Penjelajah Kata",
      tierName: "Top 75%",
      badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20",
      icon: "fa-solid fa-star text-amber-200",
      levelText: "Tier C (Penjelajah)",
      ringColor: "border-amber-500 ring-amber-500/30",
    };
  }
  return {
    title: "Pemula BISINDO",
    tierName: "Peserta Aktif",
    badge: "bg-slate-600 text-white",
    icon: "fa-solid fa-seedling text-emerald-300",
    levelText: "Tier D (Perintis)",
    ringColor: "border-slate-500 ring-slate-500/30",
  };
}

/**
 * Menghitung dan menyusun papan peringkat game seluruh peserta secara dinamis murni berbasis Poin Game.
 */
export function calculateGameLeaderboard(
  users: User[],
  currentUser: User,
  customXP?: number
): GameLeaderboardSummary {
  const currentXP = customXP !== undefined ? customXP : getPlayerXP();
  const storedScores = getAllStoredGameScores();

  // Ambil seluruh user dengan role 'peserta'
  const participants = users.filter((u) => u.role === "peserta");
  const list: User[] = [...participants];

  // Pastikan currentUser ada di dalam daftar peserta untuk pemeringkatan
  if (!list.some((u) => u.id === currentUser.id)) {
    list.push(currentUser);
  }

  const totalParticipants = Math.max(list.length, 1);

  // Petakan tiap peserta ke poin game murni
  const participantScores = list.map((u) => {
    const isMe = u.id === currentUser.id;
    let score = isMe ? currentXP : (storedScores[u.id] ?? getSeededGameScore(u.id, u.name));
    return {
      user: u,
      isMe,
      gameScore: score,
    };
  });

  // Urutkan peserta dari poin game tertinggi ke terendah
  participantScores.sort((a, b) => b.gameScore - a.gameScore);

  // Hitung ranking dan tier untuk masing-masing peserta
  const leaderboard: ParticipantGameRank[] = participantScores.map((item, index) => {
    const rank = index + 1;
    const tier = getParticipantRankTier(rank, totalParticipants);
    return {
      id: item.user.id,
      name: item.user.name,
      user_id: item.user.user_id || item.user.npm,
      institution: item.user.institution || "Komunitas BISINDO",
      avatar_url: item.user.avatar_url,
      avatar: item.user.avatar,
      gameScore: item.gameScore,
      rank,
      tier,
      isMe: item.isMe,
    };
  });

  const myRankItem = leaderboard.find((item) => item.isMe);
  const myRank = myRankItem ? myRankItem.rank : totalParticipants;
  const myTier = myRankItem ? myRankItem.tier : getParticipantRankTier(myRank, totalParticipants);
  const myScore = myRankItem ? myRankItem.gameScore : currentXP;

  const betterThanPercent = Math.max(
    0,
    Math.min(100, Math.round(((totalParticipants - myRank) / totalParticipants) * 100))
  );

  return {
    leaderboard,
    myRank,
    myTier,
    myScore,
    betterThanPercent,
    totalParticipants,
  };
}
