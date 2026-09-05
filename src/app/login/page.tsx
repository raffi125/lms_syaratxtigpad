"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, theme, toggleTheme, showToast } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast("Silakan masukkan email atau User ID Anda!", "warning");
      return;
    }
    setIsLoading(true);
    const success = await loginUser(email, password);
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

      {/* Main Login Container Card */}
      <main className="w-full max-w-md relative z-10 space-y-5 sm:space-y-6 my-auto">
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
              Platform Pembelajaran & Kolaborasi BISINDO
            </p>
          </div>
        </div>

        {/* Glassmorphism Form Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              Masuk ke Portal Belajar
            </h2>
            <p className="text-xs text-slate-500">
              Silakan masukkan email atau User ID Anda
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email / ID Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Email atau User ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com atau User ID Anda"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() =>
                    showToast(
                      "Hubungi helpdesk layanan di info@kolab.id untuk bantuan reset kata sandi.",
                      "info"
                    )
                  }
                  className="text-[11px] text-tigpad font-semibold hover:underline"
                >
                  Lupa Sandi?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <i className="fa-solid fa-lock"></i>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium focus:ring-2 focus:ring-tigpad outline-none transition-all text-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Lihat Password"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <i
                    className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                  ></i>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="checkbox checkbox-xs checkbox-primary rounded-md"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Ingat Sesi Login Saya
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-duotone w-full py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </form>

          {/* Registration Prompt Link */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Belum memiliki akun?{" "}
              <Link
                href="/register"
                className="font-extrabold text-tigpad hover:underline inline-flex items-center gap-1"
              >
                <span>Daftar Akun Peserta Baru</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Help */}
        <p className="text-center text-xs text-slate-500">
          Kendala Akun? Hubungi{" "}
          <button
            type="button"
            onClick={() =>
              showToast(
                "Silakan ajukan Tiket Bantuan ke Tim IT melalui menu kontak di halaman Beranda.",
                "info"
              )
            }
            className="text-syarat dark:text-syarat-light font-bold hover:underline"
          >
            Pusat Bantuan & Helpdesk
          </button>
        </p>
      </main>
    </div>
  );
}
