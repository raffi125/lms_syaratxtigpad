"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";

export default function ZoomPage() {
  const {
    currentRole,
    currentUser,
    zoomData,
    submitAttendance,
    addZoomSession,
    updateZoomSession,
    deleteZoomSession,
    showToast,
  } = useApp();

  const isManager = currentRole === "mentor" || currentRole === "admin";

  const sessions = zoomData.sessions || [];
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [presenceInput, setPresenceInput] = useState("");
  const [isPesertaConfirmed, setIsPesertaConfirmed] = useState(false);

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

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} berhasil disalin!`, "success");
  };

  const handlePresenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    if (!presenceInput.trim()) {
      showToast("Masukkan kode presensi sesi!", "warning");
      return;
    }
    if (
      presenceInput.trim().toUpperCase() === currentSession.presenceCode.toUpperCase()
    ) {
      setIsPesertaConfirmed(true);
      submitAttendance(presenceInput);
      setPresenceInput("");
    } else {
      showToast("Kode presensi tidak sesuai!", "error");
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
            <div id="mentorZoomControlBtn" className="flex items-center gap-2">
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

                {/* Peserta Attendance Box (Konfirmasi Hadir & Batal) */}
                {!isManager && (
                  <div
                    id="pesertaPresensiBox"
                    className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3"
                  >
                    {isPesertaConfirmed ? (
                      <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-green-500 text-white flex items-center justify-center font-bold text-sm shadow">
                            <i className="fa-solid fa-circle-check"></i>
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-green-700 dark:text-green-400">
                              Kehadiran Anda Telah Terverifikasi!
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Waktu: Baru Saja • Metode: Kode Presensi Mandiri ({currentSession.presenceCode})
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsPesertaConfirmed(false);
                            showToast("Presensi dibatalkan.", "warning");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors"
                        >
                          Batalkan Presensi
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handlePresenceSubmit} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Input Kode Presensi Sesi Pertemuan:
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={presenceInput}
                            onChange={(e) => setPresenceInput(e.target.value.toUpperCase())}
                            placeholder="Masukkan kode (cth: BIS-884)..."
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-syarat"
                          />
                          <button
                            type="submit"
                            className="btn-duotone px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
                          >
                            Konfirmasi Kehadiran
                          </button>
                        </div>
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

        {/* BOTTOM SECTION: LOG ANALYTICAL DATATABLE & COUNTERS */}
        <div
          id="presensiLogSection"
          className="glass-card rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl border border-slate-200 dark:border-slate-800"
        >
          {/* Stats Header Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Total Log Presensi</div>
              <div
                className="text-2xl font-black text-slate-800 dark:text-white"
                id="statTotalStudents"
              >
                {zoomData.attendanceLogs.length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Sudah Presensi</div>
              <div
                className="text-2xl font-black text-green-600 dark:text-green-400"
                id="statAttendedStudents"
              >
                {zoomData.attendanceLogs.filter((l) => l.verified).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">Belum Presensi</div>
              <div className="text-2xl font-black text-red-500" id="statAbsentStudents">
                {zoomData.attendanceLogs.filter((l) => !l.verified).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-slate-400 font-bold text-[10px] uppercase">
                Persentase Kehadiran
              </div>
              <div className="text-2xl font-black text-syarat dark:text-syarat-light">
                {zoomData.attendanceLogs.length > 0
                  ? `${Math.round(
                      (zoomData.attendanceLogs.filter((l) => l.verified).length /
                        zoomData.attendanceLogs.length) *
                        100
                    )}%`
                  : "0%"}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Nama Peserta</th>
                  <th className="p-3.5">Instansi</th>
                  <th className="p-3.5">Waktu Presensi</th>
                  <th className="p-3.5">Metode</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {zoomData.attendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-xs font-semibold">
                      Belum ada catatan presensi peserta di database.
                    </td>
                  </tr>
                ) : (
                  zoomData.attendanceLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 font-bold">
                        <div>{log.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">User ID: {log.user_id || log.npm}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{log.institution}</td>
                      <td className="p-3.5 font-mono text-[11px]">{log.time}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[10px] font-bold">
                          {log.method}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                          <i className="fa-solid fa-circle-check"></i> Hadir
                        </span>
                      </td>
                    </tr>
                  ))
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
    </DashboardLayout>
  );
}
