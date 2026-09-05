import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto">
          <i className="fa-solid fa-compass"></i>
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase">
            Error 404 • Halaman Tidak Ditemukan
          </span>
          <h1 className="text-2xl font-black">Halaman Tidak Ditemukan</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="btn-duotone px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/#kontak"
            className="px-5 py-2.5 rounded-xl glass-card font-bold text-xs hover:border-tigpad"
          >
            Bantuan IT
          </Link>
        </div>
      </div>
    </div>
  );
}
