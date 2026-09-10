"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import {
  calculateGameLeaderboard,
  getPlayerXP,
  type ParticipantGameRank,
  type GameRankTier,
} from "@/lib/gameRanking";

export default function RankingGamePage() {
  const { currentUser, users, showToast } = useApp();

  const [playerXP, setPlayerXP] = useState<number>(() => getPlayerXP());
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [isCopied, setIsCopied] = useState(false);

  // Dengarkan pembaruan skor game real-time dari aktivitas permainan
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

  // Hitung papan peringkat game dinamis berbasis poin game murni
  const summary = useMemo(() => {
    return calculateGameLeaderboard(users, currentUser, playerXP);
  }, [users, currentUser, playerXP]);

  const { leaderboard, myRank, myTier, myScore, betterThanPercent, totalParticipants } = summary;

  // Filter papan peringkat berdasarkan pencarian nama/ID dan filter tier
  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.user_id && item.user_id.toLowerCase().includes(q)) ||
        (item.institution && item.institution.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (tierFilter === "top10" && item.tier.tierName !== "Top 10%") return false;
      if (tierFilter === "top25" && !["Top 10%", "Top 25%"].includes(item.tier.tierName)) return false;
      if (tierFilter === "top50" && !["Top 10%", "Top 25%", "Top 50%"].includes(item.tier.tierName)) return false;
      if (tierFilter === "me" && !item.isMe) return false;

      return true;
    });
  }, [leaderboard, searchTerm, tierFilter]);

  const topThree = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  // Target XP menuju Tier S Grandmaster atau peringkat 1
  const leaderScore = leaderboard[0]?.gameScore || myScore;
  const xpDifferenceToLeader = Math.max(0, leaderScore - myScore);

  const handleShareRank = () => {
    const shareText = `Saya saat ini berada di peringkat #${myRank} (${myTier.title}) dengan perolehan ${myScore} XP di Game Edukasi Isyarat BISINDO! Ayo uji ketangkasan isyaratmu!`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setIsCopied(true);
        showToast("Peringkat dan skor kamu berhasil disalin ke clipboard!", "success");
        setTimeout(() => setIsCopied(false), 2500);
      });
    } else {
      showToast(`Peringkat kamu: #${myRank} (${myScore} XP)`, "info");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        {/* ========================================================================= */}
        {/* BREADCRUMB & HEADER UTAMA                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1">
              <Link href="/dashboard" className="hover:text-syarat transition-colors">
                Beranda
              </Link>
              <span>/</span>
              <Link href="/game" className="hover:text-syarat transition-colors">
                Game BISINDO
              </Link>
              <span>/</span>
              <span className="text-amber-500 font-bold">Papan Peringkat</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black tracking-wide uppercase border border-amber-500/25">
                <i className="fa-solid fa-trophy mr-1"></i> Arcade Leaderboard
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                • {totalParticipants} Peserta Terdaftar
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black border border-purple-500/20">
                Poin Game (XP) Terpisah
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mt-1 text-slate-800 dark:text-white flex items-center gap-3">
              <span>Ranking Game BISINDO</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Papan klasemen ketangkasan membaca gerakan isyarat. Kumpulkan Poin Game (XP) dari <strong>Fingerspelling</strong>, <strong>Word Rush</strong>, dan <strong>Memori Kartu</strong> untuk melesat ke Tier Grandmaster.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              onClick={handleShareRank}
              className="px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              title="Salin dan bagikan peringkat permainan kamu"
            >
              <i className={`fa-solid ${isCopied ? "fa-check text-emerald-500" : "fa-share-nodes"}`}></i>
              <span>{isCopied ? "Tersalin!" : "Bagikan Peringkat"}</span>
            </button>

            <Link
              href="/game"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-syarat via-blue-600 to-tigpad hover:opacity-95 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-syarat/25 transition-all hover:scale-105"
            >
              <i className="fa-solid fa-gamepad"></i>
              <span>Mainkan Game (+XP)</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HERO PLAYER BANNER: STATUS & KARTU PROFIL GAMIFIKASI                     */}
        {/* ========================================================================= */}
        <div className="glass-card p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md relative overflow-hidden bg-gradient-to-br from-white/95 via-amber-50/20 to-purple-50/20 dark:from-slate-900/95 dark:via-amber-950/20 dark:to-purple-950/20">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gradient-to-bl from-amber-400/20 via-syarat/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            {/* Player Info & Avatar */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-syarat text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-xl shadow-amber-500/30 border-2 border-white dark:border-slate-800 overflow-hidden">
                  {currentUser.avatar_url || currentUser.avatar ? (
                    <img
                      src={currentUser.avatar_url || currentUser.avatar}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>#{myRank}</span>
                  )}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white dark:border-slate-900">
                  <i className="fa-solid fa-crown text-[11px]"></i>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black text-slate-800 dark:text-white">
                    {currentUser.name}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-syarat/15 text-syarat dark:text-syarat-light font-black uppercase tracking-wider">
                    Akun Kamu
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm ${myTier.badge}`}>
                    <i className={myTier.icon}></i>
                    <span>{myTier.title} ({myTier.tierName})</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Peringkat <strong>#{myRank}</strong> dari <strong>{totalParticipants} Peserta</strong></span>
                  <span>•</span>
                  <span>{currentUser.institution || "Komunitas BISINDO"}</span>
                </p>

                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-line text-emerald-500"></i>
                  <span>
                    {betterThanPercent > 0 ? (
                      <>Ketangkasan isyarat kamu lebih unggul dari <strong className="text-emerald-600 dark:text-emerald-400 font-black">{betterThanPercent}%</strong> seluruh peserta!</>
                    ) : (
                      <>Raih poin game pertama kamu untuk melesat naik di klasemen!</>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Metrics & Target XP */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto self-stretch lg:self-auto justify-end">
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center gap-3.5 min-w-[170px]">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-xl font-black shadow-md flex-shrink-0">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Total Poin Game
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {myScore} <span className="text-xs font-bold">XP</span>
                  </div>
                </div>
              </div>

              {/* Standing Progress Bar Card */}
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 w-full sm:w-56 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Posisi Klasemen</span>
                  <span className="text-syarat dark:text-syarat-light font-black">
                    {Math.max(5, 100 - (myRank / totalParticipants) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-syarat via-amber-500 to-tigpad h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, 100 - (myRank / totalParticipants) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between items-center">
                  <span>{myRank === 1 ? "🥇 Memimpin Klasemen" : `Selisih #${1}: ${xpDifferenceToLeader} XP`}</span>
                  <span className="font-bold text-amber-500">{myTier.levelText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PODIUM 3D JUARA KETANGKASAN ISYARAT (TOP 3)                               */}
        {/* ========================================================================= */}
        {topThree.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-crown text-amber-400"></i>
                <span>Podium Utama Juara Ketangkasan BISINDO</span>
              </h2>
              <span className="text-xs text-slate-400">Peringkat 1, 2, dan 3 Teratas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
              {/* JUARA 2: PERAK (Kiri) */}
              {topThree[1] && (
                <div className="glass-card p-5 rounded-3xl border border-slate-300 dark:border-slate-700/80 text-center relative overflow-hidden order-2 md:order-1 bg-gradient-to-b from-slate-100/90 to-slate-200/60 dark:from-slate-800/90 dark:to-slate-900/60 shadow-md">
                  <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center font-black text-xs mx-auto mb-2 shadow">
                    #2
                  </div>
                  <div className="text-3xl mb-1">🥈</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white truncate">
                    {topThree[1].name} {topThree[1].isMe && "(Kamu)"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {topThree[1].institution || "Komunitas BISINDO"}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-300/40 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 font-black text-xs">
                    <i className="fa-solid fa-bolt text-amber-500"></i>
                    <span>{topThree[1].gameScore} XP</span>
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-slate-500">
                    {topThree[1].tier.title}
                  </div>
                  <div className="h-10 mt-3 rounded-2xl bg-gradient-to-t from-slate-300/50 to-transparent dark:from-slate-700/40 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Podium Perak
                  </div>
                </div>
              )}

              {/* JUARA 1: EMAS (Tengah, Paling Tinggi & Mewah) */}
              {topThree[0] && (
                <div className="glass-card p-6 rounded-3xl border-2 border-amber-400 dark:border-amber-500 text-center relative overflow-hidden order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-yellow-500/10 to-amber-500/5 shadow-2xl shadow-amber-500/15 transform md:-translate-y-3">
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-amber-400/25 rounded-full blur-xl pointer-events-none"></div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center font-black text-sm mx-auto mb-2 shadow-lg">
                    #1
                  </div>
                  <div className="text-4xl mb-1 animate-bounce">🥇</div>
                  <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white truncate">
                    {topThree[0].name} {topThree[0].isMe && "(Kamu)"}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {topThree[0].institution || "Komunitas BISINDO"}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-sm shadow-md">
                    <i className="fa-solid fa-bolt"></i>
                    <span>{topThree[0].gameScore} XP</span>
                  </div>
                  <div className="mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-sm">
                      {topThree[0].tier.title}
                    </span>
                  </div>
                  <div className="h-14 mt-3 rounded-2xl bg-gradient-to-t from-amber-500/30 to-transparent dark:from-amber-600/30 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                    Juara Utama Klasemen
                  </div>
                </div>
              )}

              {/* JUARA 3: PERUNGGU (Kanan) */}
              {topThree[2] && (
                <div className="glass-card p-5 rounded-3xl border border-amber-700/30 dark:border-amber-700/50 text-center relative overflow-hidden order-3 bg-gradient-to-b from-amber-800/15 to-amber-900/5 dark:from-amber-950/40 dark:to-slate-900/60 shadow-md">
                  <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs mx-auto mb-2 shadow">
                    #3
                  </div>
                  <div className="text-3xl mb-1">🥉</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white truncate">
                    {topThree[2].name} {topThree[2].isMe && "(Kamu)"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {topThree[2].institution || "Komunitas BISINDO"}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700/20 text-amber-800 dark:text-amber-300 font-black text-xs">
                    <i className="fa-solid fa-bolt text-amber-500"></i>
                    <span>{topThree[2].gameScore} XP</span>
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-slate-500">
                    {topThree[2].tier.title}
                  </div>
                  <div className="h-8 mt-3 rounded-2xl bg-gradient-to-t from-amber-800/30 to-transparent dark:from-amber-900/30 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                    Podium Perunggu
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CARA MEMPEROLEH POIN: 3 KARTU MODE PERMAINAN                              */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-gamepad text-purple-500"></i>
              <span>Tiga Mode Permainan Pengumpul XP</span>
            </h2>
            <Link href="/game" className="text-xs font-bold text-syarat hover:underline flex items-center gap-1">
              <span>Buka Arena Game</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Mode 1: Fingerspelling */}
            <Link
              href="/game"
              className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-syarat transition-all group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black">
                    🔤
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                    +100 XP / Kata
                  </span>
                </div>
                <h3 className="font-black text-xs text-slate-800 dark:text-white group-hover:text-syarat transition-colors">
                  Tebak Abjad Fingerspelling
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Eja simbol isyarat tangan kata BISINDO. Dapatkan bonus multiplier combo beruntun!
                </p>
              </div>
              <div className="pt-3 text-[10px] font-bold text-syarat flex items-center gap-1">
                <span>Mainkan Tebak Isyarat</span>
                <i className="fa-solid fa-chevron-right text-[8px]"></i>
              </div>
            </Link>

            {/* Mode 2: Word Rush */}
            <Link
              href="/game"
              className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-black">
                    ⚡
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                    Hingga +200 XP
                  </span>
                </div>
                <h3 className="font-black text-xs text-slate-800 dark:text-white group-hover:text-amber-500 transition-colors">
                  Tantangan Cepat Word Rush
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Uji refleks membaca gerakan isyarat tangan secepat mungkin dalam hitungan 30 detik!
                </p>
              </div>
              <div className="pt-3 text-[10px] font-bold text-amber-500 flex items-center gap-1">
                <span>Mulai Adu Cepat</span>
                <i className="fa-solid fa-chevron-right text-[8px]"></i>
              </div>
            </Link>

            {/* Mode 3: Memory Cards */}
            <Link
              href="/game"
              className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-black">
                    🃏
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black">
                    +75 XP / Ronde
                  </span>
                </div>
                <h3 className="font-black text-xs text-slate-800 dark:text-white group-hover:text-purple-500 transition-colors">
                  Memori Pasangan Isyarat
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Asah daya ingat dengan mencocokkan kartu huruf latin dan simbol tangan BISINDO!
                </p>
              </div>
              <div className="pt-3 text-[10px] font-bold text-purple-500 flex items-center gap-1">
                <span>Asah Memori Kartu</span>
                <i className="fa-solid fa-chevron-right text-[8px]"></i>
              </div>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PENCARIAN & TABEL LENGKAP KLASEMEN                                        */}
        {/* ========================================================================= */}
        <div className="glass-card p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          {/* Toolbar Pencarian & Filter Tabs */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama peserta, User ID, atau instansi..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setTierFilter("all")}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tierFilter === "all"
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Semua ({leaderboard.length})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("me")}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tierFilter === "me"
                    ? "bg-syarat text-white shadow-sm"
                    : "bg-syarat/10 text-syarat dark:text-syarat-light hover:bg-syarat/20"
                }`}
              >
                ⭐ Posisi Saya (#{myRank})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("top10")}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tierFilter === "top10"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
                }`}
              >
                👑 Top 10%
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("top25")}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tierFilter === "top25"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                }`}
              >
                💎 Top 25%
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("top50")}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  tierFilter === "top50"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                🎖️ Top 50%
              </button>
            </div>
          </div>

          {/* TABEL LENGKAP KLASEMEN (Desktop) */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-20 text-center">Peringkat</th>
                  <th className="py-3 px-4">Peserta Pelatihan</th>
                  <th className="py-3 px-4">Instansi / ID</th>
                  <th className="py-3 px-4">Tingkat Tier</th>
                  <th className="py-3 px-4 text-right">Poin Game (XP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <i className="fa-solid fa-user-slash text-2xl mb-2 block text-slate-300"></i>
                      Tidak ada peserta yang cocok dengan filter &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((item) => {
                    const isMe = item.isMe;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isMe
                            ? "bg-syarat/10 hover:bg-syarat/15 border-l-4 border-syarat"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {/* Peringkat & Medali */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center font-black">
                            {item.rank === 1 ? (
                              <span className="text-xl" title="Juara 1">🥇</span>
                            ) : item.rank === 2 ? (
                              <span className="text-xl" title="Juara 2">🥈</span>
                            ) : item.rank === 3 ? (
                              <span className="text-xl" title="Juara 3">🥉</span>
                            ) : (
                              <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black">
                                #{item.rank}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nama Peserta & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-syarat/20 via-tigpad/20 to-amber-500/20 text-syarat dark:text-syarat-light flex items-center justify-center font-black text-xs flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                              {item.avatar_url || item.avatar ? (
                                <img
                                  src={item.avatar_url || item.avatar}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{item.name ? item.name.charAt(0).toUpperCase() : "P"}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{item.name}</span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-syarat text-white text-[9px] font-black">
                                    Kamu
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {item.institution}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Instansi / ID */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          <div className="font-mono text-[11px]">{item.user_id || "-"}</div>
                        </td>

                        {/* Tingkat Tier */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 shadow-sm ${item.tier.badge}`}>
                            <i className={item.tier.icon}></i>
                            <span>{item.tier.title}</span>
                          </span>
                        </td>

                        {/* Poin Game (XP) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="text-amber-600 dark:text-amber-400 text-sm font-black flex items-center justify-end gap-1">
                            <i className="fa-solid fa-bolt text-xs text-amber-500"></i>
                            <span>{item.gameScore} XP</span>
                          </div>
                          <div className="w-24 ml-auto bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(5, (item.gameScore / (leaderScore || 1)) * 100))}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* LIST KARTU KLASEMEN (Mobile View) */}
          <div className="space-y-2.5 sm:hidden">
            {filteredLeaderboard.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada peserta yang cocok dengan pencarian &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredLeaderboard.map((item) => {
                const isMe = item.isMe;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isMe
                        ? "bg-syarat/10 border-syarat/40 shadow-sm"
                        : "bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 flex items-center justify-center font-black text-sm flex-shrink-0">
                        {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`}
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-200 flex-shrink-0 overflow-hidden">
                        {item.avatar_url || item.avatar ? (
                          <img src={item.avatar_url || item.avatar} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          item.name ? item.name.charAt(0).toUpperCase() : "P"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 dark:text-white truncate flex items-center gap-1">
                          <span className="truncate">{item.name}</span>
                          {isMe && (
                            <span className="px-1 py-0.2 rounded bg-syarat text-white text-[8px] font-black flex-shrink-0">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.tier.title} • {item.institution}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                        <i className="fa-solid fa-bolt text-[10px]"></i>
                        <span>{item.gameScore} XP</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                        Tier {item.tier.tierName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
            <span>
              Menampilkan <strong>{filteredLeaderboard.length}</strong> dari <strong>{totalParticipants}</strong> peserta terdaftar.
            </span>
            <span className="text-[11px] font-medium">
              Peringkat terupdate otomatis dari perolehan XP game real-time.
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KARTU ATURAN & PEMISAHAN NILAI KUIS                                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-syarat dark:text-syarat-light font-extrabold text-sm">
              <i className="fa-solid fa-medal"></i>
              <h3>Sistem Peringkat & Tier Ketangkasan</h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-1">
              <li>• <strong>Tier S Grandmaster (Top 10%):</strong> Jajaran puncak ketangkasan membaca gerakan isyarat.</li>
              <li>• <strong>Tier A Master (Top 25%):</strong> Penguasaan kosakata dan kecepatan reaksi tingkat lanjut.</li>
              <li>• <strong>Tier B Pejuang (Top 50%):</strong> Kemampuan membaca kata dasar dan ejaan abjad lancar.</li>
              <li>• <strong>Tier C & D Penjelajah:</strong> Peserta aktif yang sedang meniti latihan awal.</li>
            </ul>
          </div>

          <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5 bg-gradient-to-br from-white/90 to-purple-50/25 dark:from-slate-900/90 dark:to-purple-950/25">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
              <i className="fa-solid fa-shield-halved"></i>
              <h3>Pemisahan Total dengan Nilai Kuis</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Poin game (XP) beroperasi secara mandiri dan <strong>tidak mencemari Nilai Kuis Evaluasi (KKM 70)</strong> ataupun syarat penerbitan sertifikat. Laporan nilai kuis kurikulum tetap murni dapat dilihat di menu Laporan &amp; Analitik.
            </p>
            <div className="pt-1">
              <Link
                href="/reports"
                className="text-xs font-bold text-syarat hover:underline inline-flex items-center gap-1.5"
              >
                <span>Buka Laporan &amp; Analitik Nilai Kuis</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
