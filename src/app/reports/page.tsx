"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useApp } from "@/context/AppContext";
import { calculateAnalytics } from "@/lib/analytics";
import { exportQuizReportToExcel } from "@/lib/excelExport";
import { SupabaseService } from "@/lib/supabaseService";
import type { QuizSubmission, User } from "@/types";

export default function ReportsPage() {
  const { users, modules, certificates, showToast, refreshFromSupabase } = useApp();
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pertemuanFilter, setPertemuanFilter] = useState<number | "all">("all");
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Pagination states for reports table
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(10);

  useEffect(() => {
    refreshFromSupabase();
    SupabaseService.getQuizSubmissions()
      .then((data) => {
        if (data) setQuizSubmissions(data);
      })
      .catch((err) => {
        console.warn("Gagal memuat submissions kuis:", err);
      });
  }, []);

  // Jalankan sistem perhitungan analitik terpusat MURNI BERDASARKAN NILAI KUIS SAJA
  const analytics = useMemo(() => {
    return calculateAnalytics(users, modules, undefined, certificates, 70, quizSubmissions);
  }, [users, modules, certificates, quizSubmissions]);

  const pesertaList = useMemo(() => {
    return users.filter((u) => u.role === "peserta");
  }, [users]);

  // Ambil nilai kuis peserta murni (skala 0-100, terpisah total dari poin game)
  const getPesertaScore = (p: User, pFilter: number | "all"): number => {
    const sub = quizSubmissions.find((s) => {
      const matchUser = s.userId === p.id || s.userName.toLowerCase() === p.name.toLowerCase();
      if (!matchUser) return false;
      if (pFilter === "all") return true;
      const matchCat = s.category && s.category.toLowerCase().includes(`pertemuan ${pFilter}`);
      const matchTitle = s.quizTitle && s.quizTitle.toLowerCase().includes(`pertemuan ${pFilter}`);
      const matchAns = Array.isArray(s.answers) && s.answers.some((a) => (a.meeting || "").toLowerCase().includes(`pertemuan ${pFilter}`));
      return matchCat || matchTitle || matchAns;
    });
    if (sub && typeof sub.score === "number") {
      return Math.min(100, Math.max(0, sub.score));
    }
    return Math.min(100, Math.max(0, Number(p.score ?? 0)));
  };

  // Filter peserta berdasarkan pencarian teks dan kriteria nilai kuis
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      const currentScore = getPesertaScore(p, pertemuanFilter);

      // Pencarian
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.user_id || p.npm || "").toLowerCase().includes(q) ||
        (p.institution && p.institution.toLowerCase().includes(q));
      if (!matchSearch) return false;

      // Filter status kelulusan nilai kuis
      if (statusFilter === "lulus" && currentScore < analytics.kkm) return false;
      if (statusFilter === "remedial" && currentScore >= analytics.kkm) return false;
      if (statusFilter === "grade_a" && currentScore < 85) return false;
      if (statusFilter === "grade_b" && (currentScore < analytics.kkm || currentScore >= 85)) return false;
      if (statusFilter === "grade_c" && currentScore >= analytics.kkm) return false;
      if (statusFilter === "certified") {
        const cert = certificates.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
        if (!cert?.certIssued) return false;
      }
      if (statusFilter === "pending_cert") {
        const cert = certificates.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
        if (cert?.certIssued || currentScore < analytics.kkm) return false;
      }

      return true;
    });
  }, [pesertaList, search, statusFilter, pertemuanFilter, analytics.kkm, certificates, quizSubmissions]);

  // Rata-rata nilai kuis dari peserta yang sedang terfilter
  const filteredAverageScore = useMemo(() => {
    if (filteredPeserta.length === 0) return 0;
    const sum = filteredPeserta.reduce((acc, p) => acc + getPesertaScore(p, pertemuanFilter), 0);
    return +(sum / filteredPeserta.length).toFixed(1);
  }, [filteredPeserta, pertemuanFilter]);

  useEffect(() => {
    setReportsPage(1);
  }, [search, statusFilter, pertemuanFilter]);

  const reportsTotalPages = Math.max(1, Math.ceil(filteredPeserta.length / reportsPageSize));
  const paginatedPeserta = useMemo(() => {
    const start = (reportsPage - 1) * reportsPageSize;
    return filteredPeserta.slice(start, start + reportsPageSize);
  }, [filteredPeserta, reportsPage, reportsPageSize]);

  const handleExportQuizExcel = () => {
    if (filteredPeserta.length === 0) {
      showToast("Tidak ada data nilai kuis peserta untuk diekspor ke Excel!", "warning");
      return;
    }
    const sanitizedList = filteredPeserta.map((p) => ({
      ...p,
      score: getPesertaScore(p, pertemuanFilter),
    }));
    const ok = exportQuizReportToExcel(sanitizedList, analytics.kkm, certificates);
    if (ok) {
      showToast(`Laporan nilai kuis (${filteredPeserta.length} data peserta) berhasil diekspor ke Excel!`, "success");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        {/* ========================================================================= */}
        {/* HEADER UTAMA: LAPORAN & ANALITIK NILAI KUIS                               */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-[11px] font-extrabold tracking-wide uppercase border border-syarat/20">
                <i className="fa-solid fa-square-poll-vertical mr-1"></i> Evaluasi Akademik Kuis
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                • Standar KKM {analytics.kkm}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Skor Murni (0–100)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mt-1 text-slate-800 dark:text-white">
              Laporan &amp; Analitik Nilai Kuis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Analisis performa hasil evaluasi kuis kurikulum BISINDO, persentase kelulusan KKM ({analytics.kkm}), distribusi predikat grade, dan rekapitulasi kelayakan sertifikasi. Poin game dikelola terpisah pada menu Ranking Game.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              onClick={handleExportQuizExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md hover:scale-105 transition-all"
              title="Ekspor rekapitulasi data nilai kuis peserta ke format Excel (.xlsx)"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:border-syarat text-slate-700 dark:text-slate-200 transition-all shadow-sm"
              title="Lihat rumus sistem perhitungan analitik nilai kuis"
            >
              <i className="fa-solid fa-calculator text-syarat dark:text-syarat-light"></i>
              <span>Rumus &amp; KKM</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm hover:scale-105 transition-transform"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4 TOP KPI CARDS (BENTO METRIC GRID - MURNI NILAI KUIS)                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Total Peserta Kuis */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 border border-slate-200/80 dark:border-slate-800/80 hover:border-syarat/50 transition-all shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Total Peserta Terdaftar</span>
              <div className="w-9 h-9 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center font-bold">
                <i className="fa-solid fa-users text-sm"></i>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800 dark:text-white">
                {analytics.totalPeserta}
                <span className="text-xs text-slate-400 font-normal ml-1.5">Peserta</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {analytics.activePeserta} Peserta Status Aktif
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                <i className="fa-solid fa-circle-check"></i>
                <span>100% Terdata</span>
              </span>
              <span className="text-slate-400">Kurikulum 2026</span>
            </div>
          </div>

          {/* KPI 2: Rata-Rata Nilai Kuis */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 border border-slate-200/80 dark:border-slate-800/80 hover:border-tigpad/50 transition-all shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Rata-Rata Nilai Kuis</span>
              <div className="w-9 h-9 rounded-xl bg-tigpad/10 text-tigpad flex items-center justify-center font-bold">
                <i className="fa-solid fa-chart-simple text-sm"></i>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-tigpad">
                {analytics.avgScore}
                <span className="text-xs text-slate-400 font-normal ml-1.5">/ 100</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {analytics.avgScore >= analytics.kkm ? (
                  <span className="text-emerald-600 font-bold">
                    +{(analytics.avgScore - analytics.kkm).toFixed(1)} di atas standar KKM
                  </span>
                ) : (
                  <span className="text-amber-500 font-bold">
                    Di bawah target KKM ({analytics.kkm})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <i className="fa-solid fa-bullseye"></i>
                <span>KKM: {analytics.kkm}</span>
              </span>
              <span className="text-slate-400">Skala 0–100</span>
            </div>
          </div>

          {/* KPI 3: Tingkat Kelulusan KKM */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 transition-all shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Tingkat Kelulusan KKM</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <i className="fa-solid fa-award text-sm"></i>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {analytics.passingRate}%
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {analytics.passedCount} dari {analytics.totalPeserta} Peserta Lulus KKM
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <i className="fa-solid fa-certificate"></i>
                <span>Memenuhi Syarat</span>
              </span>
              <span className="text-slate-400">Tertinggi: {analytics.highestScore}</span>
            </div>
          </div>

          {/* KPI 4: Peserta Perlu Remedial (< KKM) */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/50 transition-all shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Perlu Remedial (&lt;KKM)</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <i className="fa-solid fa-triangle-exclamation text-sm"></i>
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-500">
                {analytics.remedialCount}
                <span className="text-xs text-slate-400 font-normal ml-1.5">Peserta ({analytics.remedialRate}%)</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Nilai di bawah standar KKM {analytics.kkm}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <i className="fa-solid fa-clock-rotate-left"></i>
                <span>Butuh Pembinaan</span>
              </span>
              <span className="text-slate-400">Terendah: {analytics.lowestScore}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: DISTRIBUSI GRADE & ANALISIS CAPAIAN SILABUS                     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri (5 span): Distribusi Nilai & Parameter Statistik */}
          <div className="lg:col-span-5 glass-card p-5 sm:p-6 rounded-3xl space-y-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-syarat dark:text-syarat-light"></i>
                <span>Distribusi Predikat Grade</span>
              </h3>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Standar KKM {analytics.kkm}
              </span>
            </div>

            {/* Distribution Visual Bars */}
            <div className="space-y-4 text-xs">
              {/* Grade A */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm"></span>
                    <span>Grade A (≥85) - Sangat Baik</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">
                    {analytics.distribution.gradeA.count} Peserta ({analytics.distribution.gradeA.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${analytics.distribution.gradeA.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Grade B */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-2 text-syarat dark:text-syarat-light font-black">
                    <span className="w-3 h-3 rounded-full bg-syarat inline-block shadow-sm"></span>
                    <span>Grade B ({analytics.kkm}–84) - Lulus Memenuhi</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">
                    {analytics.distribution.gradeB.count} Peserta ({analytics.distribution.gradeB.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <div
                    className="bg-syarat h-full rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${analytics.distribution.gradeB.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Grade C */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-2 text-amber-500 font-black">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm"></span>
                    <span>Grade C (&lt;{analytics.kkm}) - Perlu Remedial</span>
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">
                    {analytics.distribution.gradeC.count} Peserta ({analytics.distribution.gradeC.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${analytics.distribution.gradeC.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Parameter Statistik Ringkas */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase">Skor Tertinggi</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {analytics.highestScore}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase">Nilai Median</div>
                <div className="text-lg font-black text-syarat dark:text-syarat-light mt-0.5">
                  {analytics.medianScore}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase">Skor Terendah</div>
                <div className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {analytics.lowestScore}
                </div>
              </div>
            </div>

            {/* Catatan Ketentuan Murni Nilai Kuis */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-syarat/5 to-tigpad/5 border border-syarat/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-extrabold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved"></i>
                <span>Standar Sertifikasi Murni Nilai Kuis</span>
              </div>
              <p>
                Kelulusan resmi berpatokan eksklusif pada pencapaian <strong>Nilai Kuis (KKM ≥ {analytics.kkm})</strong>. Peserta yang memenuhi KKM berhak menerima sertifikat resmi tanpa prasyarat jam video ataupun poin game.
              </p>
            </div>
          </div>

          {/* Kolom Kanan (7 span): Analisis Capaian Nilai Kuis per Pertemuan */}
          <div className="lg:col-span-7 glass-card p-5 sm:p-6 rounded-3xl space-y-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-chart-line text-tigpad"></i>
                  <span>Analitik Capaian per Silabus Pertemuan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rata-rata evaluasi materi: <strong>{analytics.avgScore}/100</strong> • Kelulusan KKM: <strong>{analytics.passingRate}%</strong>
                </p>
              </div>

              <div className="text-xs font-black text-tigpad px-3 py-1 rounded-xl bg-tigpad/10 border border-tigpad/20 self-start sm:self-auto">
                Silabus {analytics.totalPertemuan} Topik
              </div>
            </div>

            {/* List Pertemuan Breakdown */}
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              {analytics.pertemuanBreakdown.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-1.5">
                  <i className="fa-solid fa-folder-open text-2xl text-slate-300"></i>
                  <div className="font-bold text-slate-600 dark:text-slate-300">Belum Ada Data Topik Kuis</div>
                  <p>Materi kuis evaluasi per pertemuan akan tampil di sini saat bank soal tersedia.</p>
                </div>
              ) : (
                analytics.pertemuanBreakdown.map((p) => (
                  <div
                    key={p.pertemuanNumber}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 hover:border-syarat/40 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-black">
                            Pertemuan {p.pertemuanNumber}
                          </span>
                          <h4 className="font-black text-xs text-slate-800 dark:text-slate-100">
                            {p.title.replace(/^Pertemuan \d+:\s*/i, "")}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          {p.topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                          Rata-Rata: <strong className="text-syarat dark:text-syarat-light font-black">{p.avgScore}</strong>/100
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            p.passingRate >= 80
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : p.passingRate >= 50
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {p.passingRate}% Lulus KKM
                        </span>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-syarat via-blue-500 to-tigpad h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, p.avgScore))}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Status: <strong className={p.avgScore >= analytics.kkm ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-500 font-bold"}>{p.status}</strong></span>
                      <span>Skor Tertinggi: <strong className="text-emerald-600 font-bold">{p.highestScore}</strong> • Terendah: <strong className="text-slate-600 dark:text-slate-300 font-bold">{p.lowestScore}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: TABEL REKAPITULASI HASIL KUIS & KELULUSAN PESERTA             */}
        {/* ========================================================================= */}
        <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          {/* Header Tabel & Controls Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <i className="fa-solid fa-table-list text-syarat dark:text-syarat-light"></i>
                <span>Rekapitulasi Nilai Kuis &amp; Kelulusan Peserta</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rekap nilai kuis peserta per pertemuan atau kumulatif untuk evaluasi instruktur dan penetapan sertifikasi.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Filter Pertemuan Kuis */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Kuis:</label>
                <select
                  value={pertemuanFilter}
                  onChange={(e) => setPertemuanFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-syarat outline-none"
                >
                  <option value="all">Semua Topik Kuis ({analytics.totalPertemuan})</option>
                  {analytics.pertemuanBreakdown.map((p) => (
                    <option key={p.pertemuanNumber} value={p.pertemuanNumber}>
                      Pertemuan {p.pertemuanNumber}: {p.title.replace(/^Pertemuan \d+:\s*/i, "")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status Nilai */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-syarat outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="lulus">Lulus KKM (≥{analytics.kkm})</option>
                  <option value="remedial">Perlu Remedial (&lt;{analytics.kkm})</option>
                  <option value="grade_a">Grade A (≥85)</option>
                  <option value="grade_b">Grade B ({analytics.kkm}–84)</option>
                  <option value="grade_c">Grade C (&lt;{analytics.kkm})</option>
                  <option value="certified">Sertifikat Terbit</option>
                  <option value="pending_cert">Siap Terbit</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:w-56">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / User ID / instansi..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-tigpad outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => { setStatusFilter("all"); setSearch(""); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Semua ({pesertaList.length})
            </button>
            <button
              onClick={() => setStatusFilter("lulus")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === "lulus"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              Lulus KKM ({analytics.passedCount})
            </button>
            <button
              onClick={() => setStatusFilter("remedial")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === "remedial"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              }`}
            >
              Remedial ({analytics.remedialCount})
            </button>
            <button
              onClick={() => setStatusFilter("grade_a")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === "grade_a"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
              }`}
            >
              Grade A ({analytics.distribution.gradeA.count})
            </button>
            <button
              onClick={() => setStatusFilter("certified")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === "certified"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
              }`}
            >
              Sertifikat Terbit ({analytics.totalIssued})
            </button>
          </div>

          {/* Tabel Rekapitulasi Nilai Kuis */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Nama Peserta</th>
                  <th className="py-3 px-3">User ID / NPM</th>
                  <th className="py-3 px-3">Instansi</th>
                  <th className="py-3 px-3">Nilai Kuis (0–100)</th>
                  <th className="py-3 px-3">Predikat Grade</th>
                  <th className="py-3 px-3">Status KKM</th>
                  <th className="py-3 px-4 text-right">Kelayakan Sertifikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPeserta.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <i className="fa-solid fa-file-circle-question text-3xl mb-2 block text-slate-300"></i>
                      Tidak ada data nilai kuis yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedPeserta.map((p) => {
                    const cert = certificates.find(
                      (c) =>
                        c.name.toLowerCase() === p.name.toLowerCase() ||
                        (c.user_id && (c.user_id === p.user_id || c.user_id === p.npm))
                    );
                    const initials = p.name
                      ? p.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                      : "P";
                    const currentScore = getPesertaScore(p, pertemuanFilter);
                    const isPassed = currentScore >= analytics.kkm;

                    let gradeLabel = `Grade C`;
                    let gradeBadge = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
                    if (currentScore >= 85) {
                      gradeLabel = "Grade A";
                      gradeBadge = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
                    } else if (currentScore >= analytics.kkm) {
                      gradeLabel = `Grade B`;
                      gradeBadge = "bg-syarat/15 text-syarat dark:text-syarat-light border border-syarat/30";
                    }

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Peserta Avatar & Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white flex items-center justify-center font-extrabold text-[10px] shadow-sm flex-shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                              {p.avatar_url || p.avatar ? (
                                <img
                                  src={p.avatar_url || p.avatar}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="leading-tight min-w-0">
                              <div className="font-extrabold truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal truncate">{p.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* User ID */}
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {p.user_id || p.npm || "-"}
                        </td>

                        {/* Institution */}
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                          {p.institution || "Komunitas BISINDO"}
                        </td>

                        {/* Nilai Kuis (Besar & Visual Progress Bar) */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-slate-800 dark:text-white">
                                {currentScore}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                            </div>
                            <div className="w-28 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isPassed
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                    : "bg-gradient-to-r from-amber-500 to-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Predikat Grade */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-block ${gradeBadge}`}>
                            {gradeLabel}
                          </span>
                        </td>

                        {/* Status KKM */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isPassed
                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                : "bg-red-500/15 text-red-500 dark:text-red-400"
                            }`}
                          >
                            <i className={isPassed ? "fa-solid fa-circle-check text-[9px]" : "fa-solid fa-circle-xmark text-[9px]"}></i>
                            <span>{isPassed ? "Lulus" : "Remedial"}</span>
                          </span>
                        </td>

                        {/* Status Kelayakan Sertifikat */}
                        <td className="py-3.5 px-4 text-right">
                          {cert?.certIssued ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-500/30">
                              <i className="fa-solid fa-award text-[10px]"></i>
                              <span>Sertifikat Terbit</span>
                            </span>
                          ) : isPassed ? (
                            <span className="px-2.5 py-1 rounded-full bg-syarat/15 text-syarat dark:text-syarat-light font-bold text-[10px] inline-flex items-center gap-1 border border-syarat/30">
                              
                              <span>Siap Terbit</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-[10px] inline-flex items-center gap-1">
                              
                              <span>Menunggu Remedial</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Pagination
              currentPage={reportsPage}
              totalPages={reportsTotalPages}
              totalItems={filteredPeserta.length}
              pageSize={reportsPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setReportsPage}
              onPageSizeChange={setReportsPageSize}
              itemLabel="peserta"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 pt-2 gap-2">
            <span>
              Menampilkan <strong>{filteredPeserta.length}</strong> dari total <strong>{analytics.totalPeserta}</strong> peserta evaluasi kuis • Rata-rata terfilter: <strong>{filteredAverageScore}/100</strong>
            </span>
            <span className="text-[11px] font-medium">
              Sistem Evaluasi Kuis Kurikulum • Kolab SYARAT x TIGPAD
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL PENJELASAN RUMUS SISTEM ANALITIK KUIS                               */}
        {/* ========================================================================= */}
        <Modal
          isOpen={showFormulaModal}
          onClose={() => setShowFormulaModal(false)}
          title="Rumus Sistem Analitik Nilai Kuis"
          subtitle="Standar perhitungan akademik kelulusan evaluasi kuis"
          icon="fa-solid fa-calculator"
          size="md"
          footer={
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="btn-duotone px-5 py-2 rounded-xl font-bold text-xs shadow"
              >
                Tutup
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 pr-1">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-black text-syarat dark:text-syarat-light">
                1. Rata-Rata Nilai Kuis (Mean Score)
              </div>
              <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300">
                Rata-Rata = Σ(Nilai Kuis Seluruh Peserta) / Total Peserta
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-black text-tigpad">
                2. Tingkat Kelulusan KKM (Passing Rate)
              </div>
              <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300">
                Passing Rate (%) = (Peserta Skor ≥ {analytics.kkm} / Total Peserta) × 100%
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-black text-emerald-600 dark:text-emerald-400">
                3. Nilai Median Kuis (Median Score)
              </div>
              <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300">
                Nilai tengah (Q2) dari kumpulan skor kuis yang telah diurutkan ascending
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-black text-purple-600 dark:text-purple-400">
                4. Distribusi Predikat Nilai Kuis
              </div>
              <div className="space-y-1 text-[11px] pt-0.5">
                <p>• <strong>Grade A (Sangat Baik)</strong>: Skor ≥ 85</p>
                <p>• <strong>Grade B (Lulus Memenuhi KKM)</strong>: Skor {analytics.kkm} s.d. 84</p>
                <p>• <strong>Grade C (Perlu Remedial)</strong>: Skor &lt; {analytics.kkm}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-black text-amber-500">
                5. Pemisahan Total dari Poin Game
              </div>
              <p className="text-[11px] leading-relaxed">
                Evaluasi akademik kuis murni berpatokan pada capaian kuis kurikulum (skala 0–100, KKM {analytics.kkm}). Poin game ketangkasan (XP) tidak mempengaruhi nilai kuis ini dan ditempatkan secara khusus pada menu Ranking Game.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
