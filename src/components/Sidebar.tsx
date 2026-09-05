"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { currentRole, unreadNotifCount } = useApp();

  const isMentor = currentRole === "mentor";
  const isAdmin = currentRole === "admin";
  const isPeserta = currentRole === "peserta";

  const getRoleIcon = () => {
    if (isMentor) return "fa-solid fa-chalkboard-user";
    if (isAdmin) return "fa-solid fa-user-shield";
    return "fa-solid fa-user-graduate";
  };

  const getRoleTitle = () => {
    if (isMentor) return "Mode Mentor";
    if (isAdmin) return "Mode Admin";
    return "Mode Peserta";
  };

  return (
    <aside id="sidebarNav" className="glass-card p-4 rounded-3xl h-fit space-y-6">
      {/* Role Profile Header */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-syarat/10 to-tigpad/10 border border-syarat/20 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl bg-syarat text-white flex items-center justify-center font-bold text-lg shadow overflow-hidden flex-shrink-0"
          id="sidebarAvatarBox"
        >
          <i id="sidebarRoleIcon" className={getRoleIcon()}></i>
        </div>
        <div>
          <h3 id="sidebarRoleTitle" className="font-extrabold text-sm">
            {getRoleTitle()}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isMentor ? "Instruktur & Evaluator" : isAdmin ? "Manajemen Sistem" : "Peserta Umum Aktif"}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1 text-xs font-semibold">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
          Menu Utama
        </div>

        {/* Overview */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/dashboard"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-chart-pie text-sm"></i>
          <span>Overview</span>
        </Link>

        {/* Profil Saya & Foto (Peserta & Mentor) */}
        {!isAdmin && (
          <Link
            id="navItem_profile"
            href="/profile"
            className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
              pathname === "/profile"
                ? "sidebar-active"
                : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
            }`}
          >
            <i className="fa-solid fa-user-gear text-sm"></i>
            <span>Profil Saya & Foto</span>
          </Link>
        )}

        {/* Modul */}
        <Link
          href="/modul"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/modul"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-book-open text-sm"></i>
          <span id="navText_modul">
            {isMentor || isAdmin ? "Kelola Modul" : "Modul Video & PDF"}
          </span>
        </Link>

        {/* Zoom */}
        <Link
          href="/zoom"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/zoom"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-headset text-sm"></i>
          <span id="navText_zoom">
            {isMentor || isAdmin ? "Kelola Zoom & Presensi" : "Zoom & Presensi"}
          </span>
        </Link>

        {/* Kuis */}
        <Link
          href="/kuis"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/kuis"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-stopwatch-20 text-sm"></i>
          <span id="navText_kuis">
            {isMentor || isAdmin ? "Kelola Kuis & Soal" : "Kuis Evaluasi"}
          </span>
        </Link>

        {/* Game */}
        <Link
          href="/game"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/game"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-gamepad text-sm text-purple-500"></i>
          <span id="navText_game">Game BISINDO</span>
        </Link>

        {/* Sertifikat */}
        <Link
          href="/sertifikat"
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/sertifikat"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <i className="fa-solid fa-award text-sm"></i>
          <span id="navText_sertifikat">
            {isMentor || isAdmin ? "Kelola Sertifikat" : "Verifikasi Sertifikat"}
          </span>
        </Link>

        {/* Notifikasi & Pengumuman */}
        <Link
          href="/notifikasi"
          className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all ${
            pathname === "/notifikasi"
              ? "sidebar-active"
              : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-bell text-sm text-amber-500"></i>
            <span id="navText_notifikasi">
              {isMentor || isAdmin ? "Kelola Notifikasi" : "Pusat Notifikasi"}
            </span>
          </div>
          {unreadNotifCount > 0 && (
            <span className="badge badge-error badge-xs text-[10px] text-white px-2 py-0.5 font-bold shadow-sm animate-pulse">
              {unreadNotifCount}
            </span>
          )}
        </Link>

        {/* Khusus Admin Section */}
        {isAdmin && (
          <div id="adminNavSection" className="pt-4 space-y-1">
            <div className="text-[10px] font-bold text-tigpad uppercase tracking-wider px-3 py-1 flex items-center gap-1">
              <i className="fa-solid fa-shield-halved"></i> Khusus Admin
            </div>
            <Link
              href="/users"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
                pathname === "/users"
                  ? "sidebar-active"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
              }`}
            >
              <i className="fa-solid fa-users-gear text-sm"></i>
              <span>Kelola User</span>
            </Link>
            <Link
              href="/tickets"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
                pathname === "/tickets"
                  ? "sidebar-active"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
              }`}
            >
              <i className="fa-solid fa-ticket text-sm text-orange-500"></i>
              <span>Tiket Bantuan</span>
            </Link>
          </div>
        )}

        {/* Mentor / Admin Reports Section */}
        {(isMentor || isAdmin) && (
          <div id="reportNavSection" className="pt-2 space-y-1">
            <Link
              href="/reports"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
                pathname === "/reports"
                  ? "sidebar-active"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
              }`}
            >
              <i className="fa-solid fa-file-invoice text-sm"></i>
              <span>Laporan & Analitik</span>
            </Link>
            <Link
              href="/jawaban-kuis"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${
                pathname === "/jawaban-kuis"
                  ? "sidebar-active"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
              }`}
            >
              <i className="fa-solid fa-list-check text-sm text-tigpad"></i>
              <span>Jawaban Kuis</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Helpdesk Info Box */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/80 text-[11px] space-y-2 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-syarat dark:text-syarat-light font-bold">
          <i className="fa-solid fa-circle-info"></i> Pusat Bantuan LMS
        </div>
        <p className="text-slate-500 leading-tight">
          Kendala presensi atau verifikasi sertifikat? Hubungi helpdesk layanan.
        </p>
      </div>
    </aside>
  );
}
