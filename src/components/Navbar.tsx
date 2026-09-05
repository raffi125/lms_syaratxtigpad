"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
}

export default function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const router = useRouter();
  const {
    theme,
    toggleTheme,
    currentRole,
    currentUser,
    logout,
    notifications,
    unreadNotifCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userNotifs = notifications.filter((n) => {
    if (currentRole === "admin") return true;
    if (n.userId !== undefined && n.userId !== null) {
      return n.userId === currentUser.id;
    }
    return n.targetRole === "all" || n.targetRole === currentRole;
  });

  const getRoleLabel = () => {
    if (currentRole === "mentor") return "Mentor BISINDO";
    if (currentRole === "admin") return "Administrator";
    return "Peserta Umum";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 glass-nav transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="md:hidden text-slate-600 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
              aria-label="Buka Menu"
            >
              <i className="fa-solid fa-bars text-lg"></i>
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo_tigpad_syarat.png"
              alt="Logo SYARAT X TIGPAD"
              className="w-9 h-9 object-contain rounded-xl drop-shadow group-hover:scale-105 transition-transform flex-shrink-0"
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* User Role Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light font-extrabold text-[11px] border border-syarat/20 mr-1">
            <i
              className={
                currentRole === "mentor"
                  ? "fa-solid fa-chalkboard-user text-tigpad"
                  : currentRole === "admin"
                  ? "fa-solid fa-user-shield text-purple-500"
                  : "fa-solid fa-user-graduate text-syarat dark:text-syarat-light"
              }
            ></i>
            <span>
              {currentRole === "mentor"
                ? "Mentor BISINDO"
                : currentRole === "admin"
                ? "Administrator"
                : "Peserta Umum"}
            </span>
          </span>

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              aria-label="Notifikasi LMS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-card flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-syarat dark:hover:text-tigpad transition-colors shadow-sm relative"
            >
              <i className="fa-solid fa-bell text-sm sm:text-base"></i>
              {unreadNotifCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tigpad animate-ping"></span>
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-tigpad text-white text-[10px] font-black flex items-center justify-center shadow">
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </span>
                </>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 p-4 shadow-2xl glass-card rounded-3xl w-80 sm:w-96 space-y-3 border border-slate-200 dark:border-slate-800 z-50 animate-slide-up">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <i className="fa-solid fa-bell text-tigpad"></i>
                    <span>Notifikasi {unreadNotifCount > 0 ? `(${unreadNotifCount} Baru)` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] font-bold text-syarat dark:text-syarat-light hover:underline"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                  {userNotifs.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 space-y-1">
                      <i className="fa-regular fa-bell-slash text-2xl"></i>
                      <p className="text-[11px] font-medium">Tidak ada notifikasi saat ini</p>
                    </div>
                  ) : (
                    userNotifs
                      .slice(0, 5)
                      .map((notif) => {
                        const iconClass =
                          notif.type === "sertifikat"
                            ? "fa-solid fa-award text-amber-500"
                            : notif.type === "zoom"
                            ? "fa-solid fa-headset text-blue-500"
                            : notif.type === "modul"
                            ? "fa-solid fa-book-open text-syarat"
                            : notif.type === "warning"
                            ? "fa-solid fa-triangle-exclamation text-red-500"
                            : "fa-solid fa-bullhorn text-tigpad";

                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.isRead) markNotificationAsRead(notif.id);
                              if (notif.linkUrl) {
                                setNotifOpen(false);
                                router.push(notif.linkUrl);
                              }
                            }}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                              notif.isRead
                                ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800 opacity-75 hover:opacity-100"
                                : "bg-syarat/10 border-syarat/25 shadow-xs"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                              <i className={iconClass}></i>
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <div className="flex justify-between items-start">
                                <p className={`font-bold ${!notif.isRead ? "text-syarat dark:text-syarat-light" : "text-slate-800 dark:text-white"}`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-tigpad flex-shrink-0 mt-1"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                                {notif.message}
                              </p>
                              <div className="text-[9px] text-slate-400 pt-0.5 flex items-center justify-between">
                                <span>{notif.sender || "Sistem"}</span>
                                <span>{notif.createdAt}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
                  <Link
                    href="/notifikasi"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] font-bold text-syarat dark:text-syarat-light hover:underline flex items-center justify-center gap-1.5"
                  >
                    <span>Buka Kelola Notifikasi</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Ubah Tema Display"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 transition-colors shadow-sm"
          >
            {theme === "dark" ? (
              <i className="fa-solid fa-sun text-amber-400 text-sm sm:text-base"></i>
            ) : (
              <i className="fa-solid fa-moon text-slate-700 text-sm sm:text-base"></i>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <div
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              role="button"
              className="flex items-center gap-2 cursor-pointer pl-1"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white font-extrabold flex items-center justify-center text-xs shadow-md border-2 border-tigpad overflow-hidden">
                {currentUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(currentUser.name)}</span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <div className="font-extrabold text-xs leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-tigpad font-bold">{getRoleLabel()}</div>
              </div>
            </div>

            {profileOpen && (
              <ul className="absolute right-0 mt-3 p-2 shadow-2xl glass-card rounded-2xl w-56 sm:w-60 text-xs space-y-1 z-50 border border-slate-200 dark:border-slate-800 animate-slide-up">
                <li className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {currentUser.email}
                  </div>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-syarat dark:text-syarat-light"
                  >
                    <i className="fa-solid fa-gauge-high"></i> Overview
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    <i className="fa-solid fa-user-gear text-tigpad"></i> Profil Saya & Foto
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sertifikat"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                  >
                    <i className="fa-solid fa-award text-amber-500"></i> Sertifikat Saya
                  </Link>
                </li>
                <li className="border-t border-slate-200 dark:border-slate-800 pt-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 font-bold"
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> Keluar / Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
