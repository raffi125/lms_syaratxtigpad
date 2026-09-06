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
    users,
    notifications,
    unreadNotifCount,
    addNotification,
    updateNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    showToast,
  } = useApp();

  const isManager = currentRole === "admin" || currentRole === "mentor";

  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal: Buat & Edit Notifikasi Manual (Admin & Mentor)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotifId, setEditingNotifId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formCategory, setFormCategory] = useState<NotificationItem["type"]>("info");
  const [formTargetMode, setFormTargetMode] = useState<"all" | "peserta" | "mentor" | "specific">("all");
  const [formSpecificUserId, setFormSpecificUserId] = useState<number | null>(null);
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formSender, setFormSender] = useState("");

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
    if (filterType === "kuis" && n.type !== "kuis") return false;
    if (filterType === "sertifikat" && n.type !== "sertifikat") return false;
    if (filterType === "warning" && n.type !== "warning") return false;
    if (filterType === "info" && n.type !== "info") return false;

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

  // Open modal for new manual notification
  const openCreateModal = () => {
    setEditingNotifId(null);
    setFormTitle("");
    setFormMessage("");
    setFormCategory("info");
    setFormTargetMode("all");
    setFormSpecificUserId(null);
    setFormLinkUrl("");
    setFormSender(currentUser.name || (currentRole === "admin" ? "Administrator" : "Mentor Pengajar"));
    setIsModalOpen(true);
  };

  // Open modal for editing existing notification
  const openEditModal = (n: NotificationItem) => {
    setEditingNotifId(n.id);
    setFormTitle(n.title);
    setFormMessage(n.message);
    setFormCategory(n.type);
    if (n.userId !== undefined && n.userId !== null) {
      setFormTargetMode("specific");
      setFormSpecificUserId(n.userId);
    } else {
      setFormTargetMode(n.targetRole as "all" | "peserta" | "mentor");
      setFormSpecificUserId(null);
    }
    setFormLinkUrl(n.linkUrl || "");
    setFormSender(n.sender || currentUser.name || "Mentor Pengajar");
    setIsModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Judul notifikasi wajib diisi!", "warning");
      return;
    }
    if (!formMessage.trim()) {
      showToast("Isi pesan notifikasi wajib diisi!", "warning");
      return;
    }
    if (formTargetMode === "specific" && !formSpecificUserId) {
      showToast("Silakan pilih peserta penerima notifikasi!", "warning");
      return;
    }

    const targetRole = formTargetMode === "specific" ? "peserta" : formTargetMode;
    const targetUserId = formTargetMode === "specific" ? (formSpecificUserId ?? undefined) : undefined;
    const finalSender = formSender.trim() || currentUser.name || (currentRole === "admin" ? "Administrator" : "Tim Mentor");

    if (editingNotifId !== null) {
      updateNotification(editingNotifId, {
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formCategory,
        targetRole,
        userId: targetUserId,
        linkUrl: formLinkUrl.trim() || undefined,
        sender: finalSender,
      });
      showToast("Notifikasi berhasil diperbarui!", "success");
    } else {
      addNotification({
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formCategory,
        targetRole,
        userId: targetUserId,
        linkUrl: formLinkUrl.trim() || undefined,
        sender: finalSender,
      });
      showToast("Notifikasi manual berhasil disiarkan!", "success");
    }

    setIsModalOpen(false);
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
      case "kuis":
        return {
          icon: "fa-solid fa-stopwatch-20",
          label: "Kuis Evaluasi",
          badgeClass: "bg-purple-500/15 text-purple-600 border-purple-500/20",
          iconClass: "text-purple-500 bg-purple-500/10",
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-tigpad/15 text-tigpad text-xs font-bold border border-tigpad/30 inline-block">
                <i className="fa-solid fa-bell"></i> Pusat Notifikasi LMS
              </span>
              {isManager && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                  <i className="fa-solid fa-sliders"></i> Mode Manual Aktif
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              Kelola & Pusat Notifikasi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isManager
                ? "Siarkan pengumuman, instruksi kuis, sesi Zoom, atau pesan khusus secara manual ke peserta."
                : "Pantau seluruh informasi pengumuman pembelajaran, sesi tatap muka, dan sertifikat resmi Anda."}
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
                onClick={openCreateModal}
                className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-plus-circle text-sm"></i>
                <span>+ Buat Notifikasi Manual</span>
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
                onClick={() => setFilterType("kuis")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "kuis"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Kuis Evaluasi
              </button>

              <button
                onClick={() => setFilterType("sertifikat")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "sertifikat"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Sertifikat
              </button>

              <button
                onClick={() => setFilterType("warning")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  filterType === "warning"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Peringatan
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
            <div className="glass-card p-12 rounded-3xl text-center space-y-4 border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-slate-400 mx-auto">
                <i className="fa-regular fa-bell-slash"></i>
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                  Tidak Ada Notifikasi
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `Tidak ada notifikasi yang cocok dengan "${searchQuery}".`
                    : "Belum ada notifikasi pada kategori ini. Notifikasi baru disiarkan manual oleh Mentor atau Admin."}
                </p>
              </div>

              {isManager && (
                <button
                  onClick={openCreateModal}
                  className="btn-duotone px-4 py-2 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow hover:scale-105 transition-all"
                >
                  <i className="fa-solid fa-plus-circle"></i>
                  <span>Buat Notifikasi Manual</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const meta = getTypeBadge(notif.type);
              const targetUser = notif.userId ? users.find((u) => u.id === notif.userId) : null;

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

                      <div className="text-[10px] text-slate-400 pt-0.5 flex flex-wrap items-center gap-2">
                        <span>Pengirim: <strong>{notif.sender || "Sistem LMS"}</strong></span>
                        <span>•</span>
                        {targetUser ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-2 py-0.2 rounded-md">
                            <i className="fa-solid fa-user-tag mr-1"></i>
                            Khusus: {targetUser.name} ({targetUser.npm || targetUser.user_id || "Peserta"})
                          </span>
                        ) : notif.targetRole !== "all" ? (
                          <span>Sasaran: <strong className="capitalize">{notif.targetRole}</strong></span>
                        ) : (
                          <span>Sasaran: <strong>Semua Pengguna</strong></span>
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

                    {isManager && (
                      <>
                        <button
                          onClick={() => openEditModal(notif)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-syarat hover:bg-syarat/10 transition-all"
                          title="Edit Notifikasi"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Hapus Notifikasi"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Tambah & Edit Notifikasi Manual (Admin & Mentor) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-syarat dark:text-syarat-light flex items-center gap-2">
                  <i className={`fa-solid ${editingNotifId !== null ? "fa-pen-to-square text-syarat" : "fa-bullhorn text-tigpad"}`}></i>
                  <span>{editingNotifId !== null ? "Edit Notifikasi" : "Buat Notifikasi Manual"}</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <form onSubmit={handleModalSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Judul Notifikasi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Misal: Pengumuman Jadwal Sesi Pertemuan 3"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-syarat focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Isi Pesan Notifikasi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="Tuliskan isi pengumuman atau instruksi rinci untuk peserta..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-syarat focus:outline-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                      Kategori / Tipe
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as NotificationItem["type"])}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat focus:outline-none"
                    >
                      <option value="info">📢 Pengumuman Umum</option>
                      <option value="modul">📖 Modul Materi</option>
                      <option value="zoom">🎧 Pertemuan Zoom</option>
                      <option value="kuis">⏱️ Kuis Evaluasi</option>
                      <option value="sertifikat">🏆 Sertifikat Kelulusan</option>
                      <option value="warning">⚠️ Penting / Peringatan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                      Sasaran Penerima
                    </label>
                    <select
                      value={formTargetMode}
                      onChange={(e) => setFormTargetMode(e.target.value as "all" | "peserta" | "mentor" | "specific")}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat focus:outline-none"
                    >
                      <option value="all">Semua Pengguna</option>
                      <option value="peserta">Seluruh Peserta</option>
                      <option value="mentor">Tim Mentor Saja</option>
                      <option value="specific">Peserta Spesifik (Personal)</option>
                    </select>
                  </div>
                </div>

                {/* Targeted Specific Participant Selector */}
                {formTargetMode === "specific" && (
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1.5 animate-slide-up">
                    <label className="block font-bold text-purple-700 dark:text-purple-300">
                      <i className="fa-solid fa-user mr-1"></i> Pilih Peserta Penerima <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formSpecificUserId || ""}
                      onChange={(e) => setFormSpecificUserId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-xs font-semibold"
                    >
                      <option value="">-- Pilih Nama Peserta --</option>
                      {users
                        .filter((u) => u.role === "peserta")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — NPM/ID: {u.npm || u.user_id || u.email}
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400">
                      Notifikasi ini hanya akan muncul di akun peserta yang Anda pilih.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-200">
                      Tautan Tujuan <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="Contoh: /modul, /zoom, /kuis, atau /sertifikat"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-syarat focus:outline-none"
                  />
                  {/* Quick link insert chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold">Tautan Cepat:</span>
                    {["/modul", "/zoom", "/kuis", "/sertifikat"].map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setFormLinkUrl(path)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-colors ${
                          formLinkUrl === path
                            ? "bg-syarat text-white border-syarat"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-syarat/10 hover:text-syarat text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {path}
                      </button>
                    ))}
                    {formLinkUrl && (
                      <button
                        type="button"
                        onClick={() => setFormLinkUrl("")}
                        className="text-[10px] text-rose-500 hover:underline font-semibold ml-1"
                      >
                        Hapus Tautan
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Nama Pengirim
                  </label>
                  <input
                    type="text"
                    value={formSender}
                    onChange={(e) => setFormSender(e.target.value)}
                    placeholder="Misal: Kak Raffi (Mentor BISINDO)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-duotone px-5 py-2 rounded-xl font-bold shadow hover:scale-105 transition-all"
                  >
                    <i className={`fa-solid ${editingNotifId !== null ? "fa-check" : "fa-paper-plane"} mr-1`}></i>
                    <span>{editingNotifId !== null ? "Simpan Perubahan" : "Siarkan Notifikasi"}</span>
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
