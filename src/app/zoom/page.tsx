"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { exportAttendanceToExcel } from "@/lib/excelExport";
import { SupabaseStorageService } from "@/lib/supabaseStorage";

export default function ZoomPage() {
  const {
    currentRole,
    currentUser,
    users,
    zoomData,
    submitAttendance,
    deleteAttendanceLog,
    cancelAttendance,
    markAllAttended,
    markParticipantAttendance,
    addZoomSession,
    updateZoomSession,
    deleteZoomSession,
    showToast,
    refreshFromSupabase,
  } = useApp();

  const isManager = currentRole === "mentor" || currentRole === "admin";

  const sessions = zoomData.sessions || [];
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [presenceInput, setPresenceInput] = useState("");
  const [isPesertaConfirmed, setIsPesertaConfirmed] = useState(false);

  // Bukti Screenshot Zoom upload states (Peserta di Card Absen)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>("");
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Attendance Modal states (Admin / Mentor)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedPesertaId, setSelectedPesertaId] = useState<number | "">("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Submission state
  const [isSubmittingPresence, setIsSubmittingPresence] = useState(false);

  // Modal Preview Screenshot Bukti Presensi (Admin, Mentor & Peserta)
  const [previewProofModal, setPreviewProofModal] = useState<{
    open: boolean;
    url: string;
    participantName: string;
    time: string;
    sessionTitle?: string;
    userId?: string;
    institution?: string;
  } | null>(null);

  // Filter & Search Table Presensi
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState<string>("all");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [attendanceOnlyMe, setAttendanceOnlyMe] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Segarkan rekapan presensi & sesi saat halaman Zoom dibuka
  useEffect(() => {
    refreshFromSupabase();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromSupabase();
      showToast("Data presensi dan sesi berhasil disinkronkan dari server!", "success");
    } catch {
      showToast("Gagal menyinkronkan data presensi dari server.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formHost, setFormHost] = useState(currentUser.name || "Mentor");
  const [formStatus, setFormStatus] = useState("Berlangsung");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState("14:00");
  const [formMeetingId, setFormMeetingId] = useState("");
  const [formPasscode, setFormPasscode] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formZoomUrl, setFormZoomUrl] = useState("https://zoom.us");
  const [formDesc, setFormDesc] = useState("");

  const currentSession =
    sessions.length > 0
      ? sessions[activeSessionIdx] || sessions[0]
      : null;

  // Cek apakah user saat ini sudah presensi di sesi aktif ini
  const userSessionLog = useMemo(() => {
    if (!currentSession) return null;
    return zoomData.attendanceLogs.find(
      (l) =>
        (l.sessionId === currentSession.id || l.session_id === currentSession.id) &&
        (l.name.toLowerCase() === currentUser.name.toLowerCase() ||
          (l.user_id && l.user_id === (currentUser.user_id || currentUser.npm)))
    );
  }, [currentSession, zoomData.attendanceLogs, currentUser]);

  const hasAttendedSession = Boolean(userSessionLog) || isPesertaConfirmed;

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin!`, "success");
  };

  // Handler pemilihan file screenshot Zoom oleh peserta
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Format berkas harus berupa gambar (JPG, PNG, JPEG, WEBP)!", "warning");
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
    if (!currentSession) return;

    setIsSubmittingPresence(true);

    try {
      let finalProofUrl = "";

      // Jika ada berkas bukti SS Zoom yang dipilih peserta, unggah ke Supabase Storage (bucket: image, path: attendance)
      if (proofFile) {
        setIsUploadingProof(true);
        showToast("Mengunggah bukti tangkapan layar Zoom ke Cloud Storage...", "info");
        const cleanName = `ss_zoom_${currentSession.id}_${Date.now()}_${proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const uploadRes = await SupabaseStorageService.uploadFile("attendance", proofFile, cleanName);
        setIsUploadingProof(false);

        if (uploadRes.url) {
          finalProofUrl = uploadRes.url;
        } else {
          // Fallback lokal data-URI base64 jika storage remote tidak merespons agar bukti tetap tersimpan
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
        currentSession
      );

      if (success) {
        setIsPesertaConfirmed(true);
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

  // Handler Mentor/Admin menandai seluruh peserta aktif hadir pada sesi ini
  const handleMarkAllAttended = async () => {
    if (!currentSession || !isManager) return;
    if (confirm(`Yakin ingin menandai seluruh peserta aktif hadir pada sesi "${currentSession.title}" ke database?`)) {
      setIsMarkingAll(true);
      try {
        await markAllAttended(currentSession.id);
      } catch (err) {
        console.error("Gagal menandai semua hadir:", err);
        showToast("Terjadi kesalahan saat menyimpan presensi massal ke database.", "error");
      } finally {
        setIsMarkingAll(false);
      }
    }
  };

  // Handler Mentor/Admin input presensi manual per peserta ke database
  const handleManualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || !selectedPesertaId) return;
    const targetUser = users.find((u) => u.id === Number(selectedPesertaId));
    if (!targetUser) {
      showToast("Pilih peserta terlebih dahulu!", "warning");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const ok = await markParticipantAttendance(currentSession.id, targetUser);
      if (ok) {
        setManualModalOpen(false);
        setSelectedPesertaId("");
      }
    } catch (err) {
      console.error("Gagal presensi manual:", err);
      showToast("Terjadi kesalahan saat menandai kehadiran peserta.", "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Total riwayat kehadiran milik pengguna yang sedang login di tabel absen
  const myAttendanceCount = useMemo(() => {
    return (zoomData.attendanceLogs || []).filter((log) => {
      const matchUserId = log.user_id && (
        String(log.user_id) === String(currentUser.id) ||
        String(log.user_id) === String(currentUser.user_id) ||
        String(log.user_id) === String(currentUser.npm)
      );
      const matchUserIdCode = (log as any).user_id_code && (
        String((log as any).user_id_code) === String(currentUser.npm) ||
        String((log as any).user_id_code) === String(currentUser.user_id)
      );
      const matchName = log.name && currentUser.name && log.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
      return Boolean(matchUserId || matchUserIdCode || matchName);
    }).length;
  }, [zoomData.attendanceLogs, currentUser]);

  // Filter attendance logs berdasarkan sesi, pencarian, dan presensi pengguna saat ini
  const filteredLogs = useMemo(() => {
    return (zoomData.attendanceLogs || []).filter((log) => {
      if (attendanceSessionFilter !== "all") {
        const sId = Number(attendanceSessionFilter);
        if ((log.sessionId || log.session_id) !== sId) return false;
      }
      if (attendanceOnlyMe) {
        const matchUserId = log.user_id && (
          String(log.user_id) === String(currentUser.id) ||
          String(log.user_id) === String(currentUser.user_id) ||
          String(log.user_id) === String(currentUser.npm)
        );
        const matchUserIdCode = (log as any).user_id_code && (
          String((log as any).user_id_code) === String(currentUser.npm) ||
          String((log as any).user_id_code) === String(currentUser.user_id)
        );
        const matchName = log.name && currentUser.name && log.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim();
        if (!matchUserId && !matchUserIdCode && !matchName) return false;
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
  }, [zoomData.attendanceLogs, attendanceSessionFilter, attendanceSearch, attendanceOnlyMe, currentUser]);

  // Handler ekspor Excel untuk Admin / Mentor
  const handleExportExcel = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : zoomData.attendanceLogs;
    if (logsToExport.length === 0) {
      showToast("Belum ada data presensi untuk diekspor ke Excel!", "warning");
      return;
    }

    const selectedSessionObj = sessions.find(
      (s) => String(s.id) === String(attendanceSessionFilter)
    );
    const sessionTitle = selectedSessionObj ? selectedSessionObj.title : currentSession?.title;

    const ok = exportAttendanceToExcel(logsToExport, sessions, sessionTitle);
    if (ok) {
      showToast(`Rekap presensi (${logsToExport.length} data) berhasil diunduh dalam format Excel!`, "success");
    }
  };

  // Handler bagi Peserta untuk membatalkan presensi dirinya sendiri pada sesi aktif
  const handleCancelMyAttendance = async () => {
    if (!currentSession) return;
    const confirmCancel = confirm(
      `Yakin ingin membatalkan presensi Anda pada sesi "${currentSession.title}"?\n\nStatus kehadiran Anda akan kembali menjadi belum hadir di database.`
    );
    if (confirmCancel) {
      await cancelAttendance(currentSession.id);
      setIsPesertaConfirmed(false);
    }
  };

  // Handler Hapus Presensi User (WAJIB OTORITAS ADMIN / MENTOR)
  const handleDeleteAttendanceLog = async (log: any) => {
    if (!isManager) {
      showToast("Akses ditolak: Fitur hapus absen user khusus untuk Admin atau Mentor!", "error");
      return;
    }
    const confirmDelete = confirm(
      `[OTORITAS KHUSUS ADMIN / MENTOR]\n\nYakin ingin menghapus catatan presensi peserta:\n• Nama: ${log.name}\n• User ID: ${log.user_id || log.npm || "-"}\n• Waktu: ${log.time}\n\nData presensi ini akan dihapus permanen dari database.`
    );
    if (confirmDelete) {
      await deleteAttendanceLog(log.id);
    }
  };

  // Menghitung jumlah peserta yang hadir pada sesi aktif saat ini
  const currentSessionAttendedCount = useMemo(() => {
    if (!currentSession) return 0;
    return (zoomData.attendanceLogs || []).filter(
      (l) => (l.sessionId === currentSession.id || l.session_id === currentSession.id) && l.verified
    ).length;
  }, [currentSession, zoomData.attendanceLogs]);

  const totalPesertaCount = useMemo(() => {
    return (users || []).filter((u) => u.role === "peserta").length;
  }, [users]);

  const handleOpenCreateModal = () => {
    setFormTitle("");
    setFormHost(currentUser.name || "Mentor");
    setFormStatus("Berlangsung");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("14:00");
    setFormMeetingId(
      Math.floor(100 + Math.random() * 900) +
        " " +
        Math.floor(100 + Math.random() * 900) +
        " " +
        Math.floor(100 + Math.random() * 900)
    );
    setFormPasscode("BISINDO" + new Date().getFullYear());
    setFormCode("BIS-" + Math.floor(100 + Math.random() * 900));
    setFormZoomUrl("https://zoom.us");
    setFormDesc("Interaksi langsung dua arah & evaluasi isyarat BISINDO bersama instruktur.");
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!currentSession) return;
    setFormTitle(currentSession.title);
    setFormHost(currentSession.host);
    setFormStatus(currentSession.status || "Berlangsung");
    setFormDate(currentSession.date || new Date().toISOString().split("T")[0]);
    setFormTime(currentSession.time || "14:00");
    setFormMeetingId(currentSession.meetingId);
    setFormPasscode(currentSession.passcode);
    setFormCode(currentSession.presenceCode);
    setFormZoomUrl(currentSession.zoomUrl || "https://zoom.us");
    setFormDesc(currentSession.desc || "");
    setEditModalOpen(true);
  };

  const handleDeleteCurrentSession = async () => {
    if (!currentSession) return;
    if (confirm(`Yakin ingin menghapus sesi "${currentSession.title}" dari database?`)) {
      await deleteZoomSession(currentSession.id);
      setActiveSessionIdx(0);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-syarat/15 to-tigpad/15 text-syarat dark:text-syarat-light text-xs font-bold border border-syarat/30 inline-flex items-center gap-1.5 mb-1.5 shadow-sm">
              <i className="fa-solid fa-headset text-tigpad"></i> Room Tatap Muka Interaktif BISINDO
            </span>
            <h1
              id="zoomTabHeader"
              className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-syarat to-tigpad bg-clip-text text-transparent"
            >
              Sesi Zoom & Presensi Kehadiran
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Akses ruang pertemuan tatap muka maya, salin link & kredensial Zoom, serta kelola catatan presensi peserta dari database.
            </p>
          </div>

          {/* Mentor / Admin Action Buttons */}
          {isManager && (
            <div id="mentorZoomControlBtn" className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleOpenCreateModal}
                className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-plus-circle text-base"></i>
                <span>Buat Sesi Zoom Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        {sessions.length === 0 ? (
          /* EMPTY PRODUCTION STATE */
          <div className="glass-card rounded-3xl p-10 sm:p-14 text-center space-y-5 border border-dashed border-slate-300 dark:border-slate-700 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-syarat/10 text-syarat flex items-center justify-center text-3xl mx-auto shadow-inner">
              <i className="fa-solid fa-video-slash"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                Belum Ada Sesi Zoom Terjadwal di Database
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                {isManager
                  ? "Database pertemuan tatap muka daring saat ini bersih tanpa data dummy. Klik tombol di bawah untuk menjadwalkan dan menerbitkan ruang Zoom resmi pertama."
                  : "Belum ada agenda sesi Zoom yang dijadwalkan oleh mentor atau pengajar saat ini. Silakan periksa kembali secara berkala."}
              </p>
            </div>

            {isManager && (
              <button
                onClick={handleOpenCreateModal}
                className="btn-duotone px-6 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-plus-circle text-base"></i>
                <span>Jadwalkan Sesi Zoom Pertama</span>
              </button>
            )}
          </div>
        ) : (
          /* SESSIONS ACTIVE CONTAINER */
          <div className="space-y-6">
            {/* 1. SEPARATED: CARD ZOOM (Left) & CARD ABSEN (Right) */}
            {currentSession && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* === CARD ZOOM === */}
                <div
                  id="cardZoom"
                  className="glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Card Zoom Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-syarat/10 text-syarat flex items-center justify-center text-lg shadow-sm">
                          <i className="fa-solid fa-video"></i>
                        </div>
                        <div>
                          <span className="font-black text-base text-slate-800 dark:text-white block">
                            Card Zoom Live
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Ruang Tatap Muka & Kredensial Pertemuan
                          </span>
                        </div>
                      </div>

                      {/* Status Badge Zoom */}
                      <span
                        id="zoomStatusBadge"
                        className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 shadow-sm ${
                          currentSession.status === "Berlangsung"
                            ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                            : currentSession.status === "Terjadwal" || currentSession.status === "Mendatang"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30"
                        }`}
                      >
                        {currentSession.status === "Berlangsung" && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        )}
                        {currentSession.status === "Terjadwal" || currentSession.status === "Mendatang" ? (
                          <i className="fa-regular fa-calendar-check text-xs"></i>
                        ) : currentSession.status === "Selesai" ? (
                          <i className="fa-solid fa-flag-checkered text-xs"></i>
                        ) : null}
                        <span>{currentSession.status}</span>
                      </span>
                    </div>

                    {/* Sesi Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <i className="fa-solid fa-chalkboard-user text-tigpad"></i>
                          <span>Host: {currentSession.host}</span>
                        </span>
                        {sessions.length > 1 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Sesi Aktif: {activeSessionIdx + 1} / {sessions.length}
                          </span>
                        )}
                      </div>
                      <h2
                        id="liveZoomTitle"
                        className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white"
                      >
                        {currentSession.title}
                      </h2>
                      {currentSession.desc && (
                        <p id="liveZoomDesc" className="text-xs text-slate-500 leading-relaxed">
                          {currentSession.desc}
                        </p>
                      )}
                    </div>

                    {/* Date & Time Zoom Box */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-syarat/5 to-tigpad/5 border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <div className="w-9 h-9 rounded-xl bg-syarat/10 text-syarat flex items-center justify-center text-sm shadow-sm">
                          <i className="fa-regular fa-calendar"></i>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">Tanggal Sesi</div>
                          <div className="font-extrabold text-syarat dark:text-syarat-light text-xs">
                            {currentSession.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <div className="w-9 h-9 rounded-xl bg-tigpad/10 text-tigpad flex items-center justify-center text-sm shadow-sm">
                          <i className="fa-regular fa-clock"></i>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">Waktu / Jam</div>
                          <div className="font-extrabold text-tigpad text-xs">
                            {currentSession.time || "14:00"} WIB
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meeting Credentials Box */}
                    <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Meeting ID:</span>
                        <div className="flex items-center gap-2">
                          <span
                            id="liveMeetingId"
                            className="font-mono font-extrabold text-sm text-syarat dark:text-syarat-light tracking-wider"
                          >
                            {currentSession.meetingId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentSession.meetingId, "Meeting ID")}
                            className="text-slate-400 hover:text-syarat p-1 rounded-lg transition-colors"
                            title="Salin Meeting ID"
                          >
                            <i className="fa-regular fa-copy"></i>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-2">
                        <span className="font-bold text-slate-500">Passcode Sesi:</span>
                        <div className="flex items-center gap-2">
                          <span
                            id="livePasscode"
                            className="font-mono font-extrabold text-sm text-tigpad tracking-wider"
                          >
                            {currentSession.passcode}
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentSession.passcode, "Passcode")}
                            className="text-slate-400 hover:text-tigpad p-1 rounded-lg transition-colors"
                            title="Salin Passcode"
                          >
                            <i className="fa-regular fa-copy"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons in Card Zoom */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <a
                        id="btnJoinLiveZoom"
                        href={currentSession.zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-duotone flex-1 py-3 rounded-2xl font-bold text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                      >
                        <i className="fa-solid fa-video"></i>
                        <span>Gabung Ke Ruang Zoom Live</span>
                      </a>
                      <button
                        onClick={() => copyToClipboard(currentSession.zoomUrl, "Link Zoom")}
                        className="px-4 py-3 rounded-2xl glass-card text-xs font-bold flex items-center justify-center gap-2 hover:border-tigpad hover:text-tigpad transition-all shadow-sm"
                      >
                        <i className="fa-regular fa-clone text-tigpad"></i>
                        <span>Salin Link</span>
                      </button>
                    </div>

                    {isManager && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={handleOpenEditModal}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <i className="fa-solid fa-pen-to-square text-syarat"></i>
                          <span>Edit Sesi Zoom</span>
                        </button>
                        <button
                          onClick={handleDeleteCurrentSession}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                          <span>Hapus Sesi</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* === CARD ABSEN === */}
                <div
                  id="cardAbsen"
                  className="glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Card Absen Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-tigpad/10 text-tigpad flex items-center justify-center text-lg shadow-sm">
                          <i className="fa-solid fa-clipboard-user"></i>
                        </div>
                        <div>
                          <span className="font-black text-base text-slate-800 dark:text-white block">
                            Card Absen Sesi
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Presensi Kehadiran & Validasi Database
                          </span>
                        </div>
                      </div>

                      {/* Status Absensi Badge */}
                      {!isManager ? (
                        hasAttendedSession ? (
                          <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-bold border border-green-500/30 inline-flex items-center gap-1.5 shadow-sm">
                            <i className="fa-solid fa-circle-check"></i>
                            <span>Sudah Hadir</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            <span>Belum Absen</span>
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-syarat/15 text-syarat dark:text-syarat-light text-xs font-bold border border-syarat/30 inline-flex items-center gap-1.5 shadow-sm">
                          <i className="fa-solid fa-users-check"></i>
                          <span>{currentSessionAttendedCount} Peserta Hadir</span>
                        </span>
                      )}
                    </div>

                    {/* Kode Presensi Sesi Box */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <i className="fa-solid fa-key text-amber-500"></i>
                          <span>Kode Presensi Sesi:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            id="livePresenceCode"
                            className="font-mono font-black text-sm px-3.5 py-1 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 tracking-wider shadow-sm"
                          >
                            {currentSession.presenceCode}
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentSession.presenceCode, "Kode Presensi")}
                            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors shadow-sm"
                            title="Salin Kode Presensi"
                          >
                            <i className="fa-regular fa-copy text-xs"></i>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isManager
                          ? "Bagikan kode presensi di atas kepada seluruh peserta selama tatap muka Zoom berlangsung."
                          : "Gunakan kode presensi di atas dan lampirkan bukti tangkapan layar (SS) Zoom untuk mencatatkan kehadiran Anda."}
                      </p>
                    </div>

                    {/* Bagian Peserta (Form Input / Status Hadir) */}
                    {!isManager && (
                      <div id="pesertaPresensiBox" className="space-y-4 pt-1">
                        {hasAttendedSession ? (
                          <div className="p-4 sm:p-5 rounded-2xl bg-green-500/10 border border-green-500/30 space-y-3.5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-green-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                                  <i className="fa-solid fa-circle-check"></i>
                                </div>
                                <div>
                                  <div className="font-extrabold text-xs sm:text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                    <span>Kehadiran Anda Telah Terverifikasi!</span>
                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-bold">
                                      Resmi
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {userSessionLog?.time ? `Waktu: ${(userSessionLog.time).replace(/^Hari ini\s*[•,]\s*/i, "")} • ` : ""}Metode: {userSessionLog?.method || "Presensi Mandiri"}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleCancelMyAttendance}
                                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold transition-colors border border-red-500/20 flex items-center gap-1.5 shadow-sm"
                                title="Batalkan presensi kehadiran Anda pada sesi ini"
                              >
                                <i className="fa-solid fa-rotate-left"></i>
                                <span>Batalkan Presensi</span>
                              </button>
                            </div>

                            {/* Bukti Tangkapan Layar jika ada */}
                            {Boolean(userSessionLog?.proof_url || userSessionLog?.proofUrl) ? (
                              <div className="space-y-3">
                                <div className="pt-3 border-t border-green-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={userSessionLog?.proof_url || userSessionLog?.proofUrl || ""}
                                      alt="Bukti Screenshot Zoom Peserta"
                                      onClick={() =>
                                        setPreviewProofModal({
                                          open: true,
                                          url: userSessionLog?.proof_url || userSessionLog?.proofUrl || "",
                                          participantName: currentUser.name,
                                          time: (userSessionLog?.time || "").replace(/^Hari ini\s*[•,]\s*/i, ""),
                                          sessionTitle: currentSession.title,
                                          userId: currentUser.user_id || currentUser.npm,
                                          institution: currentUser.institution,
                                        })
                                      }
                                      className="w-16 h-12 rounded-xl object-cover border border-green-500/40 shadow cursor-pointer hover:scale-105 transition-transform shrink-0"
                                      title="Klik untuk melihat bukti gambar penuh"
                                    />
                                    <div>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                                        Bukti Screenshot Zoom Terverifikasi
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        Tersimpan di Cloud Storage (Tabel Absen)
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewProofModal({
                                        open: true,
                                        url: userSessionLog?.proof_url || userSessionLog?.proofUrl || "",
                                        participantName: currentUser.name,
                                        time: (userSessionLog?.time || "").replace(/^Hari ini\s*[•,]\s*/i, ""),
                                        sessionTitle: currentSession.title,
                                        userId: currentUser.user_id || currentUser.npm,
                                        institution: currentUser.institution,
                                      })
                                    }
                                    className="px-3.5 py-1.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
                                  >
                                    <i className="fa-solid fa-eye text-xs"></i>
                                    <span>Lihat Bukti SS Penuh</span>
                                  </button>
                                </div>
                                {/* Tombol Pintas Seleksi Rekap Absen */}
                                <div className="pt-2.5 border-t border-green-500/20 flex flex-col sm:flex-row gap-2">
                                  <a
                                    href="#tabelAbsenSection"
                                    onClick={() => {
                                      if (currentSession) setAttendanceSessionFilter(String(currentSession.id));
                                      setAttendanceOnlyMe(true);
                                    }}
                                    className="flex-1 py-2 px-3 rounded-xl bg-syarat text-white hover:bg-syarat/90 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                  >
                                    <i className="fa-solid fa-user-check"></i>
                                    <span>Pilih Presensi Saya di Rekap ↓</span>
                                  </a>
                                  <a
                                    href="#tabelAbsenSection"
                                    onClick={() => {
                                      if (currentSession) setAttendanceSessionFilter(String(currentSession.id));
                                      setAttendanceOnlyMe(false);
                                    }}
                                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                                  >
                                    <i className="fa-solid fa-table-list text-tigpad"></i>
                                    <span>Lihat Semua Sesi Ini ↓</span>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-green-500/20 text-[11px] text-slate-400 space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                  <i className="fa-solid fa-circle-info text-amber-500"></i>
                                  <span>Presensi tercatat di database tanpa lampiran screenshot Zoom.</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <a
                                    href="#tabelAbsenSection"
                                    onClick={() => {
                                      if (currentSession) setAttendanceSessionFilter(String(currentSession.id));
                                      setAttendanceOnlyMe(true);
                                    }}
                                    className="flex-1 py-2 px-3 rounded-xl bg-syarat text-white hover:bg-syarat/90 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                  >
                                    <i className="fa-solid fa-user-check"></i>
                                    <span>Pilih Presensi Saya di Rekap ↓</span>
                                  </a>
                                  <a
                                    href="#tabelAbsenSection"
                                    onClick={() => {
                                      if (currentSession) setAttendanceSessionFilter(String(currentSession.id));
                                      setAttendanceOnlyMe(false);
                                    }}
                                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                                  >
                                    <i className="fa-solid fa-table-list text-tigpad"></i>
                                    <span>Lihat Semua Sesi Ini ↓</span>
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* FORM PRESENSI LENGKAP DENGAN UPLOAD SS ZOOM */
                          <form onSubmit={handlePresenceSubmit} className="space-y-4">
                            {/* Info Peserta */}
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                  <i className="fa-solid fa-user-check"></i>
                                </div>
                                <div>
                                  <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                                    {currentUser.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {currentUser.institution || "Komunitas BISINDO"} • ID: {currentUser.user_id || currentUser.npm || currentUser.id}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                Siap Absen
                              </span>
                            </div>

                            {/* Fitur Unggah Bukti Screenshot (SS) Zoom */}
                            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <label className="block font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                                  <i className="fa-solid fa-camera text-syarat"></i>
                                  <span>Lampirkan Bukti Screenshot (SS) Zoom</span>
                                </label>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light font-bold">
                                  {proofFile ? "File Terpilih" : "Disarankan"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Unggah foto tangkapan layar saat Anda berada di dalam ruang Zoom bersama pemateri atau peserta lainnya.
                              </p>

                              {/* Hidden file input */}
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={handleProofFileChange}
                                className="hidden"
                                id="uploadSsZoomInput"
                              />

                              {!proofPreviewUrl ? (
                                <label
                                  htmlFor="uploadSsZoomInput"
                                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-syarat hover:bg-syarat/5 dark:hover:bg-syarat/10 transition-all cursor-pointer group text-center space-y-1.5"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-syarat/10 text-syarat flex items-center justify-center text-lg group-hover:scale-110 transition-transform shadow-inner">
                                    <i className="fa-solid fa-cloud-arrow-up"></i>
                                  </div>
                                  <div className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-syarat transition-colors">
                                    Klik di sini untuk memilih foto screenshot Zoom
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Mendukung format PNG, JPG, JPEG, WEBP (Maksimal 10 MB)
                                  </div>
                                </label>
                              ) : (
                                /* Pratinjau Gambar Terpilih */
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img
                                      src={proofPreviewUrl}
                                      alt="Preview Bukti SS Zoom"
                                      onClick={() =>
                                        setPreviewProofModal({
                                          open: true,
                                          url: proofPreviewUrl,
                                          participantName: currentUser.name,
                                          time: "Pratinjau Baru",
                                          sessionTitle: currentSession.title,
                                          userId: currentUser.user_id || currentUser.npm,
                                          institution: currentUser.institution,
                                        })
                                      }
                                      className="w-16 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer hover:scale-105 transition-transform shrink-0"
                                      title="Klik untuk memperbesar pratinjau"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                        {proofFile?.name || "Tangkapan Layar Zoom"}
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span>
                                          {proofFile ? `${(proofFile.size / 1024).toFixed(1)} KB` : "Gambar Terlampir"}
                                        </span>
                                        <span className="text-green-500 font-bold flex items-center gap-1">
                                          <i className="fa-solid fa-check"></i> Siap Diunggah
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <label
                                      htmlFor="uploadSsZoomInput"
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                                      title="Ganti berkas screenshot"
                                    >
                                      Ganti
                                    </label>
                                    <button
                                      type="button"
                                      onClick={handleRemoveProofFile}
                                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                      title="Hapus berkas ini"
                                    >
                                      <i className="fa-solid fa-trash-can text-xs"></i>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Tombol Kirim Absen */}
                            <button
                              type="submit"
                              disabled={isSubmittingPresence || isUploadingProof}
                              className="btn-duotone w-full py-3 rounded-2xl text-xs font-black shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-60"
                            >
                              {isSubmittingPresence || isUploadingProof ? (
                                <>
                                  <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                                  <span>{isUploadingProof ? "Mengunggah Bukti SS Zoom..." : "Menyimpan Kehadiran..."}</span>
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-paper-plane text-sm"></i>
                                  <span>Kirim Presensi & Bukti Kehadiran</span>
                                </>
                              )}
                            </button>

                            <div className="text-[11px] text-slate-400 flex items-center justify-between gap-1 pt-0.5">
                              <span className="flex items-center gap-1">
                                <i className="fa-solid fa-cloud-arrow-up text-syarat text-xs"></i>
                                <span>Otomatis diverifikasi & tercatat di database Cloud (Tabel Absen).</span>
                              </span>
                              {proofFile && (
                                <span className="text-tigpad font-bold flex items-center gap-1">
                                  <i className="fa-solid fa-image text-xs"></i> +1 Berkas SS
                                </span>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Bagian Mentor / Admin (Kontrol Absensi Sesi) */}
                    {isManager && (
                      <div className="space-y-4 pt-1">
                        {/* Quick Stats Absen Sesi Aktif */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Hadir Sesi Ini</span>
                            <div className="text-xl font-black text-green-600 dark:text-green-400">
                              {currentSessionAttendedCount} Peserta
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Belum Absen</span>
                            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                              {Math.max(0, totalPesertaCount - currentSessionAttendedCount)} Peserta
                            </div>
                          </div>
                        </div>

                        {/* Tombol Kontrol Absen Mentor */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                            Aksi Cepat Absensi Sesi:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <button
                              onClick={handleMarkAllAttended}
                              disabled={isMarkingAll}
                              className="py-2.5 px-3 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-700 dark:text-green-300 font-bold border border-green-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                              title="Tandai seluruh peserta aktif hadir pada sesi ini ke database"
                            >
                              <i className={`fa-solid ${isMarkingAll ? "fa-spinner fa-spin" : "fa-check-double"}`}></i>
                              <span>{isMarkingAll ? "Menyimpan..." : "Hadirkan Semua Peserta"}</span>
                            </button>
                            <button
                              onClick={() => setManualModalOpen(true)}
                              className="py-2.5 px-3 rounded-xl bg-syarat/15 hover:bg-syarat/25 text-syarat dark:text-syarat-light font-bold border border-syarat/30 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                              title="Tandai hadir peserta tertentu secara manual"
                            >
                              <i className="fa-solid fa-user-check"></i>
                              <span>Input Absen Manual</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-shield-halved text-tigpad"></i> Database Absensi Terlindungi
                    </span>
                    <span>Tabel: absen</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. AGENDA SESI KELAS ZOOM (Grid of Scheduled Sessions) */}
            <div className="glass-card rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-syarat/10 text-syarat flex items-center justify-center text-sm font-bold shadow-sm">
                    <i className="fa-solid fa-calendar-days"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white">
                      Agenda Sesi Tatap Muka Zoom
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Pilih sesi di bawah untuk menampilkan detail pada Card Zoom & Card Absen di atas.
                    </p>
                  </div>
                </div>
                <span
                  id="sessionCountBadge"
                  className="text-xs font-bold px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light"
                >
                  {sessions.length} Sesi Terdaftar
                </span>
              </div>

              {/* Grid kartu sesi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs" id="zoomSessionsListContainer">
                {sessions.map((ses, idx) => {
                  const isSelected = activeSessionIdx === idx;
                  return (
                    <div
                      key={ses.id}
                      onClick={() => setActiveSessionIdx(idx)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "bg-syarat/10 border-syarat shadow-md ring-2 ring-syarat/30"
                          : "bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ses.status === "Berlangsung"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20"
                              : ses.status === "Terjadwal" || ses.status === "Mendatang"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {ses.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {ses.meetingId}
                        </span>
                      </div>
                      <div className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">
                        {ses.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between gap-1 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar text-syarat"></i> {ses.date}
                        </span>
                        {ses.time && (
                          <span className="flex items-center gap-1 text-tigpad font-semibold">
                            <i className="fa-regular fa-clock"></i> {ses.time} WIB
                          </span>
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <i className="fa-solid fa-chalkboard-user text-xs"></i> {ses.host}
                        </span>
                        {isManager && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Hapus sesi "${ses.title}"?`)) {
                                deleteZoomSession(ses.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                            title="Hapus sesi ini"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

                        {/* 3. CARD SHORTCUT KE MENU PRESENSI */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-blue-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 shrink-0">
                  <i className="fa-solid fa-clipboard-user"></i>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-extrabold text-[10px] tracking-wide uppercase">
                      Menu Terpisah
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">• Database: public.absen</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                    Kelola Presensi & Rekapitulasi Kehadiran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                    Menu presensi dan riwayat absensi kini telah dipisahkan ke menu khusus agar lebih rapi. Peserta dapat mengisi absensi dengan bukti screenshot Zoom, sedangkan mentor/admin dapat memverifikasi kehadiran dan mengekspor rekap ke Excel.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <Link
                  href="/presensi"
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Buka Menu Presensi & Absen</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Buat Sesi Zoom Baru */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setCreateModalOpen(false)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-tigpad flex items-center gap-2">
                <i className="fa-solid fa-plus-circle"></i> Buat Sesi Zoom Baru
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!formTitle.trim()) {
                  showToast("Judul sesi wajib diisi!", "warning");
                  return;
                }
                await addZoomSession({
                  title: formTitle,
                  meetingId: formMeetingId,
                  passcode: formPasscode,
                  presenceCode: formCode,
                  date: formDate,
                  time: formTime,
                  status: formStatus,
                  host: formHost,
                  zoomUrl: formZoomUrl || "https://zoom.us",
                  desc: formDesc || "Sesi tatap muka daring interaktif bersama instruktur.",
                });
                setCreateModalOpen(false);
                setFormTitle("");
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Judul Sesi Pertemuan</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Topik atau judul sesi pertemuan..."
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Status Sesi</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Tanggal (Date)</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Waktu / Jam (Time)</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Host / Instruktur</label>
                <input
                  type="text"
                  required
                  value={formHost}
                  onChange={(e) => setFormHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Meeting ID</label>
                  <input
                    type="text"
                    required
                    value={formMeetingId}
                    onChange={(e) => setFormMeetingId(e.target.value)}
                    placeholder="890 123 456"
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Passcode Sesi</label>
                  <input
                    type="text"
                    required
                    value={formPasscode}
                    onChange={(e) => setFormPasscode(e.target.value)}
                    placeholder="BISINDO26"
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode Presensi Sesi</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="BIS-890"
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tautan Zoom (URL)</label>
                  <input
                    type="text"
                    required
                    value={formZoomUrl}
                    onChange={(e) => setFormZoomUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi / Materi Sesi</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan materi yang akan dipelajari dalam tatap muka..."
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Terbitkan Sesi Ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Sesi Zoom */}
      {editModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setEditModalOpen(false)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-syarat dark:text-syarat-light flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square"></i> Edit Sesi Zoom
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateZoomSession(currentSession.id, {
                  title: formTitle,
                  meetingId: formMeetingId,
                  passcode: formPasscode,
                  presenceCode: formCode,
                  date: formDate,
                  time: formTime,
                  status: formStatus,
                  host: formHost,
                  zoomUrl: formZoomUrl,
                  desc: formDesc,
                });
                setEditModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold mb-1">Judul Sesi Pertemuan</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Status Sesi</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Tanggal (Date)</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Waktu / Jam (Time)</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Host / Instruktur</label>
                <input
                  type="text"
                  required
                  value={formHost}
                  onChange={(e) => setFormHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Meeting ID</label>
                  <input
                    type="text"
                    required
                    value={formMeetingId}
                    onChange={(e) => setFormMeetingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Passcode</label>
                  <input
                    type="text"
                    required
                    value={formPasscode}
                    onChange={(e) => setFormPasscode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Kode Presensi Sesi</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tautan Zoom (URL)</label>
                  <input
                    type="text"
                    required
                    value={formZoomUrl}
                    onChange={(e) => setFormZoomUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi Sesi</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Simpan Perubahan Ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Bukti Screenshot Zoom Penuh */}
      {previewProofModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setPreviewProofModal(null)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-2xl w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-camera text-syarat"></i>
                  <span>Bukti Screenshot Presensi Zoom</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {previewProofModal.participantName}{" "}
                  {previewProofModal.userId ? `(${previewProofModal.userId})` : ""}{" "}
                  • {previewProofModal.institution || "Peserta"}
                </p>
              </div>
              <button
                onClick={() => setPreviewProofModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Tutup"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Display Image */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[60vh] p-2">
              <img
                src={previewProofModal.url}
                alt={`Screenshot ${previewProofModal.participantName}`}
                className="max-h-[56vh] w-auto max-w-full object-contain rounded-xl shadow-md"
              />
            </div>

            {/* Modal Footer Info & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
              <div className="text-slate-500 text-[11px] space-y-0.5">
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Waktu Presensi:</strong>{" "}
                  {previewProofModal.time}
                </div>
                {previewProofModal.sessionTitle && (
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Sesi:</strong>{" "}
                    {previewProofModal.sessionTitle}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {previewProofModal.url.startsWith("http") && (
                  <a
                    href={previewProofModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-syarat/10 hover:bg-syarat/20 text-syarat dark:text-syarat-light font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    <span>Buka Tautan Asli</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewProofModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Presensi Manual (Mentor / Admin) */}
      {manualModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setManualModalOpen(false)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-md w-full relative z-10 animate-slide-up space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-user-check text-syarat"></i>
                <span>Tandai Presensi Manual</span>
              </h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleManualAttendanceSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-500">Sesi Pertemuan:</div>
                <div className="font-bold text-slate-800 dark:text-white">{currentSession.title}</div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                  Pilih Peserta:
                </label>
                <select
                  required
                  value={selectedPesertaId}
                  onChange={(e) => setSelectedPesertaId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat font-medium"
                >
                  <option value="">-- Pilih Peserta --</option>
                  {users
                    .filter((u) => u.role === "peserta")
                    .map((p) => {
                      const alreadyInSession = zoomData.attendanceLogs.some(
                        (l) =>
                          (l.sessionId === currentSession.id || l.session_id === currentSession.id) &&
                          (l.name.toLowerCase() === p.name.toLowerCase() ||
                            (l.user_id && l.user_id === (p.user_id || p.npm)))
                      );
                      return (
                        <option key={p.id} value={p.id} disabled={alreadyInSession}>
                          {p.name} {p.user_id || p.npm ? `(${p.user_id || p.npm})` : ""} {alreadyInSession ? "• [Sudah Hadir]" : ""}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual || !selectedPesertaId}
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingManual ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Menyimpan ke DB...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Simpan Ke Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
 