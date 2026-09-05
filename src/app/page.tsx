"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { SupportTicket } from "@/types";

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number>(0);

  // State Sistem Tiket Bantuan Tim IT
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isMyTicketsModalOpen, setIsMyTicketsModalOpen] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketCategory, setTicketCategory] = useState<SupportTicket["category"]>("akun");
  const [ticketPriority, setTicketPriority] = useState<SupportTicket["priority"]>("sedang");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [submittedTickets, setSubmittedTickets] = useState<SupportTicket[]>([]);
  const [createdTicketSuccess, setCreatedTicketSuccess] = useState<SupportTicket | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  useEffect(() => {
    // Inisialisasi tema dari sistem/dokumen
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }

    // Ambil daftar antrean tiket langsung dari backend API (Tanpa LocalStorage)
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data)) {
          setSubmittedTickets(resData.data);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat tiket dari backend:", err);
      });
  }, []);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim() || !ticketEmail.trim() || !ticketSubject.trim() || !ticketDesc.trim()) {
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ticketName.trim(),
          email: ticketEmail.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          subject: ticketSubject.trim(),
          description: ticketDesc.trim(),
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.ticket) {
        setSubmittedTickets((prev) => [resData.ticket, ...prev.filter((t) => t.id !== resData.ticket.id)]);
        setCreatedTicketSuccess(resData.ticket);
      }
    } catch (err) {
      console.error("Gagal mengirim tiket ke Tim IT:", err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleCopyTicket = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedTicketId(true);
      setTimeout(() => setCopiedTicketId(false), 2000);
    }
  };

  const resetTicketForm = () => {
    setTicketName("");
    setTicketEmail("");
    setTicketCategory("akun");
    setTicketPriority("sedang");
    setTicketSubject("");
    setTicketDesc("");
    setCreatedTicketSuccess(null);
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };


  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen relative flex flex-col antialiased selection:bg-tigpad selection:text-white overflow-x-hidden">
      {/* Ambient Glowing Orbs Background */}
      <div className="orb-container">
        <div className="orb orb-blue"></div>
        <div className="orb orb-orange"></div>
        <div className="orb orb-purple"></div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 glass-nav transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-slate-600 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 focus:outline-none"
              aria-label="Buka Menu Mobile"
            >
              <i className="fa-solid fa-bars text-lg"></i>
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logo_tigpad_syarat.png"
                alt="Logo SYARAT X TIGPAD"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl drop-shadow group-hover:scale-105 transition-transform flex-shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-black text-base sm:text-lg tracking-tight leading-none">
                  <span className="text-syarat dark:text-syarat-light">SYARAT</span>{" "}
                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">X</span>{" "}
                  <span className="text-tigpad font-black">TIGPAD</span>
                </span>
                <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase mt-0.5">
                  KOLAB BISINDO
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop & Tablet Menu Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#fitur" className="hover:text-syarat dark:hover:text-tigpad transition-colors">
              Fitur Unggulan
            </a>
            <a href="#modul" className="hover:text-syarat dark:hover:text-tigpad transition-colors">
              Kurikulum Modul
            </a>
            <a href="#faq" className="hover:text-syarat dark:hover:text-tigpad transition-colors">
              FAQ
            </a>
            <a
              href="#kontak"
              className="hover:text-syarat dark:hover:text-tigpad transition-colors font-bold text-tigpad"
            >
              Kontak CP
            </a>
          </nav>

          {/* Right Controls: Dark Mode & Login Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleDarkMode}
              aria-label="Ubah Tema Display"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 transition-colors shadow-sm"
            >
              <i
                className={
                  isDark
                    ? "fa-solid fa-sun text-amber-400 text-sm sm:text-base"
                    : "fa-solid fa-moon text-slate-700 text-sm sm:text-base"
                }
              ></i>
            </button>

            <Link
              href="/register"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <i className="fa-solid fa-user-plus text-tigpad"></i>
              <span>Daftar</span>
            </Link>

            <Link
              href="/login"
              className="btn-duotone px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-md"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span className="hidden xs:inline sm:inline">Masuk Portal</span>
              <span className="inline xs:hidden sm:hidden">Masuk</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-8">
        {/* Header Floating Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold shadow-sm backdrop-blur-md max-w-full">
          <span className="w-2.5 h-2.5 rounded-full bg-tigpad animate-ping flex-shrink-0"></span>
          <span className="bg-gradient-to-r from-syarat via-blue-600 to-tigpad bg-clip-text text-transparent font-extrabold truncate">
            Platform Pembelajaran BISINDO Inklusif & Terbuka
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight sm:leading-tight">
          Belajar Bahasa Isyarat Indonesia dengan{" "}
          <span className="bg-gradient-to-r from-syarat via-blue-600 to-tigpad bg-clip-text text-transparent">
            Mudah, Terstruktur, & Inklusif
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Inisiatif kolaboratif <strong className="text-syarat dark:text-syarat-light">SYARAT</strong> &{" "}
          <strong className="text-tigpad">TIGPAD</strong> untuk mewujudkan ekosistem pembelajaran yang ramah
          disabilitas dan terbuka untuk semua. Dilengkapi video pembelajaran interaktif, dokumen PDF ringkas,
          presensi kelas Zoom daring, kuis evaluasi 30 menit, dan sertifikat kelulusan resmi.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto justify-center pt-2">
          <Link
            href="/register"
            className="btn-duotone px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2.5 hover:scale-105 transition-transform"
          >
            <i className="fa-solid fa-user-plus text-sm sm:text-base"></i>
            <span>Daftar Akun Baru</span>
          </Link>
          <Link
            href="/login"
            className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl glass-card text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-right-to-bracket text-syarat dark:text-syarat-light"></i>
            <span>Masuk Portal</span>
          </Link>
          <a
            href="#modul"
            className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl glass-card text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-book-open text-syarat dark:text-syarat-light"></i>
            <span>Kurikulum Modul</span>
          </a>
        </div>

        {/* Hero Feature Showcase Grid */}
        <div className="w-full max-w-5xl pt-6 sm:pt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            {/* Card 1: 6 Pertemuan Video & PDF */}
            <div className="glass-card p-5 rounded-3xl space-y-3 hover:border-syarat transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-book-open"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  6 Pertemuan Terstruktur
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Kurikulum lengkap dari budaya Tuli hingga simulasi percakapan & evaluasi.
                </p>
              </div>
            </div>

            {/* Card 2: Kuis Evaluasi */}
            <div className="glass-card p-5 rounded-3xl space-y-3 hover:border-tigpad transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-tigpad/10 text-tigpad flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-stopwatch-20"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  Kuis Proctoring 30 Menit
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Ujian evaluasi terwaktu dengan sistem anti-curang otomatis.
                </p>
              </div>
            </div>

            {/* Card 3: Game Edukasi Arcade Hub */}
            <div className="glass-card p-5 rounded-3xl space-y-3 hover:border-purple-500 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-gamepad"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  3 Game Arcade BISINDO
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  BisindoSpelling Ejaan, Sign Rush 4 Pilihan Refleks, & Memory Match Kartu 3D.
                </p>
              </div>
            </div>

            {/* Card 4: Sertifikat Digital */}
            <div className="glass-card p-5 rounded-3xl space-y-3 hover:border-amber-500 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg font-bold group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-award"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  Sertifikat Kelulusan Resmi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  Sertifikat kelulusan digital ber-QR Code terverifikasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full max-w-4xl pt-2 sm:pt-4">
          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-1 hover:border-syarat transition-all">
            <div className="text-xl sm:text-3xl font-black text-syarat dark:text-syarat-light">100%</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">Materi Inklusif</div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-1 hover:border-tigpad transition-all">
            <div className="text-xl sm:text-3xl font-black text-tigpad">6 Sesi</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">
              Pertemuan Terstruktur
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-1 hover:border-syarat transition-all">
            <div className="text-xl sm:text-3xl font-black text-syarat dark:text-syarat-light">30 Menit</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">
              Timer Kuis Ujian
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-1 hover:border-amber-500 transition-all">
            <div className="text-xl sm:text-3xl font-black text-amber-500">Official</div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">
              Sertifikat Resmi
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="fitur"
        className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10"
      >
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-xs font-bold">
            Fitur Utama Platform
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Ekosistem Belajar Modern & Terintegrasi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Setiap komponen LMS didesain intuitif untuk kenyamanan seluruh peserta pembelajaran.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Feature 1 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-syarat transition-all">
            <div className="w-11 h-11 rounded-2xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-book-open"></i>
            </div>
            <h3 className="font-extrabold text-base">Materi & Modul Inklusif (Video + PDF)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kurikulum terstruktur berbasis modul visual yang dilengkapi pemutar video tutorial serta
              dokumen ringkasan PDF resmi.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-emerald-500 transition-all">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-video"></i>
            </div>
            <h3 className="font-extrabold text-base">Kelas Zoom Live & Presensi Daring</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Jadwal sinkron tatap muka maya via Zoom dengan penghitung mundur otomatis, salin ID 1-klik, dan form
              presensi check-in.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-purple-500 transition-all">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-gamepad"></i>
            </div>
            <h3 className="font-extrabold text-base">BISINDO Arcade Hub (3 Mode Game)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Latih ketangkasan melalui 3 game: BisindoSpelling Ejaan Kata, Sign Rush 4 Pilihan Refleks, dan Memory
              Match Kartu 3D.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-tigpad transition-all">
            <div className="w-11 h-11 rounded-2xl bg-tigpad/10 text-tigpad flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-stopwatch-20"></i>
            </div>
            <h3 className="font-extrabold text-base">Kuis Evaluasi & Anti-Curang 30 Menit</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Ujian evaluasi berbobot dengan timer persisten, deteksi proctoring anti-curang, ulasan nilai instan,
              dan pop-up kelulusan.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-amber-500 transition-all">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-award"></i>
            </div>
            <h3 className="font-extrabold text-base">E-Sertifikat Resmi Ber-QR Code</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Penerbitan sertifikat resmi kelulusan berstempel digital dengan kode verifikasi QR Code terdaftar.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-card p-5 sm:p-7 rounded-3xl space-y-3 hover:border-indigo-500 transition-all">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-gauge-high"></i>
            </div>
            <h3 className="font-extrabold text-base">Dashboard Analitik & Multi-Peran</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hak akses fleksibel untuk Peserta Umum, Mentor (Kelola Soal & Bank Kata), serta Administrator
              (Laporan & Pengguna).
            </p>
          </div>
        </div>
      </section>

      {/* Modules Section: 6 Pertemuan Kurikulum Lengkap */}
      <section
        id="modul"
        className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10"
      >
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-tigpad/10 text-tigpad text-xs font-bold">
            Silabus & Kurikulum Terstruktur
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Kurikulum 6 Pertemuan Pembelajaran BISINDO
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Dirancang bertahap dari pemahaman budaya Tuli, gestur dasar, percakapan sehari-hari & profesional, hingga simulasi dan
            evaluasi kelulusan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pertemuan 1 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-xs">
                  <i className="fa-solid fa-book-open mr-1"></i> Pertemuan 1
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">
                Komunikasi, Inklusi & Budaya Tuli
              </h3>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                {/* Subtopic 1 */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                    <i className="fa-solid fa-people-arrows"></i>
                    <span>Komunikasi & Inklusi:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                    <li>Hak komunikasi</li>
                    <li>Hambatan komunikasi</li>
                    <li>Aksesibilitas</li>
                    <li>Pengalaman nyata Tuli</li>
                  </ul>
                </div>

                {/* Subtopic 2 */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="font-bold text-tigpad flex items-center gap-1.5">
                    <i className="fa-solid fa-hand-holding-heart"></i>
                    <span>Ketulian & Budaya Tuli:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                    <li>Apa itu ketulian</li>
                    <li>Perspektif Tuli & Budaya Tuli</li>
                    <li>Identitas Tuli</li>
                    <li>Etika komunikasi</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-chalkboard-user text-tigpad"></i> Instruktur: Tutor BISINDO 1
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                Modul 1
              </span>
            </div>
          </div>

          {/* Pertemuan 2 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-xs">
                  <i className="fa-solid fa-hands-asl-interpreting mr-1"></i> Pertemuan 2
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">Bahasa Isyarat Dasar (1)</h3>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i>
                  <span>Materi & Praktik Pembelajaran:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Alfabet Jari:</strong> Bentuk gestur abjad jemari tangan (BisindoSpelling A–Z)
                  </li>
                  <li>
                    <strong>Salam:</strong> Sapaan selamat pagi, siang, sore, malam & terima kasih
                  </li>
                  <li>
                    <strong>Perkenalan Diri:</strong> Menyampaikan nama isyarat dan identitas diri
                  </li>
                  <li>
                    <strong>Nama Kota:</strong> Isyarat kota-kota besar di Indonesia (Bandung, Sumedang,
                    Jakarta, dll.)
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-chalkboard-user text-tigpad"></i> Instruktur: Tutor BISINDO 2
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                Modul 2
              </span>
            </div>
          </div>

          {/* Pertemuan 3 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-xs">
                  <i className="fa-solid fa-house-user mr-1"></i> Pertemuan 3
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">Bahasa Isyarat Dasar (2)</h3>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i>
                  <span>Materi & Praktik Pembelajaran:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Keluarga:</strong> Isyarat Ayah, Ibu, Kakak, Adik, Kakek, Nenek, & Saudara
                  </li>
                  <li>
                    <strong>Aktivitas Sehari-hari:</strong> Makan, minum, tidur, belajar, mandi, & bekerja
                  </li>
                  <li>
                    <strong>Kata Kerja Rutinitas:</strong> Menggabungkan isyarat waktu dan aksi harian
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-chalkboard-user text-tigpad"></i> Instruktur: Tutor BISINDO 1
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                Modul 3
              </span>
            </div>
          </div>

          {/* Pertemuan 4 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-xs">
                  <i className="fa-solid fa-building-columns mr-1"></i> Pertemuan 4
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">Bahasa Isyarat Dasar (3)</h3>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i>
                  <span>Materi & Praktik Pembelajaran:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Angka, Uang, Belanja:</strong> Bilangan satuan hingga ratusan ribu, harga &
                    transaksi belanja
                  </li>
                  <li>
                    <strong>Fasilitas Umum & Ruang Belajar:</strong> Istilah gedung pertemuan, perpustakaan, ruang
                    publik, administrasi, & ujian
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-chalkboard-user text-tigpad"></i> Instruktur: Tutor BISINDO 2
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                Modul 4
              </span>
            </div>
          </div>

          {/* Pertemuan 5 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-xs">
                  <i className="fa-solid fa-comments mr-1"></i> Pertemuan 5
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">Percakapan Dasar BISINDO</h3>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i>
                  <span>Materi & Praktik Pembelajaran:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Tanya Jawab Sederhana:</strong> Struktur kalimat tanya (Apa, Siapa, Di mana, Kapan,
                    Mengapa, Bagaimana)
                  </li>
                  <li>
                    <strong>Latihan Komunikasi:</strong> Simulasi percakapan interaktif dua arah dengan ekspresi
                    wajah (non-manual markers)
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-chalkboard-user text-tigpad"></i> Instruktur: Tutor BISINDO 1
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                Modul 5
              </span>
            </div>
          </div>

          {/* Pertemuan 6 */}
          <div className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between hover:border-syarat transition-all border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-xs border border-green-500/30">
                  <i className="fa-solid fa-award mr-1"></i> Pertemuan 6 • Evaluasi
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  <i className="fa-solid fa-clock text-tigpad mr-1"></i> 90 Menit
                </span>
              </div>

              <h3 className="font-black text-lg text-slate-800 dark:text-white">Simulasi & Evaluasi Kelulusan</h3>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i>
                  <span>Materi & Praktik Pembelajaran:</span>
                </div>
                <ul className="space-y-1.5 text-[11px] pl-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>
                    <strong>Storytelling:</strong> Menyampaikan cerita singkat bertema bebas dengan bahasa
                    isyarat
                  </li>
                  <li>
                    <strong>Praktik Percakapan:</strong> Roleplay situasi percakapan nyata sehari-hari
                  </li>
                  <li>
                    <strong>Evaluasi Ringan:</strong> Uji kompetensi akhir untuk penerbitan e-sertifikat resmi
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                <i className="fa-solid fa-users text-tigpad"></i> Tim Instruktur SYARAT x TIGPAD
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold">
                Evaluasi Akhir
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section
        id="faq"
        className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8"
      >
        <div className="text-center space-y-2">
          <span className="px-3 py-1 rounded-full bg-tigpad/10 text-tigpad text-xs font-bold">
            Pertanyaan Umum
          </span>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight">Pertanyaan yang Sering Diajukan</h2>
        </div>

        <div className="space-y-3">
          <div
            className={`collapse collapse-plus glass-card rounded-2xl border border-slate-200 dark:border-slate-800 ${
              openFaq === 0 ? "collapse-open" : "collapse-close"
            }`}
          >
            <div
              className="collapse-title text-sm font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer"
              onClick={() => setOpenFaq(openFaq === 0 ? -1 : 0)}
            >
              Apakah pelatihan BISINDO ini mendapatkan sertifikat resmi?
            </div>
            <div className="collapse-content text-xs text-slate-600 dark:text-slate-400">
              <p>
                Ya, peserta umum yang menyelesaikan seluruh modul dan mencapai nilai kuis minimal 75 akan
                mendapatkan sertifikat resmi berstempel digital yang diverifikasi langsung oleh Mentor BISINDO.
              </p>
            </div>
          </div>

          <div
            className={`collapse collapse-plus glass-card rounded-2xl border border-slate-200 dark:border-slate-800 ${
              openFaq === 1 ? "collapse-open" : "collapse-close"
            }`}
          >
            <div
              className="collapse-title text-sm font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer"
              onClick={() => setOpenFaq(openFaq === 1 ? -1 : 1)}
            >
              Bagaimana jika waktu pengerjaan kuis terputus koneksi?
            </div>
            <div className="collapse-content text-xs text-slate-600 dark:text-slate-400">
              <p>
                Sistem kuis dilengkapi timer persisten di penyimpanan peramban. Jika terjadi refresh atau terputus
                koneksi, waktu ujian akan melanjut dari detik tersisa saat Anda masuk kembali.
              </p>
            </div>
          </div>

          <div
            className={`collapse collapse-plus glass-card rounded-2xl border border-slate-200 dark:border-slate-800 ${
              openFaq === 2 ? "collapse-open" : "collapse-close"
            }`}
          >
            <div
              className="collapse-title text-sm font-extrabold text-slate-800 dark:text-slate-100 cursor-pointer"
              onClick={() => setOpenFaq(openFaq === 2 ? -1 : 2)}
            >
              Bagaimana cara kerja mini game latihan BisindoSpelling?
            </div>
            <div className="collapse-content text-xs text-slate-600 dark:text-slate-400">
              <p>
                Game ini akan menampilkan rangkaian peraga huruf BISINDO per huruf dengan animasi sprite. Tugas
                Anda adalah mengetik kata yang dieja sebelum timer habis!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Mentors & IT Ticket System Section */}
      <section
        id="kontak"
        className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10"
      >
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="px-3 py-1 rounded-full bg-tigpad/10 text-tigpad text-xs font-bold inline-flex items-center gap-1.5">
            <i className="fa-solid fa-headset"></i> Layanan Narahubung & Dukungan Terpadu
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Hubungi 3 Mentor BISINDO & Bantuan Tim IT
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            3 Mentor berfokus pada bimbingan materi akademik (Semua Pertemuan 1 s/d 6). Untuk kendala teknis dan penanganan Server Error Next.js, silakan buat tiket langsung ke Tim IT di bawah.
          </p>
        </div>

        {/* 3 Mentor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Mentor 1: Muhammad Alp Arsalan */}
          <div className="glass-card p-6 rounded-3xl space-y-4 hover:border-syarat transition-all flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center font-bold text-lg">
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-extrabold uppercase">
                  Mentor 1 • Semua Pertemuan
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Muhammad Alp Arsalan
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mentor Pembelajaran & Budaya Inklusif
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Konsultasi materi seluruh pertemuan (Pertemuan 1–6): Hak komunikasi, budaya Tuli, pemahaman identitas, dan gestur dasar BISINDO.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                  <i className="fa-solid fa-layer-group text-syarat"></i>
                  <span>Fokus: Semua Pertemuan (1 s/d 6)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  <i className="fa-solid fa-phone text-slate-400"></i>
                  <span>+62 822-9577-4074</span>
                </div>
              </div>
            </div>
            <a
              href="https://wa.me/6282295774074?text=Halo%20Mentor%20Muhammad%20Alp%20Arsalan,%20saya%20peserta%20pelatihan%20BISINDO%20ingin%20konsultasi%20materi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-syarat hover:bg-syarat/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all mt-2"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span>Hubungi Alp Arsalan (+62 822-9577-4074)</span>
            </a>
          </div>

          {/* Mentor 2: Muhammad Ryandra Zaki */}
          <div className="glass-card p-6 rounded-3xl space-y-4 hover:border-tigpad transition-all flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-tigpad/15 text-tigpad flex items-center justify-center font-bold text-lg">
                  <i className="fa-solid fa-hands-asl-interpreting"></i>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-tigpad/10 text-tigpad text-[10px] font-extrabold uppercase">
                  Mentor 2 • Semua Pertemuan
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Muhammad Ryandra Zaki
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mentor Tata Bahasa & Morfologi Isyarat
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Konsultasi materi seluruh pertemuan (Pertemuan 1–6): Kosa kata angka, fasilitas umum, struktur tanya-jawab 5W+1H, dan mimik wajah (NMM).
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                  <i className="fa-solid fa-layer-group text-tigpad"></i>
                  <span>Fokus: Semua Pertemuan (1 s/d 6)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  <i className="fa-solid fa-phone text-slate-400"></i>
                  <span>+62 899-0887-429</span>
                </div>
              </div>
            </div>
            <a
              href="https://wa.me/628990887429?text=Halo%20Mentor%20Muhammad%20Ryandra%20Zaki,%20saya%20peserta%20pelatihan%20BISINDO%20ingin%20konsultasi%20materi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-tigpad hover:bg-tigpad/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all mt-2"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span>Hubungi Ryandra Zaki (+62 899-0887-429)</span>
            </a>
          </div>

          {/* Mentor 3: Raffi Fauzan */}
          <div className="glass-card p-6 rounded-3xl space-y-4 hover:border-purple-500 transition-all flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold uppercase">
                  Mentor 3 • Semua Pertemuan
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Raffi Fauzan
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mentor Praktik Interaktif & Evaluasi Kelulusan
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Konsultasi materi seluruh pertemuan (Pertemuan 1–6): Roleplay percakapan situasi nyata, bedah kuis evaluasi, dan pendampingan sertifikat.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium">
                  <i className="fa-solid fa-layer-group text-purple-500"></i>
                  <span>Fokus: Semua Pertemuan (1 s/d 6)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  <i className="fa-solid fa-phone text-slate-400"></i>
                  <span>+62 896-3580-4346</span>
                </div>
              </div>
            </div>
            <a
              href="https://wa.me/6289635804346?text=Halo%20Mentor%20Raffi%20Fauzan,%20saya%20peserta%20pelatihan%20BISINDO%20ingin%20konsultasi%20materi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all mt-2"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span>Hubungi Raffi Fauzan (+62 896-3580-4346)</span>
            </a>
          </div>
        </div>

        {/* Dedicated Support Ticket Card (Khusus Tim IT Bikin Tiket Aja) */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900/5 via-transparent to-tigpad/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-server text-tigpad"></i>
                <span>Helpdesk Teknis & Server Next.js</span>
              </span>
              <span className="text-[11px] text-green-500 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block"></span>
                <span>Sistem Penanganan Tiket Aktif</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
              Mengalami Kendala Teknis atau Server Error Next.js? Ajukan Tiket ke Tim IT
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tim IT siap menangani kendala teknis portal: <strong>Server Error Next.js (500/503/404, gagal render, atau gangguan API)</strong>, pemutar video/PDF modul, presensi Zoom, kuis evaluasi, atau kendala unduh sertifikat resmi melalui sistem tiket terdata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-shrink-0">
            {submittedTickets.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMyTicketsModalOpen(true)}
                className="px-4 py-3 rounded-2xl glass-card text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-tigpad flex items-center gap-2 transition-all shadow-sm"
              >
                <i className="fa-solid fa-list-check text-tigpad"></i>
                <span>Tiket Saya ({submittedTickets.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                resetTicketForm();
                setIsTicketModalOpen(true);
              }}
              className="btn-duotone px-6 py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-transform"
            >
              <i className="fa-solid fa-plus-circle text-sm"></i>
              <span>Buat Tiket Bantuan IT</span>
            </button>
          </div>
        </div>

        {/* Modal 1: Form Buat Tiket Bantuan IT */}
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsTicketModalOpen(false)}
            ></div>
            <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-ticket text-tigpad"></i>
                  <span>Buat Tiket Bantuan Teknis Tim IT</span>
                </h3>
                <button
                  onClick={() => setIsTicketModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {createdTicketSuccess ? (
                /* Layar Sukses Tiket */
                <div className="py-4 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-2xl mx-auto shadow-sm">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800 dark:text-white">
                      Tiket Berhasil Dikirim ke Tim IT!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Laporan kendala Anda telah diterima di server antrean bantuan dan dialokasikan ke Tim IT SYARAT x TIGPAD.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5 text-left text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Nomor ID Tiket:</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-syarat dark:text-syarat-light">
                        <span>{createdTicketSuccess.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyTicket(createdTicketSuccess.id)}
                          className="text-slate-400 hover:text-tigpad text-xs p-1"
                          title="Salin ID Tiket"
                        >
                          <i className={`fa-solid ${copiedTicketId ? "fa-check text-green-500" : "fa-copy"}`}></i>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Tujuan Pengiriman:</span>
                      <span className="font-bold text-tigpad flex items-center gap-1">
                        <i className="fa-solid fa-envelope"></i>
                        <span>Tim IT (it-support@kolab.id)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Subjek Laporan:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{createdTicketSuccess.subject}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Status Tiket:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                        {createdTicketSuccess.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Target Respon SLA:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">Maks. 1x24 Jam Kerja</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <a
                        href={`mailto:it-support@kolab.id?subject=[${encodeURIComponent(createdTicketSuccess.id)}]%20${encodeURIComponent(createdTicketSuccess.subject)}&body=${encodeURIComponent(
                          `Halo Tim IT SYARAT x TIGPAD,\n\nSaya telah mengajukan tiket kendala:\n\nID Tiket: ${createdTicketSuccess.id}\nPelapor: ${createdTicketSuccess.name} (${createdTicketSuccess.email})\nKategori: ${createdTicketSuccess.category}\nPrioritas: ${createdTicketSuccess.priority}\nSubjek: ${createdTicketSuccess.subject}\n\nDetail Kendala:\n${createdTicketSuccess.description}\n\nWaktu: ${createdTicketSuccess.createdAt}\n\nMohon bantuannya untuk ditindaklanjuti. Terima kasih.`
                        )}`}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow hover:opacity-95 transition-opacity"
                      >
                        <i className="fa-solid fa-envelope-open-text text-tigpad"></i>
                        <span>Kirim Salinan Email ke it-support@kolab.id</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => resetTicketForm()}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Buat Tiket Lain
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTicketModalOpen(false)}
                      className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulir Buat Tiket */
                <form onSubmit={handleTicketSubmit} className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light text-[11px] flex items-center gap-2">
                    <i className="fa-solid fa-server"></i>
                    <span>Tiket dikirim langsung ke server helpdesk Tim IT (it-support@kolab.id) tanpa localStorage.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                        placeholder="Nama Anda"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Email / No. WhatsApp *
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        placeholder="email@anda.com / 08..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Kategori Kendala *
                      </label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as SupportTicket["category"])}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                      >
                        <option value="bug_teknis">Server Error Next.js / Bug Teknis Portal</option>
                        <option value="akun">Akses Akun & Login</option>
                        <option value="video_pdf">Pemutar Video & Modul PDF</option>
                        <option value="zoom">Presensi Kelas Zoom Live</option>
                        <option value="kuis">Kuis Evaluasi & Skor</option>
                        <option value="sertifikat">Verifikasi & Unduh Sertifikat</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Tingkat Prioritas *
                      </label>
                      <select
                        value={ticketPriority}
                        onChange={(e) => setTicketPriority(e.target.value as SupportTicket["priority"])}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                      >
                        <option value="rendah">Rendah (Pertanyaan umum / saran fitur)</option>
                        <option value="sedang">Sedang (Kendala pemutar video/materi)</option>
                        <option value="mendesak">Mendesak (Server error / tidak bisa akses akun)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Subjek Kendala *
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Contoh: Server error 500 saat membuka materi pertemuan 2"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-tigpad outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Detail Kendala & Pesan Error *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      placeholder="Jelaskan langkah yang Anda lakukan dan pesan error yang muncul..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-tigpad outline-none"
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsTicketModalOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="btn-duotone px-5 py-2 rounded-xl font-bold shadow flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <i className={`fa-solid ${isSubmittingTicket ? "fa-spinner fa-spin" : "fa-paper-plane"} text-xs`}></i>
                      <span>{isSubmittingTicket ? "Mengirim ke Server IT..." : "Kirim Tiket ke Tim IT"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal 2: Daftar Tiket Saya */}
        {isMyTicketsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMyTicketsModalOpen(false)}
            ></div>
            <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-tigpad"></i>
                  <span>Daftar Tiket Bantuan IT Saya</span>
                </h3>
                <button
                  onClick={() => setIsMyTicketsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {submittedTickets.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <i className="fa-solid fa-ticket text-3xl opacity-40"></i>
                  <p className="text-xs">Belum ada tiket yang pernah Anda ajukan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submittedTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-syarat dark:text-syarat-light text-[11px]">
                          {t.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                          {t.status}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-white">
                        {t.subject}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="capitalize">Kategori: {t.category}</span>
                        <span>{t.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMyTicketsModalOpen(false)}
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </section>


      {/* Footer Section */}
      <footer className="relative z-10 glass-nav border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo_tigpad_syarat.png"
              alt="Logo"
              className="w-6 h-6 object-contain flex-shrink-0"
            />
            <span>
              © 2026 LMS KOLAB{" "}
              <span className="text-syarat dark:text-syarat-light font-black">SYARAT</span> X{" "}
              <span className="text-tigpad font-black">TIGPAD</span> • Platform Edukasi BISINDO Inklusif
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="#fitur" className="hover:underline">
              Fitur
            </a>
            <a href="#modul" className="hover:underline">
              Modul
            </a>
            <a href="#faq" className="hover:underline">
              FAQ
            </a>
            <a href="#kontak" className="hover:underline font-bold text-tigpad">
              Kontak CP
            </a>
            <Link href="/login" className="hover:underline font-bold text-syarat dark:text-syarat-light">
              Masuk Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={toggleMobileMenu}
          ></div>
          <div className="mobile-drawer-content relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full p-5 space-y-6 shadow-2xl flex flex-col justify-between overflow-y-auto z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5 font-black text-base">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/logo_tigpad_syarat.png"
                    alt="Logo"
                    className="w-7 h-7 object-contain flex-shrink-0"
                  />
                  <span>
                    <span className="text-syarat dark:text-syarat-light font-black">SYARAT</span>{" "}
                    <span className="text-slate-400 text-xs font-semibold">X</span>{" "}
                    <span className="text-tigpad font-black">TIGPAD</span>
                  </span>
                </div>
                <button
                  onClick={toggleMobileMenu}
                  className="p-2 text-slate-500 hover:text-red-500 rounded-xl"
                  aria-label="Tutup Menu"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <nav className="flex flex-col space-y-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <a
                  href="#fitur"
                  onClick={toggleMobileMenu}
                  className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                >
                  <i className="fa-solid fa-star text-tigpad"></i>
                  <span>Fitur Unggulan</span>
                </a>
                <a
                  href="#modul"
                  onClick={toggleMobileMenu}
                  className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                >
                  <i className="fa-solid fa-book-open text-syarat"></i>
                  <span>Kurikulum Modul</span>
                </a>
                <a
                  href="#faq"
                  onClick={toggleMobileMenu}
                  className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                >
                  <i className="fa-solid fa-circle-question text-emerald-500"></i>
                  <span>FAQ</span>
                </a>
                <a
                  href="#kontak"
                  onClick={toggleMobileMenu}
                  className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                >
                  <i className="fa-solid fa-headset text-amber-500"></i>
                  <span>Narahubung (CP)</span>
                </a>
                <Link
                  href="/register"
                  onClick={toggleMobileMenu}
                  className="btn-duotone p-3.5 rounded-xl text-center text-xs font-bold mt-3 shadow-lg flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span>Daftar Peserta Baru</span>
                </Link>
                <Link
                  href="/login"
                  onClick={toggleMobileMenu}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-solid fa-right-to-bracket text-syarat"></i>
                  <span>Masuk Portal</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
