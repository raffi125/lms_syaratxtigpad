"use client";

import React, { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error securely for internal diagnostics
    console.error("[Next.js Server / Runtime Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-tigpad selection:text-white">
      {/* Glowing background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tigpad/10 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-card max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-red-200 dark:border-red-900/40 shadow-2xl relative z-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider inline-block">
            Next.js Server Error Handled
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            Terjadi Kendala pada Server Next.js
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Sistem mendeteksi adanya kendala proses rendering atau eksekusi server Next.js. Data Anda tetap aman. Silakan muat ulang halaman atau ajukan tiket bantuan ke Tim IT.
          </p>
        </div>

        {/* Error Details (Collapsible) */}
        <details className="text-left text-xs bg-slate-100 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
          <summary className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 select-none">
            <i className="fa-solid fa-code text-tigpad"></i>
            <span>Detail Diagnostik Error</span>
          </summary>
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all space-y-1">
            <p><span className="font-bold text-slate-700 dark:text-slate-300">Pesan:</span> {error.message || "Unknown server execution error"}</p>
            {error.digest && (
              <p><span className="font-bold text-slate-700 dark:text-slate-300">Digest ID:</span> {error.digest}</p>
            )}
          </div>
        </details>

        {/* Recovery Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-syarat hover:bg-syarat/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <i className="fa-solid fa-rotate-right"></i>
            <span>Muat Ulang Halaman</span>
          </button>

          <Link
            href="/#kontak"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-tigpad hover:bg-tigpad/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <i className="fa-solid fa-ticket"></i>
            <span>Ajukan Tiket ke Tim IT</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-4 py-3 rounded-2xl glass-card font-bold text-xs hover:border-slate-400 transition-all text-slate-700 dark:text-slate-300"
          >
            Beranda
          </Link>
        </div>

        <p className="text-[11px] text-slate-400">
          Untuk konsultasi materi, hubungi 3 Mentor di Beranda. Untuk kendala server, gunakan Tiket Tim IT.
        </p>
      </div>
    </div>
  );
}
