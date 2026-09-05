"use client";

import React, { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import type { NotificationItem } from "@/types";

export default function NotifikasiPage() {
  const {
    currentRole,
    currentUser,
    notifications,
    unreadNotifCount,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    showToast,
  } = useApp();

  const isManager = currentRole === "admin" || currentRole === "mentor";

  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal: Buat / Siarkan Notifikasi Baru (Admin & Mentor)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formCategory, setFormCategory] = useState<NotificationItem["type"]>("info");
  const [formTarget, setFormTarget] = useState<NotificationItem["targetRole"]>("all");
  const [formLinkUrl, setFormLinkUrl] = useState("");

  // Filter notifications based on role and personal user access
  const roleAccessibleNotifs = notifications.filter((n) => {
    if (currentRole === "admin") return true;
    if (n.userId !== undefined && n.userId !== null) {
      return n.userId === currentUser.id;
    }
    return n.targetRole === "all" || n.targetRole === currentRole;
  });

  // Apply tab and search filter
  const filteredNotifs = roleAccessibleNotifs.filter((n) => {
    // Tab filter
    if (filterType === "unread" && n.isRead) return false;
    if (filterType === "modul" && n.type !== "modul") return false;
    if (filterType === "zoom" && n.type !== "zoom") return false;
    if (filterType === "sertifikat" && n.type !== "sertifikat") return false;
    if (filterType === "info" && n.type !== "info" && n.type !== "warning") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      const matchSender = (n.sender || "").toLowerCase().includes(q);
      return matchTitle || matchMsg || matchSender;
    }

    return true;
  });

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Judul notifikasi wajib diisi!", "warning");
      return;
    }
    if (!formMessage.trim()) {
      showToast("Isi pesan notifikasi wajib diisi!", "warning");
      return;
    }

    addNotification({
      title: formTitle.trim(),
      message: formMessage.trim(),
      type: formCategory,
      targetRole: formTarget,
      linkUrl: formLinkUrl.trim() || undefined,
      sender: currentUser.name || (currentRole === "admin" ? "Administrator" : "Tim Mentor"),
    });

    showToast("Notifikasi berhasil disiarkan ke pengguna!", "success");
    setIsBroadcastModalOpen(false);
    setFormTitle("");
    setFormMessage("");
    setFormLinkUrl("");
  };

  const getTypeBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "sertifikat":
        return {
          icon: "fa-solid fa-award",
          label: "Sertifikat",
          badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/20",
          iconClass: "text-amber-500 bg-amber-500/10",
        };
      case "zoom":
        return {
          icon: "fa-solid fa-headset",
          label: "Pertemuan Zoom",
          badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/20",
          iconClass: "text-blue-500 bg-blue-500/10",
        };
      case "modul":
        return {
          icon: "fa-solid fa-book-open",
          label: "Modul Materi",
          badgeClass: "bg-syarat/15 text-syarat dark:text-syarat-light border-syarat/20",
          iconClass: "text-syarat bg-syarat/10",
        };
      case "warning":
        return {
          icon: "fa-solid fa-triangle-exclamation",
          label: "Pemberitahuan Penting",
          badgeClass: "bg-red-500/15 text-red-600 border-red-500/20",
          iconClass: "text-red-500 bg-red-500/10",
        };
      default:
        return {
          icon: "fa-solid fa-bullhorn",
          label: "Pengumuman",
          badgeClass: "bg-tigpad/15 text-tigpad border-tigpad/20",
          iconClass: "text-tigpad bg-tigpad/10",
        };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-tigpad/15 text-tigpad flex items-center justify-center text-lg">
                <i className="fa-solid fa-bell"></i>
              </div>
              <span>Kelola & Pusat Notifikasi</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pantau seluruh informasi penting, pengumuman pembelajaran, sesi Zoom, dan verifikasi sertifikat resmi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {unreadNotifCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="px-3.5 py-2 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <i className="fa-solid fa-check-double text-green-500"></i>
                <span>Tandai Semua Dibaca</span>
              </button>
            )}

            {isManager && (
              <button
                onClick={() => setIsBroadcastModalOpen(true)}
                className="btn-duotone px-4 py-2 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2"
              >
                <i className="fa-solid fa-paper-plane"></i>
                <span>Siarkan Notifikasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Notifikasi
              </span>
              <div className="w-8 h-8 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center text-sm">
                <i className="fa-solid fa-inbox"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black">
              {roleAccessibleNotifs.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Pesan di Kotak Masuk
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Belum Dibaca
              </span>
              <div className="w-8 h-8 rounded-xl bg-tigpad/10 text-tigpad flex items-center justify-center text-sm">
                <i className="fa-solid fa-envelope"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-tigpad">
              {unreadNotifCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Perlu Perhatian Anda
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sesi & Modul
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                <i className="fa-solid fa-headset"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
              {roleAccessibleNotifs.filter((n) => n.type === "zoom" || n.type === "modul").length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Pembaruan Kurikulum
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sertifikat
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm">
                <i className="fa-solid fa-award"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {roleAccessibleNotifs.filter((n) => n.type === "sertifikat").length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Kelulusan & Verifikasi
            </div>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="glass-card p-4 rounded-3xl space-y-3.5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "all"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Semua ({roleAccessibleNotifs.length})
              </button>

              <button
                onClick={() => setFilterType("unread")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  filterType === "unread"
                    ? "bg-tigpad text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>Belum Dibaca</span>
                {unreadNotifCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterType("info")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "info"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Pengumuman
              </button>

              <button
                onClick={() => setFilterType("modul")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "modul"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Modul Materi
              </button>

              <button
                onClick={() => setFilterType("zoom")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "zoom"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Sesi Zoom
              </button>

              <button
                onClick={() => setFilterType("sertifikat")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "sertifikat"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Sertifikat
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci notifikasi..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
              />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl text-center space-y-3 border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-slate-400 mx-auto">
                <i className="fa-regular fa-bell-slash"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                  Tidak Ada Notifikasi
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `Tidak ada notifikasi yang cocok dengan "${searchQuery}".`
                    : "Belum ada notifikasi pada kategori ini."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const meta = getTypeBadge(notif.type);
              return (
                <div
                  key={notif.id}
                  className={`glass-card p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    !notif.isRead
                      ? "border-syarat/40 bg-gradient-to-r from-syarat/5 via-transparent to-transparent shadow-md"
                      : "border-slate-200/80 dark:border-slate-800 opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold flex-shrink-0 mt-0.5 shadow-xs ${meta.iconClass}`}
                    >
                      <i className={meta.icon}></i>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>

                        {!notif.isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-tigpad text-white text-[9px] font-black uppercase">
                            Baru
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          • {notif.createdAt}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                        {notif.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        {notif.message}
                      </p>

                      <div className="text-[10px] text-slate-400 pt-0.5 flex items-center gap-2">
                        <span>Pengirim: <strong>{notif.sender || "Sistem LMS"}</strong></span>
                        {notif.targetRole !== "all" && (
                          <span>• Sasaran: <strong className="capitalize">{notif.targetRole}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions per card */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                    {notif.linkUrl && (
                      <Link
                        href={notif.linkUrl}
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="px-3 py-1.5 rounded-xl bg-syarat text-white text-xs font-bold shadow hover:bg-syarat/90 transition-all flex items-center gap-1.5"
                      >
                        <span>Buka</span>
                        <i className="fa-solid fa-arrow-right text-[10px]"></i>
                      </Link>
                    )}

                    {!notif.isRead ? (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                        title="Tandai Sudah Dibaca"
                      >
                        <i className="fa-solid fa-check"></i>
                        <span>Dibaca</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold px-2">
                        <i className="fa-solid fa-check text-green-500 mr-1"></i>
                        Sudah Dibaca
                      </span>
                    )}

                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                      title="Hapus Notifikasi"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Broadcast Notifikasi (Admin & Mentor) */}
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsBroadcastModalOpen(false)}
            ></div>
            <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-syarat dark:text-syarat-light flex items-center gap-2">
                  <i className="fa-solid fa-paper-plane text-tigpad"></i> Siarkan Notifikasi Baru
                </h3>
                <button
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <form onSubmit={handleBroadcastSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold mb-1">Judul Notifikasi</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Judul pengumuman atau instruksi..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Isi Pesan Notifikasi</label>
                  <textarea
                    required
                    rows={3}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Tuliskan isi pengumuman atau pemberitahuan lengkap..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-medium"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Kategori / Tipe</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as NotificationItem["type"])}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-semibold"
                    >
                      <option value="info">Pengumuman Umum</option>
                      <option value="modul">Modul Materi</option>
                      <option value="zoom">Pertemuan Zoom</option>
                      <option value="sertifikat">Sertifikat Kelulusan</option>
                      <option value="warning">Penting / Peringatan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Sasaran Penerima</label>
                    <select
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value as NotificationItem["targetRole"])}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-semibold"
                    >
                      <option value="all">Semua Pengguna</option>
                      <option value="peserta">Peserta Saja</option>
                      <option value="mentor">Mentor Saja</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    Tautan Tujuan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="/modul, /zoom, atau /sertifikat"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-duotone px-5 py-2 rounded-xl font-bold shadow"
                  >
                    Siarkan Sekarang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
