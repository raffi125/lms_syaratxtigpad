"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";

export default function DashboardPage() {
  const { currentRole, currentUser, modules, zoomData, certificates, activities, clearActivities } = useApp();
  const [greeting, setGreeting] = useState("Selamat Belajar");
  const [highScore, setHighScore] = useState(480);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Selamat Pagi");
    else if (hour >= 12 && hour < 15) setGreeting("Selamat Siang");
    else if (hour >= 15 && hour < 18) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");

    setHighScore(currentUser.score ? Math.max(currentUser.score, 480) : 480);
  }, [currentUser.score]);

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const userCert = certificates.find(
    (c) => c.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const isPeserta = currentRole === "peserta";
  const isMentor = currentRole === "mentor";
  const isAdmin = currentRole === "admin";

  return (
    <DashboardLayout>
      {/* Welcome Banner */}
      <div className="glass-card p-5 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2 max-w-lg z-10">
          <span
            id="overviewTimeGreeting"
            className="px-3 py-1 rounded-full bg-tigpad/15 text-tigpad text-xs font-bold border border-tigpad/30 inline-block"
          >
            {greeting} • Pertemuan Aktif BISINDO 2026
          </span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug">
            Halo,{" "}
            <span
              id="overviewWelcomeName"
              className="bg-gradient-to-r from-syarat to-tigpad bg-clip-text text-transparent"
            >
              {currentUser.name}
              {isMentor ? " (Mentor)" : isAdmin ? " (Admin)" : ""}
            </span>
            ! 👋
          </h1>
          <p
            id="overviewWelcomeSub"
            className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
          >
            {isPeserta &&
              "Pantau statistik belajar BISINDO Anda, ikuti kuis evaluasi 30 menit, dan klaim sertifikat resmi."}
            {isMentor &&
              "Kelola konten modul, kode presensi sesi Zoom, bank soal kuis, serta verifikasi penerbitan sertifikat peserta."}
            {isAdmin &&
              "Pantau integritas sistem LMS, manajemen pengguna umum, dan rekapitulasi analitik komprehensif."}
          </p>
        </div>

        {/* Animated Progress Ring Widget (For Peserta) */}
        {isPeserta && (
          <div
            id="overviewProgressWidget"
            className="flex items-center gap-4 bg-white/90 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm z-10 w-full sm:w-auto justify-center"
          >
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
              <svg className="w-14 h-14 sm:w-16 sm:h-16">
                <circle
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                  r="24"
                  cx="28"
                  cy="28"
                />
                <circle
                  className="text-tigpad"
                  strokeWidth="6"
                  strokeDasharray="150.79"
                  strokeDashoffset={150.79 - (150.79 * progressPercent) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="24"
                  cx="28"
                  cy="28"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {progressPercent}%
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Progress Kurikulum</div>
              <div className="text-sm font-extrabold text-syarat dark:text-syarat-light">
                {completedCount} dari {totalCount} Pertemuan
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bento Overview Grid (Role-Adaptive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" id="bentoStatsGrid">
        <Link
          href="/kuis"
          className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 hover:border-syarat transition-all group"
        >
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                currentUser.score && currentUser.score >= 70
                  ? "text-green-500 bg-green-500/10"
                  : currentUser.score && currentUser.score > 0
                  ? "text-amber-500 bg-amber-500/10"
                  : "text-slate-400 bg-slate-500/10"
              }`}
              id="stat1Tag"
            >
              {currentUser.score && currentUser.score >= 70
                ? "Lulus"
                : currentUser.score && currentUser.score > 0
                ? "Remedial"
                : "Belum Ada Nilai"}
            </span>
          </div>
          <div>
            <div
              className="text-2xl font-black group-hover:text-syarat transition-colors"
              id="overviewStat1"
            >
              {currentUser.score && currentUser.score > 0 ? `${currentUser.score} / 100` : "Belum Ujian"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5" id="stat1Label">
              Nilai Kuis Terbaru →
            </div>
          </div>
        </Link>

        <Link
          href="/zoom"
          className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 hover:border-tigpad transition-all group"
        >
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-xl bg-tigpad/10 text-tigpad flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <span
              className="text-[11px] font-bold text-tigpad bg-tigpad/10 px-2 py-0.5 rounded-md"
              id="stat2Tag"
            >
              {(zoomData.attendance || zoomData.attendanceLogs)?.length
                ? `${(zoomData.attendance || zoomData.attendanceLogs).length} Hadir`
                : "0 Hadir"}
            </span>
          </div>
          <div>
            <div
              className="text-2xl font-black group-hover:text-tigpad transition-colors"
              id="overviewStat2"
            >
              {zoomData.sessions?.length || 0} Sesi
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5" id="stat2Label">
              Presensi Zoom Tuntas →
            </div>
          </div>
        </Link>

        <Link
          href="/game"
          className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 hover:border-purple-500 transition-all group"
        >
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-gamepad"></i>
            </div>
            <span
              className="text-[11px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md"
              id="statGameTag"
            >
              Skor: {highScore}
            </span>
          </div>
          <div>
            <div
              className="text-2xl font-black group-hover:text-purple-500 transition-colors"
              id="overviewStatGame"
            >
              Arcade BISINDO
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5" id="statGameLabel">
              Ejaan, Refleks & Memori Kartu →
            </div>
          </div>
        </Link>

        <Link
          href="/sertifikat"
          className="glass-card p-5 sm:p-6 rounded-3xl space-y-3 hover:border-amber-500 transition-all group"
        >
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-award"></i>
            </div>
            <span
              id="overviewCertBadge"
              className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md"
            >
              {userCert?.certIssued ? "Diterbitkan" : "Proses Verifikasi"}
            </span>
          </div>
          <div>
            <div
              className="text-2xl font-black group-hover:text-amber-500 transition-colors"
              id="overviewStat3"
            >
              {userCert?.certIssued ? "Tersedia" : "Menunggu"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5" id="stat3Label">
              Status Sertifikat Resmi →
            </div>
          </div>
        </Link>
      </div>

      {/* Continue Learning Card (For Peserta) */}
      {isPeserta && (
        <div
          id="continueLearningCard"
          className="glass-card p-5 sm:p-7 rounded-3xl space-y-4 border border-slate-200 dark:border-slate-800"
        >
          {modules.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-tigpad">
                    Lanjutkan Belajar Terakhir
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                    {(modules.find((m) => !m.completed) || modules[0]).title}
                  </h3>
                </div>
                <Link
                  href="/modul"
                  className="btn-duotone px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 w-fit"
                >
                  <i className="fa-solid fa-play text-xs"></i>
                  <span>Buka Modul Belajar</span>
                </Link>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Progress Kurikulum</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-syarat to-tigpad h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Kurikulum Pembelajaran
                </span>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                  Belum ada modul aktif di kurikulum database
                </h3>
                <p className="text-xs text-slate-500">
                  Materi pelatihan akan segera diterbitkan oleh instruktur.
                </p>
              </div>
              <Link
                href="/modul"
                className="btn-duotone px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 w-fit"
              >
                <span>Lihat Modul</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Activities & Live Zoom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activities Timeline */}
        <div className="lg:col-span-7 glass-card p-5 sm:p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-syarat dark:text-syarat-light"></i>
              <span id="timelineTitle">Aktivitas Pembelajaran Terbaru</span>
            </h3>
            {activities.length > 0 && (
              <button
                onClick={clearActivities}
                className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors"
                title="Bersihkan riwayat aktivitas"
              >
                Bersihkan
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs" id="timelineList">
            {activities.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-list-check"></i>
                </div>
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    Belum Ada Aktivitas Pembelajaran
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                    Selesaikan materi modul, ikuti evaluasi kuis, atau presensi sesi Zoom untuk mencatat riwayat belajar Anda secara otomatis.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/modul"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-syarat text-white text-xs font-bold shadow hover:bg-syarat/90 transition-all"
                  >
                    <i className="fa-solid fa-book-open"></i>
                    <span>Mulai Belajar Modul</span>
                  </Link>
                </div>
              </div>
            ) : (
              activities.slice(0, 5).map((act) => {
                const badgeColorClass =
                  act.statusBadge === "green"
                    ? "bg-green-500/15 text-green-600"
                    : act.statusBadge === "blue"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : act.statusBadge === "purple"
                    ? "bg-purple-500/15 text-purple-600"
                    : "bg-amber-500/15 text-amber-600";

                const iconBgClass =
                  act.category === "modul"
                    ? "bg-syarat/15 text-syarat dark:text-syarat-light"
                    : act.category === "zoom"
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : act.category === "kuis"
                    ? "bg-green-500/15 text-green-600"
                    : act.category === "sertifikat"
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-purple-500/15 text-purple-600";

                return (
                  <div
                    key={act.id}
                    className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/70 flex items-center justify-between border border-slate-200/80 dark:border-slate-800 shadow-sm gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${iconBgClass}`}
                      >
                        <i className={act.icon}></i>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {act.description} • {act.timestamp}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${badgeColorClass}`}
                    >
                      {act.statusText}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Zoom Session Card */}
        <div className="lg:col-span-5 glass-card p-5 sm:p-6 rounded-3xl space-y-4 bg-gradient-to-br from-syarat/10 via-transparent to-tigpad/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-headset text-tigpad"></i> Sesi Live Zoom
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  zoomData.sessions && zoomData.sessions.length > 0
                    ? "bg-tigpad/20 text-tigpad animate-pulse"
                    : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {zoomData.sessions && zoomData.sessions.length > 0 ? "Mendatang" : "Belum Ada Sesi"}
              </span>
            </div>

            {zoomData.sessions && zoomData.sessions.length > 0 ? (
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-extrabold text-sm text-syarat dark:text-syarat-light">
                  {zoomData.sessions[0].title}
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Sesi tatap muka interaktif bersama Host: {zoomData.sessions[0].host}.
                </p>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    <i className="fa-regular fa-clock text-tigpad mr-1"></i> {zoomData.sessions[0].date}
                  </span>
                  <span className="font-mono font-bold text-syarat dark:text-syarat-light">
                    ID: {zoomData.sessions[0].meetingId}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1 text-center">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Belum Ada Sesi Zoom Terjadwal
                </div>
                <p className="text-[11px]">
                  Jadwal pertemuan daring akan diterbitkan oleh instruktur.
                </p>
              </div>
            )}
          </div>

          <Link
            href="/zoom"
            className="btn-duotone w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md"
          >
            <i className="fa-solid fa-video"></i>
            <span>Buka Jadwal & Presensi Zoom</span>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
