"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseStorageService } from "@/lib/supabaseStorage";
import { exportAttendanceToExcel } from "@/lib/excelExport";

export default function ZoomPage() {
  const {
    currentRole,
    currentUser,
    zoomData,
    submitAttendance,
    deleteAttendanceLog,
    cancelAttendance,
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

  // Screenshot Zoom Upload states (Wajib bagi Peserta)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmittingPresence, setIsSubmittingPresence] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [formDate, setFormDate] = useState("Kamis, 14:00 WIB");
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

  // Handler pemilihan berkas screenshot Zoom
  const handleFileSelect = (file: File) => {
    setProofError(null);
    if (!file.type.startsWith("image/")) {
      const msg = "Format file bukti harus berupa gambar (PNG, JPG, JPEG, WEBP).";
      setProofError(msg);
      showToast(msg, "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const msg = "Ukuran screenshot maksimal 5MB.";
      setProofError(msg);
      showToast(msg, "warning");
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin!`, "success");
  };

  const handlePresenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    if (!presenceInput.trim()) {
      showToast("Masukkan kode presensi sesi!", "warning");
      return;
    }

    // VALIDASI WAJIB: Peserta wajib mengunggah screenshot Zoom
    if (!proofFile && !proofPreview) {
      const msg = "Wajib mengunggah bukti screenshot (tangkapan layar) Zoom!";
      setProofError(msg);
      showToast(msg, "error");
      return;
    }

    if (
      presenceInput.trim().toUpperCase() !== currentSession.presenceCode.toUpperCase()
    ) {
      showToast("Kode presensi tidak sesuai!", "error");
      return;
    }

    setIsSubmittingPresence(true);
    setProofError(null);

    try {
      let finalProofUrl = proofPreview || "";

      // Unggah ke Supabase Storage terlebih dahulu
      if (proofFile) {
        const cleanName = `zoom_${currentSession.id}_${currentUser.id || "u"}_${Date.now()}`;
        const uploadRes = await SupabaseStorageService.uploadFile(
          "attendance",
          proofFile,
          cleanName
        );
        if (uploadRes && uploadRes.url) {
          finalProofUrl = uploadRes.url;
        }
      }

      const success = await submitAttendance(
        presenceInput.trim().toUpperCase(),
        finalProofUrl,
        currentSession
      );

      if (success) {
        setIsPesertaConfirmed(true);
        setPresenceInput("");
        setProofFile(null);
        setProofPreview(null);
        setProofError(null);
      }
    } catch (err) {
      console.error("Gagal submit presensi:", err);
      showToast("Terjadi kesalahan saat memproses presensi.", "error");
    } finally {
      setIsSubmittingPresence(false);
    }
  };

  // Filter attendance logs berdasarkan sesi dan pencarian nama/ID/instansi
  const filteredLogs = useMemo(() => {
    return (zoomData.attendanceLogs || []).filter((log) => {
      if (attendanceSessionFilter !== "all") {
        const sId = Number(attendanceSessionFilter);
        if ((log.sessionId || log.session_id) !== sId) return false;
      }
      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase();
        const matchName = log.name.toLowerCase().includes(q);
        const matchId = (log.user_id || log.npm || "").toLowerCase().includes(q);
        const matchInst = (log.institution || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchInst) return false;
      }
      return true;
    });
  }, [zoomData.attendanceLogs, attendanceSessionFilter, attendanceSearch]);

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
      `Yakin ingin membatalkan presensi Anda pada sesi "${currentSession.title}"?\n\nBukti screenshot yang telah diunggah akan dihapus dan status Anda akan kembali belum hadir.`
    );
    if (confirmCancel) {
      await cancelAttendance(currentSession.id);
      setIsPesertaConfirmed(false);
      setProofFile(null);
      setProofPreview(null);
      setProofError(null);
    }
  };

  // Handler Hapus Presensi User (WAJIB OTORITAS ADMIN / MENTOR)
  const handleDeleteAttendanceLog = async (log: any) => {
    if (!isManager) {
      showToast("Akses ditolak: Fitur hapus absen user khusus untuk Admin atau Mentor!", "error");
      return;
    }
    const confirmDelete = confirm(
      `[OTORITAS KHUSUS ADMIN / MENTOR]\n\nYakin ingin menghapus catatan presensi peserta:\n• Nama: ${log.name}\n• User ID: ${log.user_id || log.npm || "-"}\n• Waktu: ${log.time}\n\nData presensi dan bukti screenshot Zoom ini akan dihapus permanen dari sistem & database.`
    );
    if (confirmDelete) {
      await deleteAttendanceLog(log.id);
    }
  };

  const handleOpenCreateModal = () => {
    setFormTitle("");
    setFormHost(currentUser.name || "Mentor");
    setFormDate("Hari ini • 14:00 - 15:30 WIB");
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
    setFormDate(currentSession.date);
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
          /* SESSIONS ACTIVE GRID */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ACTIVE LIVE ZOOM ROOM CARD (COL-SPAN-7) */}
            {currentSession && (
              <div className="lg:col-span-7 glass-card rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
                {/* Live Meeting Details Card Header */}
                <div className="space-y-2.5 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span
                      id="zoomStatusBadge"
                      className="px-3 py-1 rounded-full bg-red-500/15 text-red-500 text-[10px] font-bold border border-red-500/30 inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span>{currentSession.status}</span>
                    </span>
                    <span
                      id="liveZoomInstructor"
                      className="text-[11px] font-bold text-slate-500 flex items-center gap-1"
                    >
                      <i className="fa-solid fa-chalkboard-user text-tigpad"></i>{" "}
                      {currentSession.host}
                    </span>
                  </div>

                  <div>
                    <h2
                      id="liveZoomTitle"
                      className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white"
                    >
                      {currentSession.title}
                    </h2>
                    {currentSession.desc && (
                      <p id="liveZoomDesc" className="text-xs text-slate-500 mt-1">
                        {currentSession.desc}
                      </p>
                    )}
                    <div
                      id="liveZoomTime"
                      className="text-[11px] text-syarat dark:text-syarat-light font-bold mt-1.5 flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-clock"></i> {currentSession.date}
                    </div>
                  </div>
                </div>

                {/* Meeting Credentials Box */}
                <div className="space-y-3">
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

                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      <span className="font-bold text-slate-500 flex items-center gap-1">
                        <i className="fa-solid fa-key text-amber-500"></i> Kode Presensi Sesi:
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          id="livePresenceCode"
                          className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        >
                          {currentSession.presenceCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentSession.presenceCode, "Kode Presensi")}
                          className="text-slate-400 hover:text-amber-500 p-1 rounded-lg transition-colors"
                          title="Salin Kode Presensi"
                        >
                          <i className="fa-regular fa-copy"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <a
                      id="btnJoinLiveZoom"
                      href={currentSession.zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-duotone flex-1 py-3.5 rounded-2xl font-bold text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                      <i className="fa-solid fa-video"></i>
                      <span>Gabung Ke Ruang Zoom Live</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(currentSession.zoomUrl, "Link Zoom")}
                      className="px-4 py-3.5 rounded-2xl glass-card text-xs font-bold flex items-center justify-center gap-2 hover:border-tigpad hover:text-tigpad transition-all shadow-sm"
                    >
                      <i className="fa-regular fa-clone text-tigpad"></i>
                      <span>Salin Tautan</span>
                    </button>
                  </div>
                </div>

                {/* Peserta Attendance Box (Konfirmasi Hadir & Bukti Screenshot Zoom) */}
                {!isManager && (
                  <div
                    id="pesertaPresensiBox"
                    className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4"
                  >
                    {hasAttendedSession ? (
                      /* Status Presensi Sudah Terverifikasi */
                      <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center font-bold text-base shadow">
                              <i className="fa-solid fa-circle-check"></i>
                            </div>
                            <div>
                              <div className="font-extrabold text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                <span>Kehadiran Anda Telah Terverifikasi!</span>
                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-bold">
                                  Resmi
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Waktu: {userSessionLog?.time || "Hari ini • Baru saja"} • Metode: {userSessionLog?.method || "Kode Sesi & SS Zoom"} ({currentSession.presenceCode})
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

                        {/* Bukti Tangkapan Layar (Screenshot) Zoom yang Diunggah */}
                        {(userSessionLog?.proof_url || userSessionLog?.proofUrl || proofPreview) && (
                          <div className="pt-2.5 border-t border-green-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                              <img
                                src={userSessionLog?.proof_url || userSessionLog?.proofUrl || proofPreview || ""}
                                alt="Bukti Screenshot Zoom Peserta"
                                onClick={() =>
                                  setPreviewProofModal({
                                    open: true,
                                    url: userSessionLog?.proof_url || userSessionLog?.proofUrl || proofPreview || "",
                                    participantName: currentUser.name,
                                    time: userSessionLog?.time || "Hari ini",
                                    sessionTitle: currentSession.title,
                                    userId: currentUser.user_id || currentUser.npm,
                                    institution: currentUser.institution,
                                  })
                                }
                                className="w-14 h-11 rounded-lg object-cover border border-green-500/40 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                title="Klik untuk melihat bukti gambar penuh"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                                  Bukti Screenshot Zoom Terlampir
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Tangkapan layar ruang tatap muka terverifikasi di database
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewProofModal({
                                  open: true,
                                  url: userSessionLog?.proof_url || userSessionLog?.proofUrl || proofPreview || "",
                                  participantName: currentUser.name,
                                  time: userSessionLog?.time || "Hari ini",
                                  sessionTitle: currentSession.title,
                                  userId: currentUser.user_id || currentUser.npm,
                                  institution: currentUser.institution,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
                            >
                              <i className="fa-solid fa-eye text-xs"></i>
                              <span>Lihat Bukti SS</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Form Input Presensi & Wajib Upload Screenshot Zoom */
                      <form onSubmit={handlePresenceSubmit} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <i className="fa-solid fa-key text-amber-500"></i>
                            <span>1. Masukkan Kode Presensi Sesi:</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Kode diumumkan saat Zoom
                          </span>
                        </div>

                        <input
                          type="text"
                          required
                          value={presenceInput}
                          onChange={(e) => setPresenceInput(e.target.value.toUpperCase())}
                          placeholder="Masukkan kode presensi (cth: BIS-884)..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-syarat transition-all"
                        />

                        {/* Upload Bukti Screenshot Zoom (Wajib) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <i className="fa-solid fa-camera text-syarat"></i>
                              <span>2. Upload Bukti Screenshot Layar Zoom:</span>
                              <span className="text-red-500 font-black text-xs">* (Wajib)</span>
                            </label>
                            <span className="text-[10px] text-slate-400">PNG / JPG (Maks 5MB)</span>
                          </div>

                          {!proofPreview ? (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  handleFileSelect(e.dataTransfer.files[0]);
                                }
                              }}
                              className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                proofError
                                  ? "border-red-500/80 bg-red-500/5 ring-2 ring-red-500/20"
                                  : "border-slate-300 dark:border-slate-700 hover:border-syarat"
                              }`}
                            >
                              <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileSelect(e.target.files[0]);
                                  }
                                }}
                              />
                              <div className="w-10 h-10 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center mx-auto mb-2 text-lg">
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                              </div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Klik atau seret file screenshot Zoom ke sini
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Pastikan tampilan layar Zoom Anda terlihat jelas sebagai bukti kehadiran.
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <img
                                  src={proofPreview}
                                  alt="Pratinjau Bukti Screenshot"
                                  onClick={() =>
                                    setPreviewProofModal({
                                      open: true,
                                      url: proofPreview,
                                      participantName: currentUser.name,
                                      time: "Baru saja",
                                      sessionTitle: currentSession.title,
                                      userId: currentUser.user_id || currentUser.npm,
                                      institution: currentUser.institution,
                                    })
                                  }
                                  className="w-14 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow cursor-pointer hover:scale-105 transition-transform shrink-0"
                                  title="Klik untuk melihat pratinjau penuh"
                                />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                                    <i className="fa-solid fa-circle-check text-green-500 shrink-0"></i>
                                    <span className="truncate">{proofFile?.name || "screenshot_zoom.png"}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {proofFile ? `${(proofFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ""}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewProofModal({
                                          open: true,
                                          url: proofPreview,
                                          participantName: currentUser.name,
                                          time: "Baru saja",
                                          sessionTitle: currentSession.title,
                                          userId: currentUser.user_id || currentUser.npm,
                                          institution: currentUser.institution,
                                        })
                                      }
                                      className="text-syarat hover:underline font-semibold"
                                    >
                                      Pratinjau Penuh
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                >
                                  Ganti
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProofFile(null);
                                    setProofPreview(null);
                                    setProofError(null);
                                  }}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Hapus gambar"
                                >
                                  <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileSelect(e.target.files[0]);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {proofError && (
                            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1 animate-shake">
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              <span>{proofError}</span>
                            </p>
                          )}
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmittingPresence}
                          className="btn-duotone w-full py-3 rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform disabled:opacity-60"
                        >
                          {isSubmittingPresence ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin"></i>
                              <span>Mengunggah Bukti SS & Verifikasi Presensi...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-cloud-arrow-up"></i>
                              <span>Konfirmasi Kehadiran & Unggah Bukti SS</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Mentor / Admin Control Panel for Active Session */}
                {isManager && (
                  <div
                    id="mentorPresensiControlBox"
                    className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-tigpad flex items-center gap-1.5">
                        <i className="fa-solid fa-sliders"></i> Panel Pengaturan Sesi Aktif (Mentor/Admin)
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Kode Aktif:{" "}
                        <strong className="text-amber-500" id="mentorActiveCodeBadge">
                          {currentSession.presenceCode}
                        </strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <button
                        onClick={handleOpenEditModal}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-pen-to-square text-syarat"></i> Edit Sesi Ini
                      </button>
                      <button
                        onClick={() => showToast("Semua peserta aktif ditandai hadir!", "success")}
                        className="py-2.5 px-3 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-700 dark:text-green-300 font-bold border border-green-500/30 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-check-double"></i> Hadirkan Semua
                      </button>
                      <button
                        onClick={handleDeleteCurrentSession}
                        className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold border border-red-500/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <i className="fa-solid fa-trash-can"></i> Hapus Sesi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT COLUMN: DAFTAR SESI ZOOM (COL-SPAN-5) */}
            <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-tigpad"></i> Agenda Sesi Kelas Zoom
                  </h3>
                  <span
                    id="sessionCountBadge"
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light"
                  >
                    {sessions.length} Sesi Terjadwal
                  </span>
                </div>

                {/* Session Item Cards List */}
                <div
                  className="space-y-3 text-xs overflow-y-auto max-h-[460px] pr-1"
                  id="zoomSessionsListContainer"
                >
                  {sessions.map((ses, idx) => {
                    const isSelected = activeSessionIdx === idx;
                    return (
                      <div
                        key={ses.id}
                        onClick={() => setActiveSessionIdx(idx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "bg-syarat/10 border-syarat shadow-md ring-1 ring-syarat/20"
                            : "bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {ses.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {ses.meetingId}
                          </span>
                        </div>
                        <div className="font-extrabold text-sm text-slate-800 dark:text-white">
                          {ses.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-regular fa-clock text-tigpad"></i> {ses.date}
                          </span>
                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Hapus sesi "${ses.title}"?`)) {
                                  deleteZoomSession(ses.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 p-1"
                              title="Hapus sesi ini"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-500">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-info text-syarat"></i> Petunjuk Presensi Zoom
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Pastikan Anda mengonfirmasi kehadiran atau memasukkan Kode Presensi yang diumumkan oleh Mentor saat pertemuan Zoom berlangsung. Catatan presensi otomatis tersimpan di database Cloud.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: LOG ANALYTICAL DATATABLE, PROOF SCREENSHOTS & EXCEL EXPORT */}
        <div
          id="presensiLogSection"
          className="glass-card rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl border border-slate-200 dark:border-slate-800"
        >
          {/* Header Bar: Title, Search, Filter & Excel Export */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-clipboard-user text-syarat"></i>
                <span>Catatan Presensi & Rekap Kehadiran Peserta</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifikasi kehadiran tatap muka, bukti tangkapan layar Zoom peserta, dan ekspor rekap ke Excel.
              </p>
            </div>

            {/* Filter, Search & Excel Action Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Filter Sesi */}
              <select
                value={attendanceSessionFilter}
                onChange={(e) => setAttendanceSessionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat"
              >
                <option value="all">Semua Sesi Zoom ({zoomData.attendanceLogs.length})</option>
                {sessions.map((ses) => (
                  <option key={ses.id} value={ses.id}>
                    {ses.title.substring(0, 24)}...
                  </option>
                ))}
              </select>

              {/* Pencarian */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Cari nama / User ID..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat w-40 sm:w-48"
                />
              </div>

              {/* Tombol Segarkan Data Presensi Langsung dari Supabase */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Muat ulang rekapan presensi dan sesi dari server Supabase"
              >
                <i className={`fa-solid fa-arrows-rotate text-xs ${isRefreshing ? "fa-spin text-syarat" : ""}`}></i>
                <span>{isRefreshing ? "Menyinkron..." : "Segarkan"}</span>
              </button>

              {/* Tombol Export Excel List Absen (Untuk Admin / Mentor) */}
              {isManager && (
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-all"
                  title="Unduh data presensi ini ke format Microsoft Excel (.xlsx)"
                >
                  <i className="fa-solid fa-file-excel text-sm"></i>
                  <span>Export Excel ({filteredLogs.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Header Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Total Log Presensi</div>
              <div
                className="text-2xl font-black text-slate-800 dark:text-white"
                id="statTotalStudents"
              >
                {filteredLogs.length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Terverifikasi Hadir</div>
              <div
                className="text-2xl font-black text-green-600 dark:text-green-400"
                id="statAttendedStudents"
              >
                {filteredLogs.filter((l) => l.verified).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Bukti SS Zoom</div>
              <div className="text-2xl font-black text-syarat dark:text-syarat-light" id="statWithProofStudents">
                {filteredLogs.filter((l) => Boolean(l.proof_url || l.proofUrl)).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">
                Persentase Kehadiran
              </div>
              <div className="text-2xl font-black text-tigpad">
                {filteredLogs.length > 0
                  ? `${Math.round(
                      (filteredLogs.filter((l) => l.verified).length / filteredLogs.length) * 100
                    )}%`
                  : "0%"}
              </div>
            </div>
          </div>

          {/* Table Presensi dengan Kolom Bukti SS Zoom */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-12 text-center">No</th>
                  <th className="p-3.5">Nama Peserta</th>
                  <th className="p-3.5">Instansi</th>
                  <th className="p-3.5">Sesi Pertemuan</th>
                  <th className="p-3.5">Waktu Presensi</th>
                  <th className="p-3.5">Metode</th>
                  <th className="p-3.5">Bukti SS Zoom</th>
                  <th className="p-3.5 text-center">Status</th>
                  {isManager && (
                    <th className="p-3.5 text-center w-24">
                      <span className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200">
                        <i className="fa-solid fa-user-shield text-tigpad"></i>
                        <span>Aksi</span>
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? 9 : 8} className="p-10 text-center text-slate-500 text-xs font-semibold">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400 text-xl">
                        <i className="fa-solid fa-user-xmark"></i>
                      </div>
                      Belum ada catatan presensi peserta yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const sessionObj = sessions.find(
                      (s) => s.id === (log.sessionId || log.session_id)
                    );
                    const proofImage = log.proof_url || log.proofUrl;

                    return (
                      <tr
                        key={log.id || idx}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-3.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-3.5 font-bold">
                          <div className="text-slate-800 dark:text-white">{log.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {log.user_id || log.npm || "-"}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {log.institution || "-"}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                            {sessionObj?.title || currentSession?.title || "Sesi Zoom"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {sessionObj?.meetingId || "-"}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {log.time}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold">
                            {log.method}
                          </span>
                        </td>
                        {/* Kolom Bukti SS Zoom */}
                        <td className="p-3.5">
                          {proofImage ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={proofImage}
                                alt={`Bukti SS ${log.name}`}
                                onClick={() =>
                                  setPreviewProofModal({
                                    open: true,
                                    url: proofImage,
                                    participantName: log.name,
                                    time: log.time,
                                    sessionTitle: sessionObj?.title || currentSession?.title,
                                    userId: log.user_id || log.npm,
                                    institution: log.institution,
                                  })
                                }
                                className="w-10 h-8 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-110 transition-transform shrink-0"
                                title="Klik untuk memperbesar bukti SS Zoom"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewProofModal({
                                    open: true,
                                    url: proofImage,
                                    participantName: log.name,
                                    time: log.time,
                                    sessionTitle: sessionObj?.title || currentSession?.title,
                                    userId: log.user_id || log.npm,
                                    institution: log.institution,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-syarat/10 hover:bg-syarat/20 text-syarat dark:text-syarat-light text-[10px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <i className="fa-solid fa-eye text-[10px]"></i>
                                <span>Lihat SS</span>
                              </button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold inline-flex items-center gap-1">
                              <i className="fa-solid fa-circle-xmark text-[10px]"></i> Tanpa SS
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                            <i className="fa-solid fa-circle-check"></i> Hadir
                          </span>
                        </td>
                        {/* Kolom Aksi Hapus (KHUSUS WAJIB UNTUK ADMIN / MENTOR) */}
                        {isManager && (
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendanceLog(log)}
                              className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold transition-all flex items-center justify-center gap-1 mx-auto border border-red-500/20 shadow-sm hover:scale-105"
                              title="Hapus catatan presensi peserta ini dari database (Wajib Admin / Mentor)"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                              <span>Hapus</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
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
              <div className="grid grid-cols-2 gap-2">
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
                <div>
                  <label className="block font-bold mb-1">Jadwal Sesi</label>
                  <input
                    type="text"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="Kamis, 14:00 WIB"
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-2">
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
                <div>
                  <label className="block font-bold mb-1">Jadwal Sesi</label>
                  <input
                    type="text"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
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
    </DashboardLayout>
  );
}
