"use client";

import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { currentUserId, logout } = useApp();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth guard: redirect to login if not logged in
  useEffect(() => {
    if (isMounted && !currentUserId) {
      router.replace("/login");
    }
  }, [isMounted, currentUserId, router]);

  // Don't render children until mounted and authenticated
  if (!isMounted) return null;
  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-syarat"></i>
          <p className="text-xs font-semibold">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased selection:bg-tigpad selection:text-white">
      {/* Ambient Glowing Background Orbs */}
      <div className="orb-container">
        <div className="orb orb-blue"></div>
        <div className="orb orb-orange"></div>
        <div className="orb orb-purple"></div>
      </div>

      {/* Top Navigation Bar */}
      <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

      {/* Main Layout Grid */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        {/* Desktop Sidebar Navigation */}
        <aside className="md:col-span-4 lg:col-span-3 hidden md:block">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <main className="md:col-span-8 lg:col-span-9 space-y-6">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
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
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 text-slate-500 hover:text-red-500 rounded-xl"
                  aria-label="Tutup Menu"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
              <div onClick={() => setMobileSidebarOpen(false)}>
                <Sidebar />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i> Keluar / Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

