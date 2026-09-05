"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser, theme, toggleTheme, showToast } = useApp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Nama lengkap wajib diisi!", "warning");
      return;
    }
    if (!email.trim()) {
      showToast("Email aktif wajib diisi!", "warning");
      return;
    }
    if (!idNumber.trim()) {
      showToast("User ID wajib diisi!", "warning");
      return;
    }
    if (password.length < 6) {
      showToast("Kata sandi minimal 6 karakter!", "warning");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Konfirmasi kata sandi tidak cocok!", "error");
      return;
    }
    if (!agreeTerms) {
      showToast("Anda harus menyetujui Ketentuan Layanan!", "warning");
      return;
    }

    setIsLoading(true);
    const success = await registerUser({
      name,
      email,
      phone: phone.trim() || undefined,
      user_id: idNumber,
      npm: idNumber,
      institution: institution || "Masyarakat Umum",
      password,
    });
    setIsLoading(false);

    if (success) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-tigpad selection:text-white">
      {/* Ambient Glowing Background Orbs */}
      <div className="orb-container">
        <div className="orb orb-blue"></div>
        <div className="orb orb-orange"></div>
        <div className="orb orb-purple"></div>
      </div>

      {/* Top Navigation Bar */}
      <div className="w-full max-w-md sm:max-w-none sm:fixed sm:top-5 sm:left-0 sm:right-0 sm:px-6 z-50 flex items-center justify-between mb-4 sm:mb-0">
        <Link
          href="/"
          className="glass-card px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 hover:border-tigpad hover:text-tigpad transition-all shadow-md"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Beranda</span>
        </Link>

        <button
          onClick={toggleTheme}
          aria-label="Ubah Tema Display"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 transition-colors shadow-md"
        >
          {theme === "dark" ? (
            <i className="fa-solid fa-sun text-amber-400 text-sm sm:text-base"></i>
          ) : (
            <i className="fa-solid fa-moon text-slate-700 text-sm sm:text-base"></i>
          )}
        </button>
      </div>

      {/* Main Container Card */}
      <main className="w-full max-w-lg relative z-10 space-y-5 sm:space-y-6 my-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl shadow-syarat/20 hover:scale-105 transition-transform border border-slate-200 dark:border-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo_tigpad_syarat.png"
              alt="Logo SYARAT X TIGPAD"
              className="w-full h-full object-contain"
            />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-syarat dark:text-syarat-light">SYARAT</span>{" "}
              <span className="text-slate-400 text-lg font-semibold">X</span>{" "}
              <span className="text-tigpad">TIGPAD</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pendaftaran Akun Peserta Pelatihan BISINDO
            </p>
          </div>
        </div>

        {/* Glassmorphism Form Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              Daftar Akun Baru
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Terbuka untuk masyarakat umum, praktisi, pelajar, dan seluruh peminat bahasa isyarat.
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Nama Lengkap (Sesuai Sertifikat) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-user"></i>
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Email Aktif */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Alamat Email Aktif <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Nomor WhatsApp / HP (Opsional) */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Nomor WhatsApp / HP <span className="text-slate-400 text-[10px] font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-brands fa-whatsapp"></i>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890 (Bisa dikosongkan)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Grid 2 Kolom: No. Identitas & Asal Komunitas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* User ID */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  User ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-id-badge"></i>
                  </span>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Masukkan User ID Anda"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Asal Instansi / Komunitas / Kota */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Asal Instansi / Kota <span className="text-slate-400 text-[10px] font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-building"></i>
                  </span>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Instansi / Komunitas / Umum"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Grid 2 Kolom: Kata Sandi & Konfirmasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Kata Sandi */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-lock"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Konfirmasi Sandi */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Ulangi Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-check-double"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi sandi"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Terms */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-primary rounded-md mt-0.5"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  Saya menyetujui ketentuan pembelajaran inklusif dan keabsahan data identitas untuk kebutuhan e-sertifikat resmi.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-duotone w-full py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 mt-3 hover:scale-[1.02] transition-transform"
            >
              <span>{isLoading ? "Memproses Pendaftaran..." : "Daftar Akun Peserta"}</span>
              <i className="fa-solid fa-user-check"></i>
            </button>
          </form>

          {/* Login Prompt Link */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sudah memiliki akun terdaftar?{" "}
              <Link
                href="/login"
                className="font-extrabold text-syarat dark:text-syarat-light hover:underline inline-flex items-center gap-1"
              >
                <span>Masuk ke Portal</span>
                <i className="fa-solid fa-right-to-bracket text-[10px]"></i>
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Help */}
        <p className="text-center text-xs text-slate-500">
          Butuh Bantuan? Hubungi{" "}
          <button
            type="button"
            onClick={() =>
              showToast(
                "Untuk kendala teknis atau pendaftaran, silakan ajukan Tiket Bantuan ke Tim IT di halaman Beranda.",
                "info"
              )
            }
            className="text-syarat dark:text-syarat-light font-bold hover:underline"
          >
            Layanan Narahubung Pendaftaran
          </button>
        </p>
      </main>
    </div>
  );
}
