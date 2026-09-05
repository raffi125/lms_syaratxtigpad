"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import type { SupportTicket } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  akun: "Akun",
  video_pdf: "Video / PDF",
  zoom: "Zoom",
  kuis: "Kuis",
  sertifikat: "Sertifikat",
  bug_teknis: "Bug Teknis",
  lainnya: "Lainnya",
};

const PRIORITY_COLOR: Record<string, string> = {
  rendah: "bg-slate-100 dark:bg-slate-800 text-slate-500",
  sedang: "bg-amber-500/10 text-amber-600",
  mendesak: "bg-rose-500/10 text-rose-600",
};

const STATUS_COLOR: Record<string, string> = {
  "Menunggu Peninjauan": "bg-amber-500/10 text-amber-600",
  "Diproses Tim IT": "bg-blue-500/10 text-blue-600",
  "Terselesaikan": "bg-emerald-500/10 text-emerald-600",
};

export default function TicketsPage() {
  const { currentRole, showToast } = useApp();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = currentRole === "admin";

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const data = await res.json();
      setTickets(data.data || []);
    } catch {
      showToast("Gagal memuat data tiket.", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: SupportTicket["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
        if (selectedTicket?.id === id) setSelectedTicket((t) => t ? { ...t, status } : t);
        showToast(`Status diperbarui: ${status}`, "success");
      } else {
        showToast(data.message || "Gagal memperbarui status.", "error");
      }
    } catch {
      showToast("Gagal memperbarui status tiket.", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm(`Hapus tiket ${id} secara permanen?`)) return;
    try {
      const res = await fetch(`/api/tickets?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== id));
        if (selectedTicket?.id === id) setSelectedTicket(null);
        showToast("Tiket berhasil dihapus.", "info");
      }
    } catch {
      showToast("Gagal menghapus tiket.", "error");
    }
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.subject.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 rounded-3xl text-center space-y-3">
          <i className="fa-solid fa-lock text-4xl text-slate-400"></i>
          <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">Akses Ditolak</h2>
          <p className="text-xs text-slate-400">Halaman ini hanya dapat diakses oleh Admin.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 text-[11px] font-extrabold tracking-wide uppercase inline-block mb-1">
              <i className="fa-solid fa-ticket mr-1"></i> Helpdesk IT
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Tiket Bantuan
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola semua tiket bantuan yang dikirimkan pengguna LMS.
            </p>
          </div>
          <button
            onClick={fetchTickets}
            className="px-4 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <i className="fa-solid fa-arrows-rotate text-syarat"></i>
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Tiket", value: tickets.length, icon: "fa-ticket", color: "text-orange-500 bg-orange-500/10" },
            { label: "Menunggu", value: tickets.filter((t) => t.status === "Menunggu Peninjauan").length, icon: "fa-clock", color: "text-amber-500 bg-amber-500/10" },
            { label: "Diproses", value: tickets.filter((t) => t.status === "Diproses Tim IT").length, icon: "fa-gears", color: "text-blue-500 bg-blue-500/10" },
            { label: "Selesai", value: tickets.filter((t) => t.status === "Terselesaikan").length, icon: "fa-circle-check", color: "text-emerald-500 bg-emerald-500/10" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${s.color}`}>
                <i className={`fa-solid ${s.icon}`}></i>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">{s.label}</div>
                <div className="text-xl font-black text-slate-800 dark:text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari tiket, nama, email..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="all">Semua Status</option>
                <option value="Menunggu Peninjauan">Menunggu Peninjauan</option>
                <option value="Diproses Tim IT">Diproses Tim IT</option>
                <option value="Terselesaikan">Terselesaikan</option>
              </select>
            </div>

            {loading ? (
              <div className="glass-card p-10 rounded-3xl text-center text-slate-400 text-sm">
                <i className="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i>
                Memuat tiket...
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-10 rounded-3xl text-center text-slate-400 text-sm space-y-2">
                <i className="fa-solid fa-inbox text-3xl block text-slate-300"></i>
                <p>Tidak ada tiket yang ditemukan.</p>
              </div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`glass-card p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md space-y-2 ${
                    selectedTicket?.id === t.id
                      ? "border-syarat shadow-md"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{t.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLOR[t.priority] || ""}`}>
                          {t.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{t.subject}</p>
                      <p className="text-[11px] text-slate-500">{t.name} · {t.email}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLOR[t.status] || ""}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{t.description}</p>
                  <p className="text-[10px] text-slate-400">{t.createdAt}</p>
                </div>
              ))
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedTicket ? (
              <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 sticky top-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <i className="fa-solid fa-file-lines text-syarat"></i>
                    <span>Detail Tiket</span>
                  </h3>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors text-sm"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{selectedTicket.id}</span>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5">{selectedTicket.subject}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Pelapor</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{selectedTicket.name}</div>
                      <div className="text-[10px] text-slate-400">{selectedTicket.email}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Waktu</div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{selectedTicket.createdAt}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Kategori</div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                        {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Prioritas</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLOR[selectedTicket.priority] || ""}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Deskripsi</div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                      {selectedTicket.description}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Ubah Status</div>
                    <div className="space-y-1.5">
                      {(["Menunggu Peninjauan", "Diproses Tim IT", "Terselesaikan"] as const).map((s) => (
                        <button
                          key={s}
                          disabled={updatingId === selectedTicket.id}
                          onClick={() => updateStatus(selectedTicket.id, s)}
                          className={`w-full py-2 rounded-xl text-[11px] font-bold border transition-all ${
                            selectedTicket.status === s
                              ? (STATUS_COLOR[s] || "") + " border-current"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-syarat"
                          }`}
                        >
                          {updatingId === selectedTicket.id && selectedTicket.status !== s
                            ? <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                            : null}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                    <a
                      href={`mailto:${selectedTicket.email}?subject=[${encodeURIComponent(selectedTicket.id)}] Re: ${encodeURIComponent(selectedTicket.subject)}`}
                      className="flex-1 py-2 rounded-xl bg-syarat text-white text-[11px] font-bold text-center hover:opacity-90 transition-opacity"
                    >
                      <i className="fa-solid fa-envelope mr-1"></i> Balas via Email
                    </a>
                    <button
                      onClick={() => deleteTicket(selectedTicket.id)}
                      className="px-3 py-2 rounded-xl text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-500/10 transition-colors text-[11px] font-bold"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs space-y-2">
                <i className="fa-solid fa-arrow-pointer text-2xl block text-slate-300"></i>
                <p>Klik tiket untuk melihat detail dan mengubah status.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
