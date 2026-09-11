"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useApp } from "@/context/AppContext";
import { SupabaseStorageService } from "@/lib/supabaseStorage";
import { SupabaseService } from "@/lib/supabaseService";
import { exportAttendanceToExcel } from "@/lib/excelExport";

export default function PresensiPage() {
  const {
    currentRole,
    currentUser,
    zoomData,
    users,
    showToast,
    refreshFromSupabase,
    submitAttendance,
    markAllAttended,
    markParticipantAttendance,
    deleteAttendanceLog,
  } = useApp();

  const isMentor = currentRole === "mentor";
  const isAdmin = currentRole === "admin";
  const isManager = isMentor || isAdmin;
  const isPeserta = currentRole === "peserta";

  const sessions = zoomData.sessions || [];

  // Pilihan Sesi yang Ingin Diisi Absen
  const [selectedSessionId, setSelectedSessionId] = useState<number | string>(() => {
    if (sessions.length > 0) {
      const ongoing = sessions.find((s) => s.status === "Berlangsung");
      return ongoing ? ongoing.id : sessions[0].id;
    }
    return "";
  });

  // State Form Presensi Peserta
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingPresence, setIsSubmittingPresence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search Rekap Presensi
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState<string>("all");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [attendanceOnlyMe, setAttendanceOnlyMe] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal Preview Screenshot Zoom
  const [previewProofModal, setPreviewProofModal] = useState<{
    open: boolean;
    url: string;
    participantName: string;
    time: string;
    sessionTitle?: string;
  } | null>(null);

  // Modal Input Presensi Manual (Mentor / Admin)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedPesertaId, setSelectedPesertaId] = useState<string>("");
  const [manualSessionId, setManualSessionId] = useState<number | string>(() => {
    return sessions.length > 0 ? sessions[0].id : "";
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      const ongoing = sessions.find((s) => s.status === "Berlangsung");
      setSelectedSessionId(ongoing ? ongoing.id : sessions[0].id);
      setManualSessionId(ongoing ? ongoing.id : sessions[0].id);
    }
  }, [sessions]);

  // Target sesi aktif untuk form absen
  const currentTargetSession = useMemo(() => {
    if (!selectedSessionId) return sessions[0] || null;
    return sessions.find((s) => String(s.id) === String(selectedSessionId)) || sessions[0] || null;
  }, [selectedSessionId, sessions]);

  // Cek apakah user sudah pernah absen pada sesi yang dipilih
  const userHasAttendedSelectedSession = useMemo(() => {
    if (!currentTargetSession) return false;
    return (zoomData.attendanceLogs || []).some((l) => {
      const matchSession =
        (l.sessionId || l.session_id) === currentTargetSession.id ||
        Boolean(currentTargetSession.presenceCode && l.method?.includes(currentTargetSession.presenceCode));
      const matchUserId =
        l.user_id &&
        (String(l.user_id) === String(currentUser.id) ||
          String(l.user_id) === String(currentUser.user_id) ||
          String(l.user_id) === String(currentUser.npm));
      const matchUserIdCode =
        (l as any).user_id_code &&
        (String((l as any).user_id_code) === String(currentUser.npm) ||
          String((l as any).user_id_code) === String(currentUser.user_id));
      const matchName =
        l.name &&
        currentUser.name &&
        l.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      return matchSession && Boolean(matchUserId || matchUserIdCode || matchName);
    });
  }, [currentTargetSession, zoomData.attendanceLogs, currentUser]);

  // Riwayat Absensi Milik User Saat Ini
  const myAttendanceLogs = useMemo(() => {
    return (zoomData.attendanceLogs || []).filter((log) => {
      const matchUserId =
        log.user_id &&
        (String(log.user_id) === String(currentUser.id) ||
          String(log.user_id) === String(currentUser.user_id) ||
          String(log.user_id) === String(currentUser.npm));
      const matchUserIdCode =
        (log as any).user_id_code &&
        (String((log as any).user_id_code) === String(currentUser.npm) ||
          String((log as any).user_id_code) === String(currentUser.user_id));
      const matchName =
        log.name &&
        currentUser.name &&
        log.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      return Boolean(matchUserId || matchUserIdCode || matchName);
    });
  }, [zoomData.attendanceLogs, currentUser]);

  // Filter attendance logs untuk tabel:
  // Admin & Mentor dapat melihat seluruh peserta; Peserta HANYA melihat miliknya sendiri.
  const filteredLogs = useMemo(() => {
    return (zoomData.attendanceLogs || []).filter((log) => {
      // Jika peserta: WAJIB hanya menampilkan milik dirinya sendiri
      if (isPeserta || attendanceOnlyMe) {
        const matchUserId =
          log.user_id &&
          (String(log.user_id) === String(currentUser.id) ||
            String(log.user_id) === String(currentUser.user_id) ||
            String(log.user_id) === String(currentUser.npm));
        const matchUserIdCode =
          (log as any).user_id_code &&
          (String((log as any).user_id_code) === String(currentUser.npm) ||
            String((log as any).user_id_code) === String(currentUser.user_id));
        const matchName =
          log.name &&
          currentUser.name &&
          log.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
        if (!matchUserId && !matchUserIdCode && !matchName) return false;
      }

      if (attendanceSessionFilter !== "all") {
        const sId = Number(attendanceSessionFilter);
        const targetSes = sessions.find((s) => s.id === sId);
        const matchSessionId = (log.sessionId || log.session_id) === sId;
        const matchSessionCode = Boolean(targetSes?.presenceCode && log.method?.includes(targetSes.presenceCode));
        if (!matchSessionId && !matchSessionCode) return false;
      }

      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase();
        const matchName = log.name.toLowerCase().includes(q);
        const matchId = (log.user_id || (log as any).user_id_code || log.npm || "").toLowerCase().includes(q);
        const matchInst = (log.institution || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchInst) return false;
      }
      return true;
    });
  }, [zoomData.attendanceLogs, attendanceSessionFilter, attendanceSearch, attendanceOnlyMe, isPeserta, currentUser, sessions]);

  // Attendance Pagination states
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(10);

  useEffect(() => {
    setAttendancePage(1);
  }, [attendanceSessionFilter, attendanceSearch, attendanceOnlyMe]);

  const attendanceTotalPages = Math.max(1, Math.ceil(filteredLogs.length / attendancePageSize));
  const paginatedLogs = useMemo(() => {
    const start = (attendancePage - 1) * attendancePageSize;
    return filteredLogs.slice(start, start + attendancePageSize);
  }, [filteredLogs, attendancePage, attendancePageSize]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromSupabase();
      showToast("Data presensi berhasil disinkronkan dari tabel absen Supabase!", "success");
    } catch {
      showToast("Gagal menyinkronkan data presensi dari server.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Format berkas harus berupa gambar (JPG, PNG, WEBP)!", "warning");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Ukuran berkas gambar maksimal 10MB!", "warning");
      return;
    }

    setProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setProofPreviewUrl(localUrl);
    showToast("Bukti tangkapan layar (SS) Zoom berhasil dipilih.", "info");
  };

  const handleRemoveProofFile = () => {
    setProofFile(null);
    if (proofPreviewUrl && proofPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setProofPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePresenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTargetSession) {
      showToast("Pilih sesi pertemuan terlebih dahulu!", "warning");
      return;
    }

    setIsSubmittingPresence(true);

    try {
      let finalProofUrl = "";

      if (proofFile) {
        setIsUploadingProof(true);
        showToast("Mengunggah bukti tangkapan layar Zoom...", "info");
        const cleanName = `ss_zoom_${currentTargetSession.id}_${Date.now()}_${proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const uploadRes = await SupabaseStorageService.uploadFile("attendance", proofFile, cleanName);
        setIsUploadingProof(false);

        if (uploadRes.url) {
          finalProofUrl = uploadRes.url;
        } else {
          try {
            finalProofUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(proofFile);
            });
          } catch {
            finalProofUrl = "";
          }
        }
      }

      const success = await submitAttendance(
        finalProofUrl,
        finalProofUrl,
        currentTargetSession
      );

      if (success) {
        handleRemoveProofFile();
      }
    } catch (err) {
      console.error("Gagal submit presensi:", err);
      showToast("Terjadi kesalahan saat memproses presensi ke database.", "error");
    } finally {
      setIsSubmittingPresence(false);
      setIsUploadingProof(false);
    }
  };

  const handleVerifyAttendance = async (id: number, verified: boolean) => {
    try {
      await SupabaseService.updateAttendanceVerified(id, verified);
      await refreshFromSupabase();
      showToast(verified ? "Status kehadiran berhasil diverifikasi!" : "Status verifikasi dibatalkan.", "info");
    } catch {
      showToast("Gagal memperbarui status kehadiran.", "error");
    }
  };

  const handleExportExcel = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : zoomData.attendanceLogs;
    if (logsToExport.length === 0) {
      showToast("Belum ada data presensi untuk diekspor ke Excel!", "warning");
      return;
    }

    const selectedSessionObj = sessions.find(
      (s) => String(s.id) === String(attendanceSessionFilter)
    );
    const sessionTitle = selectedSessionObj ? selectedSessionObj.title : "Semua Sesi";

    exportAttendanceToExcel(logsToExport, sessions, sessionTitle);
    showToast(`Rekapitulasi presensi (${logsToExport.length} data) berhasil diekspor!`, "success");
  };

  const handleManualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSessionId || !selectedPesertaId) return;
    const targetSession = sessions.find((s) => String(s.id) === String(manualSessionId));
    if (!targetSession) return;

    const targetUser = users.find((u) => u.id === Number(selectedPesertaId));
    if (!targetUser) {
      showToast("Pilih peserta terlebih dahulu!", "warning");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const ok = await markParticipantAttendance(targetSession.id, targetUser);
      if (ok) {
        setManualModalOpen(false);
        setSelectedPesertaId("");
        showToast(`Kehadiran ${targetUser.name} berhasil disimpan ke tabel absen.`, "success");
      }
    } catch (err) {
      console.error("Gagal presensi manual:", err);
      showToast("Terjadi kesalahan saat menandai kehadiran peserta.", "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleMarkAllAttended = async () => {
    if (!currentTargetSession || !isManager) return;
    if (confirm(`Tandai seluruh peserta aktif hadir pada sesi "${currentTargetSession.title}"?`)) {
      setIsMarkingAll(true);
      try {
        await markAllAttended(currentTargetSession.id);
        showToast("Seluruh peserta aktif berhasil ditandai hadir ke database!", "success");
      } catch (err) {
        console.error("Gagal menandai semua hadir:", err);
        showToast("Terjadi kesalahan saat menyimpan presensi massal.", "error");
      } finally {
        setIsMarkingAll(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Utama */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold tracking-wide uppercase">
                <i className="fa-solid fa-clipboard-user mr-1"></i> Presensi & Absensi
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Tabel: public.absen</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Presensi Pertemuan Zoom
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isPeserta
                ? "Isi daftar hadir sesi pertemuan Zoom Anda dan pantau riwayat absensi yang telah tersimpan."
                : "Kelola absensi kehadiran peserta, verifikasi bukti screenshot Zoom, dan unduh rekapitulasi data kehadiran."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/zoom"
              className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-2 transition-all border border-blue-500/20 shadow-sm"
              title="Buka Jadwal & Ruang Zoom"
            >
              <i className="fa-solid fa-video"></i>
              <span>Jadwal Zoom</span>
            </Link>

            {isManager && (
              <>
                <button
                  onClick={() => setManualModalOpen(true)}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2 transition-all border border-amber-500/20 shadow-sm"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span>Input Manual</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 transition-all border border-emerald-500/20 shadow-sm"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  <span>Ekspor Excel</span>
                </button>
              </>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <i className={`fa-solid fa-arrows-rotate text-syarat ${isRefreshing ? "fa-spin" : ""}`}></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-blue-500/10 text-blue-600">
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Absen</div>
              <div className="text-xl font-black text-slate-800 dark:text-white">
                {zoomData.attendanceLogs?.length || 0}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-emerald-500/10 text-emerald-600">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Terverifikasi</div>
              <div className="text-xl font-black text-emerald-600">
                {(zoomData.attendanceLogs || []).filter((l) => l.verified).length}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-purple-500/10 text-purple-600">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Bukti SS Zoom</div>
              <div className="text-xl font-black text-purple-600">
                {(zoomData.attendanceLogs || []).filter((l) => Boolean(l.proof_url || l.proofUrl)).length}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-amber-500/10 text-amber-600">
              <i className="fa-solid fa-user-check"></i>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Absen Saya</div>
              <div className="text-xl font-black text-amber-600">
                {myAttendanceLogs.length}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: FORM INPUT PRESENSI */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-syarat/10 text-syarat flex items-center justify-center text-base font-bold">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-800 dark:text-white">
                  Formulir Presensi Kehadiran
                </h2>
                <p className="text-xs text-slate-400">
                  Pilih sesi pertemuan, masukkan kode presensi, dan lampirkan tangkapan layar Zoom Anda.
                </p>
              </div>
            </div>

            {userHasAttendedSelectedSession && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                <i className="fa-solid fa-circle-check"></i>
                <span>Anda Sudah Absen di Sesi Ini</span>
              </span>
            )}
          </div>

          <form onSubmit={handlePresenceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropdown Sesi Pertemuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Sesi Pertemuan Zoom:
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-syarat outline-none"
                >
                  {sessions.map((ses) => (
                    <option key={ses.id} value={ses.id}>
                      {ses.title} ({ses.status})
                    </option>
                  ))}
                </select>
                {currentTargetSession && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Jadwal: {currentTargetSession.date} • {currentTargetSession.time} WIB
                  </p>
                )}
              </div>

              {/* Data Akun Peserta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Peserta & Instansi:
                </label>
                <input
                  type="text"
                  disabled
                  value={`${currentUser.name} (${currentUser.institution || "Komunitas BISINDO"})`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ID: {currentUser.user_id || currentUser.npm || currentUser.id} • Role: {currentUser.role}
                </p>
              </div>
            </div>

            {/* Unggah Screenshot Bukti Zoom */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <i className="fa-solid fa-camera text-syarat"></i>
                    <span>Tangkapan Layar (SS) Bukti Mengikuti Zoom</span>
                    <span className="text-[10px] font-normal text-slate-400">(Opsional / Direkomendasikan)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unggah tangkapan layar Zoom meeting Anda yang memperlihatkan nama Anda di room.
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleProofFileChange}
                    className="hidden"
                    id="proofFileInputPresensi"
                  />
                  {!proofPreviewUrl ? (
                    <label
                      htmlFor="proofFileInputPresensi"
                      className="cursor-pointer px-3.5 py-2 rounded-xl bg-syarat text-white text-xs font-bold flex items-center gap-2 hover:bg-syarat/90 transition-all shadow-sm w-fit"
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      <span>Pilih Foto Bukti SS</span>
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveProofFile}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2 transition-all border border-red-500/20"
                    >
                      <i className="fa-solid fa-xmark"></i>
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>
              </div>

              {proofPreviewUrl && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
                  <img
                    src={proofPreviewUrl}
                    alt="Preview Bukti SS"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                      {proofFile?.name || "Bukti Screenshot Zoom"}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                      <i className="fa-solid fa-circle-check text-[9px]"></i>
                      <span>Siap dikirim bersama data absensi</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Submit Presensi */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {isManager && (
                <button
                  type="button"
                  onClick={handleMarkAllAttended}
                  disabled={isMarkingAll}
                  className="px-4 py-2.5 rounded-xl border border-syarat/30 bg-syarat/10 hover:bg-syarat/20 text-syarat text-xs font-bold transition-all flex items-center gap-2"
                >
                  <i className={`fa-solid fa-users-check ${isMarkingAll ? "fa-spin" : ""}`}></i>
                  <span>Tandai Semua Hadir Sesi Ini</span>
                </button>
              )}

              <button
                type="submit"
                disabled={userHasAttendedSelectedSession || isSubmittingPresence || isUploadingProof}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md ${
                  userHasAttendedSelectedSession
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                }`}
              >
                <i
                  className={`fa-solid ${
                    isSubmittingPresence || isUploadingProof
                      ? "fa-spinner fa-spin"
                      : userHasAttendedSelectedSession
                      ? "fa-check-double"
                      : "fa-paper-plane"
                  }`}
                ></i>
                <span>
                  {isSubmittingPresence
                    ? "Menyimpan ke Tabel Absen..."
                    : isUploadingProof
                    ? "Mengunggah Bukti SS..."
                    : userHasAttendedSelectedSession
                    ? "Sudah Presensi"
                    : "Kirim Presensi Sekarang"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: TABEL REKAPITULASI PRESENSI & RIWAYAT ABSEN */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-list-check text-syarat"></i>
                <span>{isPeserta ? "Riwayat Absensi Saya" : attendanceOnlyMe ? "Riwayat Absensi Saya" : "Rekapitulasi Presensi Semua Peserta"}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isPeserta
                  ? "Daftar riwayat kehadiran Anda yang tersimpan di database Supabase (tabel public.absen)."
                  : "Rekapitulasi lengkap data presensi seluruh peserta dari tabel database Supabase public.absen."}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {isManager && (
                <button
                  onClick={() => setAttendanceOnlyMe(!attendanceOnlyMe)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                    attendanceOnlyMe
                      ? "bg-syarat text-white border-syarat shadow-sm shadow-syarat/20"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <i className={`fa-solid ${attendanceOnlyMe ? "fa-circle-check" : "fa-user"}`}></i>
                  <span>{attendanceOnlyMe ? "Tampilkan Semua Peserta" : "Hanya Absen Saya"}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">
                    {myAttendanceLogs.length}
                  </span>
                </button>
              )}

              <select
                value={attendanceSessionFilter}
                onChange={(e) => setAttendanceSessionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat max-w-[200px]"
              >
                <option value="all">Semua Sesi ({zoomData.attendanceLogs?.length || 0})</option>
                {sessions.map((ses) => (
                  <option key={ses.id} value={ses.id}>
                    {ses.title.substring(0, 25)}...
                  </option>
                ))}
              </select>

              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Cari nama / instansi..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat w-36 sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Tabel Presensi */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Peserta</th>
                  <th className="p-3.5">Instansi</th>
                  <th className="p-3.5">Sesi Pertemuan</th>
                  <th className="p-3.5">Tanggal & Waktu Absen</th>
                  <th className="p-3.5">Metode</th>
                  <th className="p-3.5 text-center">Bukti SS Zoom</th>
                  <th className="p-3.5 text-center">Status</th>
                  {isManager && <th className="p-3.5 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? 9 : 8} className="p-10 text-center text-slate-400 space-y-2">
                      <i className="fa-solid fa-inbox text-3xl block text-slate-300"></i>
                      <p className="font-semibold">Belum ada catatan presensi yang cocok dengan filter ini.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, idx) => {
                    const matchedSession = sessions.find(
                      (s) => s.id === (log.sessionId || log.session_id)
                    );
                    const sessionTitle = matchedSession
                      ? matchedSession.title
                      : log.session_id
                      ? `Sesi #${log.session_id}`
                      : "Sesi Zoom Daring";

                    const proofUrl = log.proof_url || log.proofUrl;
                    const participantUser = users.find(
                      (u) =>
                        (log.user_id && (String(u.user_id) === String(log.user_id) || String(u.npm) === String(log.user_id) || String(u.id) === String(log.user_id))) ||
                        ((log as any).user_id_code && (String(u.user_id) === String((log as any).user_id_code) || String(u.npm) === String((log as any).user_id_code))) ||
                        u.name.toLowerCase().trim() === log.name.toLowerCase().trim()
                    );
                    const avatarSrc = participantUser?.avatar_url || participantUser?.avatar;
                    const initials = log.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr
                        key={log.id || idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5 text-center font-mono text-slate-400">
                          {(attendancePage - 1) * attendancePageSize + idx + 1}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white font-bold text-[11px] flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={log.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100">
                                {log.name}
                              </div>
                              {(log.user_id || (log as any).user_id_code || log.npm) && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ID: {log.user_id || (log as any).user_id_code || log.npm}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {log.institution || "Komunitas BISINDO"}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {sessionTitle}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">
                          {log.time && <div className="font-mono text-xs">{(log.time || "").replace(/^Hari ini\s*[•,]\s*/i, "")}</div>}
                          {log.date && <div className="text-[10px] text-slate-400 font-mono">{log.date}</div>}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                            {log.method || "Presensi Mandiri"}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {proofUrl ? (
                            <button
                              onClick={() =>
                                setPreviewProofModal({
                                  open: true,
                                  url: proofUrl,
                                  participantName: log.name,
                                  time: (log.time || "").replace(/^Hari ini\s*[•,]\s*/i, ""),
                                  sessionTitle,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-syarat/10 hover:bg-syarat/20 text-syarat font-bold text-[11px] transition-all border border-syarat/20 shadow-sm"
                            >
                              <i className="fa-solid fa-image"></i>
                              <span>Lihat SS</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Tanpa SS</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {log.verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                              <i className="fa-solid fa-circle-check text-[9px]"></i>
                              <span>Hadir</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <i className="fa-solid fa-clock text-[9px]"></i>
                              <span>Menunggu</span>
                            </span>
                          )}
                        </td>
                        {isManager && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleVerifyAttendance(log.id, !log.verified)}
                                className={`p-1.5 rounded-lg text-xs transition-colors ${
                                  log.verified
                                    ? "text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                                    : "text-green-500 hover:bg-green-500/10"
                                }`}
                                title={log.verified ? "Batalkan Verifikasi" : "Verifikasi Hadir"}
                              >
                                <i className={`fa-solid ${log.verified ? "fa-rotate-left" : "fa-check"}`}></i>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus data presensi ${log.name}?`)) {
                                    deleteAttendanceLog(log.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs transition-colors"
                                title="Hapus Catatan Presensi"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Pagination
              currentPage={attendancePage}
              totalPages={attendanceTotalPages}
              totalItems={filteredLogs.length}
              pageSize={attendancePageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setAttendancePage}
              onPageSizeChange={setAttendancePageSize}
              itemLabel="catatan presensi"
            />
          </div>
        </div>
      </div>

      {/* MODAL PREVIEW SCREENSHOT BUKTI ZOOM */}
      <Modal
        isOpen={Boolean(previewProofModal && previewProofModal.open)}
        onClose={() => setPreviewProofModal(null)}
        title="Bukti Tangkapan Layar (SS) Zoom"
        subtitle={
          previewProofModal ? (
            <span>
              Peserta: <strong>{previewProofModal.participantName}</strong> • {previewProofModal.time}
            </span>
          ) : undefined
        }
        icon="fa-solid fa-camera"
        size="lg"
        footer={
          previewProofModal ? (
            <div className="flex items-center justify-between w-full">
              <a
                href={previewProofModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-syarat hover:underline flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                <span>Buka Gambar Ukuran Penuh</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewProofModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          ) : undefined
        }
      >
        {previewProofModal && (
          <div className="p-2 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden min-h-[250px]">
            <img
              src={previewProofModal.url}
              alt={`Bukti Zoom ${previewProofModal.participantName}`}
              className="max-h-[60vh] max-w-full object-contain rounded-xl"
            />
          </div>
        )}
      </Modal>

      {/* MODAL INPUT PRESENSI MANUAL */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Tandai Kehadiran Manual"
        subtitle="Simpan status hadir langsung ke tabel absen database"
        icon="fa-solid fa-user-check"
        size="md"
      >
        <form onSubmit={handleManualAttendanceSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Sesi Zoom:
            </label>
            <select
              value={manualSessionId}
              onChange={(e) => setManualSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
            >
              {sessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  {ses.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Peserta:
            </label>
            <select
              value={selectedPesertaId}
              onChange={(e) => setSelectedPesertaId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              required
            >
              <option value="">-- Pilih Nama Peserta --</option>
              {users
                .filter((u) => u.role === "peserta")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.user_id || user.npm || user.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingManual || !selectedPesertaId}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              <i className={`fa-solid ${isSubmittingManual ? "fa-spinner fa-spin" : "fa-check"}`}></i>
              <span>Simpan Kehadiran</span>
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}