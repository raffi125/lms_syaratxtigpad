"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { calculateAnalytics } from "@/lib/analytics";

export default function ReportsPage() {
  const { users, modules, zoomData, certificates, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pertemuanFilter, setPertemuanFilter] = useState<number | "all">("all");
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Jalankan sistem perhitungan analitik terpusat murni dari Supabase
  const analytics = useMemo(() => {
    return calculateAnalytics(users, modules, zoomData, certificates, 70);
  }, [users, modules, zoomData, certificates]);

  const pesertaList = useMemo(() => {
    return users.filter((u) => u.role === "peserta");
  }, [users]);

  // Filter peserta berdasarkan pencarian teks, status kelulusan, dan progres pertemuan
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      // Pencarian
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.user_id || p.npm || "").toLowerCase().includes(q) ||
        (p.institution && p.institution.toLowerCase().includes(q));
      if (!matchSearch) return false;

      // Filter status
      if (statusFilter === "lulus" && p.score < analytics.kkm) return false;
      if (statusFilter === "remedial" && p.score >= analytics.kkm) return false;
      if (statusFilter === "certified") {
        const cert = certificates.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
        if (!cert?.certIssued) return false;
      }
      if (statusFilter === "pending_cert") {
        const cert = certificates.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
        if (cert?.certIssued || p.score < analytics.kkm) return false;
      }

      // Filter pertemuan progres
      if (pertemuanFilter !== "all") {
        const pNum = Number(pertemuanFilter);
        const requiredProgress = analytics.totalPertemuan > 0 ? (pNum / analytics.totalPertemuan) * 100 - 5 : 0;
        if ((p.progress ?? 0) < requiredProgress) return false;
      }

      return true;
    });
  }, [pesertaList, search, statusFilter, pertemuanFilter, analytics.kkm, analytics.totalPertemuan, certificates]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-[11px] font-extrabold tracking-wide uppercase">
                Sistem Perhitungan Analitik
              </span>
              <span className="text-slate-400 text-xs">• {analytics.totalPertemuan} Modul Kurikulum</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mt-1 text-slate-800 dark:text-white">
              Laporan & Analitik Pembelajaran
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kalkulasi otomatis kemajuan belajar, passing rate KKM, dan rekapitulasi capaian per pertemuan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowFormulaModal(true)}
              className="px-3.5 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:border-syarat text-slate-700 dark:text-slate-200 transition-all shadow-sm"
              title="Lihat rumus sistem perhitungan analitik"
            >
              <i className="fa-solid fa-calculator text-syarat dark:text-syarat-light"></i>
              <span>Rumus Analitik</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards (Bento Metric Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* KPI 1: Total Peserta */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-2 border border-slate-200 dark:border-slate-800 hover:border-syarat transition-all">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Total Peserta Aktif</span>
              <div className="w-8 h-8 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center">
                <i className="fa-solid fa-users text-sm"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
              {analytics.totalPeserta}{" "}
              <span className="text-xs text-slate-400 font-semibold">Peserta</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i>
                <span>{analytics.activePeserta} Peserta Aktif</span>
              </span>
              <span className="text-slate-400">Status Belajar</span>
            </div>
          </div>

          {/* KPI 2: Rata-Rata Nilai Kuis & KKM */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-2 border border-slate-200 dark:border-slate-800 hover:border-tigpad transition-all">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Rata-Rata Nilai Kuis</span>
              <div className="w-8 h-8 rounded-xl bg-tigpad/10 text-tigpad flex items-center justify-center">
                <i className="fa-solid fa-chart-simple text-sm"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-tigpad">
              {analytics.avgScore}{" "}
              <span className="text-xs text-slate-400 font-semibold">/ 100</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i>
                <span>{analytics.passingRate}% Di Atas KKM</span>
              </span>
              <span className="text-slate-400">Tertinggi: {analytics.highestScore}</span>
            </div>
          </div>

          {/* KPI 3: Kehadiran Pertemuan Zoom */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-2 border border-slate-200 dark:border-slate-800 hover:border-purple-500 transition-all">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Kehadiran Pertemuan Daring</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <i className="fa-solid fa-headset text-sm"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              {analytics.attendanceRate}%
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-video"></i>
                <span>{analytics.totalZoomSessions} Sesi Pertemuan</span>
              </span>
              <span className="text-slate-500 font-semibold">
                {analytics.totalVerifiedLogs} Log Hadir
              </span>
            </div>
          </div>

          {/* KPI 4: Sertifikat Kelulusan Resmi */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl space-y-2 border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
              <span>Sertifikat Terbit</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <i className="fa-solid fa-award text-sm"></i>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500">
              {analytics.totalIssued}{" "}
              <span className="text-xs text-slate-400 font-semibold">Berkas</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-amber-500 font-semibold">
                {analytics.certificationRate}% Rasio Terbit
              </span>
              <span className="text-slate-400">
                {analytics.pendingIssued} Proses Verifikasi
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Deep Analytics Breakdown (Distribusi Nilai & Capaian per Pertemuan) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri (5 span): Distribusi Nilai & Parameter Statistik */}
          <div className="lg:col-span-5 glass-card p-5 sm:p-6 rounded-3xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-syarat dark:text-syarat-light"></i>
                <span>Distribusi Nilai Kuis & Kelulusan</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                KKM {analytics.kkm}
              </span>
            </div>

            {/* Distribution Visual Bars */}
            <div className="space-y-3.5 text-xs">
              {/* Grade A */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Grade A (≥85) - Sangat Baik</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {analytics.distribution.gradeA.count} Peserta ({analytics.distribution.gradeA.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${analytics.distribution.gradeA.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Grade B */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-syarat dark:text-syarat-light">
                    <span className="w-2.5 h-2.5 rounded-full bg-syarat inline-block"></span>
                    <span>Grade B ({analytics.kkm}–84) - Lulus Memenuhi</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {analytics.distribution.gradeB.count} Peserta ({analytics.distribution.gradeB.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-syarat h-full rounded-full transition-all duration-700"
                    style={{ width: `${analytics.distribution.gradeB.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Grade C */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>Grade C (&lt;{analytics.kkm}) - Perlu Remedial</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {analytics.distribution.gradeC.count} Peserta ({analytics.distribution.gradeC.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${analytics.distribution.gradeC.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Parameter Statistik Ringkas */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
              <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Skor Tertinggi</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {analytics.highestScore}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Nilai Median</div>
                <div className="text-base font-black text-syarat dark:text-syarat-light mt-0.5">
                  {analytics.medianScore}
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Skor Terendah</div>
                <div className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {analytics.lowestScore}
                </div>
              </div>
            </div>

            {/* Quick Explanation Note */}
            <div className="p-3 rounded-2xl bg-syarat/5 dark:bg-syarat/10 border border-syarat/20 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info"></i>
                <span>Kriteria Kelulusan Bersertifikat:</span>
              </div>
              <p className="leading-relaxed">
                Peserta berhak atas sertifikat resmi apabila mencapai <strong>Nilai Kuis ≥ {analytics.kkm}</strong> dan menyelesaikan minimal <strong>{analytics.totalPertemuan > 0 ? Math.ceil(analytics.totalPertemuan * 0.8) : 0} dari {analytics.totalPertemuan} Pertemuan (Progress ≥ 80%)</strong>.
              </p>
            </div>
          </div>

          {/* Kolom Kanan (7 span): Analisis Kemajuan per Pertemuan (Murni dari Modul Supabase) */}
          <div className="lg:col-span-7 glass-card p-5 sm:p-6 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-bars-progress text-tigpad"></i>
                  <span>Analitik Kemajuan Kurikulum per Pertemuan</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Rata-rata capaian peserta: <strong>{analytics.avgPertemuanCompleted} dari {analytics.totalPertemuan} Pertemuan ({analytics.avgProgress}%)</strong>
                </p>
              </div>

              <div className="text-[11px] font-bold text-tigpad px-2.5 py-1 rounded-xl bg-tigpad/10">
                Silabus {analytics.totalPertemuan} Pertemuan
              </div>
            </div>

            {/* List Pertemuan Murni dari Supabase */}
            <div className="space-y-3">
              {analytics.pertemuanBreakdown.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-1.5">
                  <i className="fa-solid fa-folder-open text-2xl text-slate-300"></i>
                  <div className="font-bold text-slate-600 dark:text-slate-300">Belum Ada Modul Kurikulum di Database</div>
                  <p>Tambahkan modul pembelajaran di menu Modul agar analitik kurikulum terhitung otomatis dari data Supabase.</p>
                </div>
              ) : (
                analytics.pertemuanBreakdown.map((p) => (
                  <div
                    key={p.pertemuanNumber}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-syarat/40 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-extrabold">
                            Pertemuan {p.pertemuanNumber}
                          </span>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {p.title.replace(/^Pertemuan \d+:\s*/i, "")}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          {p.topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                          {p.completedCount}/{analytics.totalPeserta} Peserta
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.completionRate >= 80
                              ? "bg-green-500/15 text-green-600"
                              : p.completionRate >= 50
                              ? "bg-blue-500/15 text-blue-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {p.completionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar per Pertemuan */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-syarat to-tigpad h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.completionRate}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Target: {p.targetDuration} • Status: <strong className="text-slate-600 dark:text-slate-300">{p.status}</strong></span>
                      <span>Rata-Rata Nilai: <strong className="text-syarat dark:text-syarat-light">{p.avgScore}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Filter Toolbar & Student Performance Table */}
        <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-slate-800 dark:text-white">
                <i className="fa-solid fa-table-list text-syarat dark:text-syarat-light"></i>
                <span>Rekapitulasi Nilai & Kelulusan per Pertemuan</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Data capaian individu peserta untuk evaluasi instruktur dan penerbitan sertifikat.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Filter Pertemuan */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Pertemuan:</label>
                <select
                  value={pertemuanFilter}
                  onChange={(e) => setPertemuanFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat outline-none"
                >
                  <option value="all">Semua Pertemuan ({modules.length})</option>
                  {modules.map((m, idx) => (
                    <option key={m.id} value={idx + 1}>
                      Pertemuan {idx + 1}: {m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="lulus">Lulus KKM (≥70)</option>
                  <option value="remedial">Remedial (&lt;70)</option>
                  <option value="certified">Sertifikat Terbit</option>
                  <option value="pending_cert">Menunggu Sertifikat</option>
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
                  placeholder="Cari nama / User ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse" id="reportStudentTable">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-3.5">Peserta</th>
                  <th className="py-3.5 px-3">User ID</th>
                  <th className="py-3.5 px-3">Instansi / Komunitas</th>
                  <th className="py-3.5 px-3">Progres Pertemuan</th>
                  <th className="py-3.5 px-3">Nilai Kuis (KKM 70)</th>
                  <th className="py-3.5 px-3">Presensi Daring</th>
                  <th className="py-3.5 px-3">Status Sertifikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredPeserta.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data peserta yang cocok dengan kriteria filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredPeserta.map((p) => {
                    const cert = certificates.find((c) => c.name.toLowerCase() === p.name.toLowerCase());
                    const initials = p.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("");
                    const completedPertemuan = analytics.totalPertemuan > 0
                      ? Math.min(analytics.totalPertemuan, Math.max(0, Math.round(((p.progress ?? 0) / 100) * analytics.totalPertemuan)))
                      : 0;
                    const isPassed = p.score >= analytics.kkm;

                    // Presensi daring murni dari data kehadiran aktual
                    const userLogs = (zoomData.attendanceLogs || zoomData.attendance || []).filter(
                      (l) =>
                        l.verified &&
                        ((l.user_id && l.user_id === (p.user_id || p.npm)) ||
                         (l.name && l.name.toLowerCase() === p.name.toLowerCase()))
                    );
                    const attendedCount = userLogs.length;
                    const totalSessions = (zoomData.sessions || []).length;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        {/* Peserta Avatar & Name */}
                        <td className="py-3.5 px-3.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white flex items-center justify-center font-extrabold text-[10px] shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div className="leading-tight">
                            <div>{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{p.email}</div>
                          </div>
                        </td>

                        {/* User ID */}
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {p.user_id || p.npm}
                        </td>

                        {/* Institution */}
                        <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                          {p.institution || "-"}
                        </td>

                        {/* Pertemuan Selesai */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="font-extrabold text-syarat dark:text-syarat-light text-xs">
                              {completedPertemuan} / {analytics.totalPertemuan} Pertemuan
                            </div>
                            <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-syarat to-tigpad h-full rounded-full"
                                style={{ width: `${p.progress ?? 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Nilai Kuis */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-800 dark:text-white">
                              {p.score}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPassed
                                  ? "bg-green-500/15 text-green-600"
                                  : "bg-red-500/15 text-red-500"
                              }`}
                            >
                              {isPassed ? "Lulus" : "Remedial"}
                            </span>
                          </div>
                        </td>

                        {/* Presensi */}
                        <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                          {totalSessions > 0
                            ? `${attendedCount} / ${totalSessions} Sesi (${Math.min(100, Math.round((attendedCount / totalSessions) * 100))}%)`
                            : attendedCount > 0
                            ? `${attendedCount} Sesi Presensi`
                            : "0 Sesi"}
                        </td>

                        {/* Status Sertifikat */}
                        <td className="py-3.5 px-3">
                          {cert?.certIssued ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-[10px] inline-flex items-center gap-1">
                              <i className="fa-solid fa-check text-[9px]"></i>
                              <span>Sertifikat Terbit</span>
                            </span>
                          ) : isPassed && (p.progress ?? 0) >= 80 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 font-bold text-[10px] inline-flex items-center gap-1">
                              <i className="fa-solid fa-clock text-[9px]"></i>
                              <span>Menunggu Verifikasi</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-[10px]">
                              Belum Memenuhi Syarat
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

          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 pt-2 gap-2">
            <span>
              Menampilkan <strong>{filteredPeserta.length}</strong> dari total <strong>{analytics.totalPeserta}</strong> peserta pelatihan.
            </span>
            <span className="text-[11px]">
              Sistem Perhitungan Analitik Real-Time • Kolab SYARAT x TIGPAD
            </span>
          </div>
        </div>

        {/* Modal Penjelasan Rumus Sistem Perhitungan Analitik */}
        {showFormulaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowFormulaModal(false)}
            ></div>
            <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-syarat dark:text-syarat-light"></i>
                  <span>Rumus Sistem Perhitungan Analitik</span>
                </h3>
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-syarat dark:text-syarat-light">
                    1. Rata-Rata Nilai Kuis (Mean Score)
                  </div>
                  <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                    Rata-Rata = Σ(Skor Peserta) / Total Peserta
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-tigpad">
                    2. Tingkat Kelulusan KKM (Passing Rate)
                  </div>
                  <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                    Passing Rate (%) = (Peserta Skor ≥ 70 / Total Peserta) × 100%
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-purple-600 dark:text-purple-400">
                    3. Capaian Pertemuan Kurikulum
                  </div>
                  <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                    Rata-Rata Pertemuan = (Rata-Rata Progress (%) / 100) × {analytics.totalPertemuan} Pertemuan
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-amber-500">
                    4. Rasio Penerbitan Sertifikat
                  </div>
                  <p className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
                    Rasio Sertifikat (%) = (Sertifikat Terbit / Peserta Memenuhi Kriteria) × 100%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Kriteria: Nilai ≥ 70 DAN Progress Modul ≥ 80%.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="btn-duotone px-5 py-2 rounded-xl font-bold text-xs shadow"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
