"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseService } from "@/lib/supabaseService";
import type { QuizSubmission, QuizAnswerRecord } from "@/types";

const PERTEMUAN_LIST_OPTIONS = [
  { key: "all", label: "Semua Kuis Pertemuan" },
  { key: "Pertemuan 1", label: "Pertemuan 1: Komunikasi & Budaya Tuli" },
  { key: "Pertemuan 2", label: "Pertemuan 2: Abjad & Angka BISINDO" },
  { key: "Pertemuan 3", label: "Pertemuan 3: Percakapan Dasar & Angka" },
  { key: "Pertemuan 4", label: "Pertemuan 4: Kosakata Sehari-hari" },
  { key: "Pertemuan 5", label: "Pertemuan 5: Struktur Kalimat" },
  { key: "Pertemuan 6", label: "Pertemuan 6: Praktik & Evaluasi Akhir" },
];

export default function JawabanKuisPage() {
  const { currentRole, currentUser, users, updateUser, showToast } = useApp();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuizSubmission | null>(null);
  const [search, setSearch] = useState("");
  const [meetingFilter, setMeetingFilter] = useState("all");
  const [passFilter, setPassFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State penilaian skor langsung (overall)
  const [manualScore, setManualScore] = useState<number | string>("");
  const [isSavingManualScore, setIsSavingManualScore] = useState(false);

  // State penilaian essai oleh mentor
  const [gradingInputs, setGradingInputs] = useState<
    Record<string, { points: number | string; feedback: string }>
  >({});
  const [savingGradeKey, setSavingGradeKey] = useState<string | null>(null);

  const isManager = currentRole === "mentor" || currentRole === "admin";

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Isi input penilaian dengan nilai yang sudah tersimpan saat submission dipilih
  useEffect(() => {
    if (selected) {
      setManualScore(selected.score ?? 0);
      const inputs: Record<string, { points: number | string; feedback: string }> = {};
      selected.answers.forEach((a) => {
        if (a.type === "essai") {
          const key = `${selected.id}_${a.quizId}`;
          inputs[key] = {
            points: a.earnedPoints !== undefined ? a.earnedPoints : (a.isGraded ? 0 : ""),
            feedback: a.mentorFeedback || "",
          };
        }
      });
      setGradingInputs((prev) => ({ ...prev, ...inputs }));
    }
  }, [selected]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await SupabaseService.getQuizSubmissions();
      setSubmissions(data || []);
    } catch {
      showToast("Gagal memuat data jawaban kuis dari database.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async (quizId: number, maxPoints: number) => {
    if (!selected) return;
    const key = `${selected.id}_${quizId}`;
    const input = gradingInputs[key];
    const rawVal = input?.points;

    if (rawVal === undefined || rawVal === "") {
      showToast(`Masukkan nilai poin terlebih dahulu (0 s.d. ${maxPoints})!`, "warning");
      return;
    }

    const pointsVal = Number(rawVal);
    if (isNaN(pointsVal) || pointsVal < 0 || pointsVal > maxPoints) {
      showToast(`Nilai poin harus berupa angka antara 0 hingga ${maxPoints}!`, "warning");
      return;
    }

    setSavingGradeKey(key);
    try {
      const res = await SupabaseService.gradeEssayAnswer(
        selected.id,
        quizId,
        pointsVal,
        input?.feedback || "",
        currentUser?.name || (currentRole === "mentor" ? "Mentor" : "Admin")
      );

      if (res.success && res.data) {
        const updatedSub: QuizSubmission = res.data;
        setSelected(updatedSub);
        setManualScore(updatedSub.score ?? 0);
        setSubmissions((prev) =>
          prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
        );

        // Sinkronkan nilai pengguna di AppContext
        if (updatedSub.userId) {
          updateUser(updatedSub.userId, { score: updatedSub.score });
        } else {
          const matchedUser = users.find(
            (u) =>
              (updatedSub.userEmail && u.email?.toLowerCase() === updatedSub.userEmail.toLowerCase()) ||
              u.name?.toLowerCase().trim() === updatedSub.userName?.toLowerCase().trim()
          );
          if (matchedUser) {
            updateUser(matchedUser.id, { score: updatedSub.score });
          }
        }

        showToast(res.message || "Nilai butir essai berhasil disimpan ke database!", "success");
      } else {
        showToast(res.message || "Gagal menyimpan nilai essai ke database.", "error");
      }
    } catch (err) {
      console.error("handleSaveGrade error:", err);
      showToast("Terjadi kesalahan saat menyimpan nilai essai ke database.", "error");
    } finally {
      setSavingGradeKey(null);
    }
  };

  const handleSaveOverallScore = async () => {
    if (!selected) return;
    const val = Number(manualScore);
    if (manualScore === "" || isNaN(val) || val < 0 || val > 100) {
      showToast("Nilai akhir kuis harus berupa angka antara 0 hingga 100!", "warning");
      return;
    }

    setIsSavingManualScore(true);
    try {
      const res = await SupabaseService.updateQuizSubmissionScore(
        selected.id,
        val,
        currentUser?.name || (currentRole === "mentor" ? "Mentor" : "Admin")
      );

      if (res.success && res.data) {
        const updatedSub: QuizSubmission = res.data;
        setSelected(updatedSub);
        setManualScore(updatedSub.score ?? 0);
        setSubmissions((prev) =>
          prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
        );

        // Sinkronkan nilai peserta di AppContext
        if (updatedSub.userId) {
          updateUser(updatedSub.userId, { score: updatedSub.score });
        } else {
          const matchedUser = users.find(
            (u) =>
              (updatedSub.userEmail && u.email?.toLowerCase() === updatedSub.userEmail.toLowerCase()) ||
              u.name?.toLowerCase().trim() === updatedSub.userName?.toLowerCase().trim()
          );
          if (matchedUser) {
            updateUser(matchedUser.id, { score: updatedSub.score });
          }
        }

        showToast(res.message || `Nilai kuis berhasil disimpan: ${val}/100!`, "success");
      } else {
        showToast(res.message || "Gagal memperbarui nilai kuis ke database.", "error");
      }
    } catch (err) {
      console.error("handleSaveOverallScore error:", err);
      showToast("Terjadi kesalahan saat memperbarui nilai kuis.", "error");
    } finally {
      setIsSavingManualScore(false);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm("Hapus riwayat jawaban ini dari database?")) return;
    setDeletingId(id);
    try {
      const ok = await SupabaseService.deleteQuizSubmission(id);
      if (ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selected?.id === id) setSelected(null);
        showToast("Riwayat jawaban dihapus dari database.", "info");
      } else {
        showToast("Gagal menghapus riwayat jawaban dari database.", "error");
      }
    } catch {
      showToast("Gagal menghapus riwayat jawaban.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllSubmissions = async () => {
    if (!confirm("Yakin ingin menghapus SEMUA riwayat jawaban kuis peserta dari database?")) return;
    setLoading(true);
    try {
      const ok = await SupabaseService.deleteQuizSubmission(undefined, undefined, true);
      if (ok) {
        setSubmissions([]);
        setSelected(null);
        showToast("Semua riwayat jawaban kuis berhasil dibersihkan dari database!", "info");
      } else {
        showToast("Gagal membersihkan riwayat jawaban.", "error");
      }
    } catch {
      showToast("Gagal membersihkan riwayat jawaban.", "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q);
    const matchPass =
      passFilter === "all" ||
      (passFilter === "ungraded" && s.hasUngradedEssays) ||
      (passFilter === "lulus" && s.passed) ||
      (passFilter === "remedial" && !s.passed);
    const matchMeeting =
      meetingFilter === "all" ||
      s.category === meetingFilter ||
      (s.quizTitle && s.quizTitle.toLowerCase().includes(meetingFilter.toLowerCase()));
    return matchSearch && matchPass && matchMeeting;
  });

  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 rounded-3xl text-center space-y-3">
          <i className="fa-solid fa-lock text-4xl text-slate-400"></i>
          <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">Akses Ditolak</h2>
          <p className="text-xs text-slate-400">Halaman ini hanya untuk Mentor dan Admin.</p>
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
            <span className="px-2.5 py-0.5 rounded-full bg-tigpad/15 text-tigpad text-[11px] font-extrabold tracking-wide uppercase inline-block mb-1">
              <i className="fa-solid fa-stopwatch-20 mr-1"></i> Evaluasi & Penilaian
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Jawaban Kuis Peserta
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Koreksi lembar jawaban peserta, input nilai soal essai, dan evaluasi hasil kuis.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {submissions.length > 0 && (
              <button
                onClick={clearAllSubmissions}
                className="px-3.5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 transition-all border border-red-500/20 shadow-sm"
                title="Hapus semua riwayat jawaban kuis peserta"
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>Bersihkan Semua</span>
              </button>
            )}
            <button
              onClick={fetchSubmissions}
              className="px-4 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <i className="fa-solid fa-arrows-rotate text-syarat"></i>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Pengerjaan", value: submissions.length, icon: "fa-users", color: "text-syarat bg-syarat/10" },
            {
              label: "Perlu Dinilai",
              value: submissions.filter((s) => s.hasUngradedEssays).length,
              icon: "fa-clock",
              color: "text-amber-500 bg-amber-500/10",
            },
            { label: "Lulus (≥70)", value: submissions.filter((s) => s.passed).length, icon: "fa-circle-check", color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Remedial (<70)", value: submissions.filter((s) => !s.passed).length, icon: "fa-circle-xmark", color: "text-rose-500 bg-rose-500/10" },
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
          {/* List submissions (kiri) */}
          <div className="lg:col-span-1 space-y-3">
            {/* Filters */}
            <div className="glass-card p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-syarat outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={meetingFilter}
                  onChange={(e) => setMeetingFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400"
                >
                  {PERTEMUAN_LIST_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={passFilter}
                  onChange={(e) => setPassFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="all">Semua Hasil ({submissions.length})</option>
                  <option value="ungraded">⏳ Perlu Dinilai ({submissions.filter((s) => s.hasUngradedEssays).length})</option>
                  <option value="lulus">Lulus (≥70)</option>
                  <option value="remedial">Remedial (&lt;70)</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-sm">
                <i className="fa-solid fa-spinner fa-spin text-xl block mb-2"></i>Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-8 rounded-2xl text-center text-slate-400 text-xs space-y-2">
                <i className="fa-solid fa-inbox text-2xl block text-slate-300"></i>
                <p>Belum ada data jawaban kuis.</p>
              </div>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`glass-card p-3.5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                    selected?.id === s.id ? "border-syarat shadow-md ring-1 ring-syarat/30" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {/* Badge Identifikasi Pertemuan & Judul Kuis */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] border border-blue-200 dark:border-blue-800">
                      <i className="fa-solid fa-bookmark text-[9px]"></i>
                      {s.category || "Pertemuan 1"}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[160px]">
                      {s.quizTitle || "Kuis Budaya Tuli & Inklusi"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {(() => {
                        const submitter = users.find(
                          (u) =>
                            (s.userId && u.id === s.userId) ||
                            (s.userEmail && u.email.toLowerCase() === s.userEmail.toLowerCase()) ||
                            u.name.toLowerCase().trim() === s.userName.toLowerCase().trim()
                        );
                        const av = submitter?.avatar_url || submitter?.avatar;
                        const ini = s.userName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();
                        return (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white font-bold text-[10px] flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                            {av ? (
                              <img
                                src={av}
                                alt={s.userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{ini}</span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.userName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.userEmail}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {s.hasUngradedEssays ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/30">
                            <i className="fa-solid fa-lock text-[10px]"></i>
                            <span>Dirahasiakan</span>
                          </span>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Perlu Koreksi
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`text-lg font-black ${s.passed ? "text-emerald-500" : "text-rose-500"}`}>
                            {s.score}
                          </div>
                          <div className={`text-[10px] font-bold ${s.passed ? "text-emerald-500" : "text-rose-500"}`}>
                            {s.passed ? "Lulus" : "Remedial"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{s.earnedPoints}/{s.totalPossiblePoints} poin</span>
                    <span>{s.submittedAt}</span>
                  </div>

                  {s.hasUngradedEssays && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg w-fit">
                      <i className="fa-solid fa-clock text-amber-500"></i>
                      <span>Perlu Penilaian Essai ({s.answers.filter((a) => a.type === "essai" && !a.isGraded).length} Soal)</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Detail submission & form penilaian mentor (kanan) */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                {/* Header detail */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const selUser = users.find(
                        (u) =>
                          (selected.userId && u.id === selected.userId) ||
                          (selected.userEmail && u.email.toLowerCase() === selected.userEmail.toLowerCase()) ||
                          u.name.toLowerCase().trim() === selected.userName.toLowerCase().trim()
                      );
                      const av = selUser?.avatar_url || selUser?.avatar;
                      const ini = selected.userName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-syarat to-tigpad text-white font-bold text-sm flex items-center justify-center shadow overflow-hidden flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60 mt-1">
                          {av ? (
                            <img
                              src={av}
                              alt={selected.userName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{ini}</span>
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1.5">
                          <i className="fa-solid fa-bookmark text-[10px]"></i>
                          <span>{selected.category || "Pertemuan 1"}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {selected.quizTitle || "Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli"}
                        </span>
                      </div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">
                        {selected.userName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selected.userEmail} · {selected.userRole}
                      </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {selected.hasUngradedEssays ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 border border-amber-500/30">
                          <i className="fa-solid fa-lock text-amber-500"></i>
                          <span>Nilai Dirahasiakan · Menunggu Koreksi ({selected.answers.filter((a) => a.type === "essai" && !a.isGraded).length} Soal Belum Dinilai)</span>
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selected.passed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                          <i className={`fa-solid ${selected.passed ? "fa-check" : "fa-xmark"} mr-1`}></i>
                          {selected.passed ? "Lulus" : "Remedial"} — Skor Akhir {selected.score}/100
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-semibold">
                        {selected.earnedPoints}/{selected.totalPossiblePoints} Poin Terkumpul · {selected.submittedAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors"
                      title="Tutup Detail"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                    <button
                      disabled={!!deletingId}
                      onClick={() => deleteSubmission(selected.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 text-sm transition-colors"
                      title="Hapus riwayat ini"
                    >
                      <i className={`fa-solid ${deletingId === selected.id ? "fa-spinner fa-spin" : "fa-trash-can"}`}></i>
                    </button>
                  </div>
                </div>

                {/* Panel Perbarui Skor Akhir / Simpan Nilai Kuis */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/90 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <i className="fa-solid fa-award text-syarat"></i>
                        <span>Nilai Akhir Kuis Peserta</span>
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          Number(manualScore) >= 70
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {Number(manualScore) >= 70 ? "STATUS: LULUS (≥70)" : "STATUS: REMEDIAL (<70)"}
                      </span>
                      {selected.hasUngradedEssays && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <i className="fa-solid fa-clock mr-1"></i>
                          Menunggu Koreksi Essai
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Masukkan nilai akhir kuis (0 - 100) dan klik <strong>Simpan Nilai</strong> untuk memperbarui skor peserta ke database dan profil.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <div className="relative flex items-center w-28 sm:w-32">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={manualScore}
                        onChange={(e) => setManualScore(e.target.value)}
                        placeholder="0 - 100"
                        className="w-full pl-3 pr-10 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-syarat shadow-sm text-center"
                      />
                      <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                        /100
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingManualScore}
                      onClick={handleSaveOverallScore}
                      className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
                    >
                      <i className={`fa-solid ${isSavingManualScore ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}></i>
                      <span>{isSavingManualScore ? "Menyimpan..." : "Simpan Nilai"}</span>
                    </button>
                  </div>
                </div>

                {/* Banner jika ada essai yang belum dinilai */}
                {selected.hasUngradedEssays && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-500 text-lg shrink-0 mt-0.5"></i>
                    <div className="space-y-0.5 flex-1">
                      <p className="font-bold">Ada Soal Essai Yang Belum Dinilai</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Silakan periksa jawaban uraian peserta di bawah ini, berikan skor poin (0 s.d. poin maksimal), lalu klik <strong>Simpan Nilai</strong>. Skor total dan status kelulusan peserta akan langsung diperbarui.
                      </p>
                    </div>
                  </div>
                )}

                {/* Answer detail per soal */}
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                  {selected.answers.map((a: QuizAnswerRecord, idx: number) => {
                    const isEssay = a.type === "essai";
                    const maxPts = a.points && a.points > 0 ? a.points : 10;
                    const gradeKey = `${selected.id}_${a.quizId}`;
                    const currentGradeInput = gradingInputs[gradeKey];

                    return (
                      <div
                        key={a.quizId}
                        className={`p-4 sm:p-5 rounded-2xl border-2 ${
                          isEssay
                            ? a.isGraded
                              ? "border-emerald-500/25 bg-emerald-500/5"
                              : "border-amber-500/30 bg-amber-500/5"
                            : a.isCorrect
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-rose-500/20 bg-rose-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-xs font-bold">
                              #{idx + 1}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                isEssay
                                  ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
                                  : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
                              }`}
                            >
                              {isEssay ? "Soal Essai" : "Pilihan Ganda"}
                            </span>
                            {a.meeting && (
                              <span className="text-[10px] text-slate-500 font-semibold">{a.meeting}</span>
                            )}
                          </div>

                          {isEssay ? (
                            a.isGraded ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <i className="fa-solid fa-check-circle"></i>
                                <span>Dinilai: <strong>{a.earnedPoints ?? 0} / {maxPts} Poin</strong></span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <i className="fa-solid fa-clock"></i>
                                <span>Belum Dinilai (Maks: {maxPts} Poin)</span>
                              </span>
                            )
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                a.isCorrect ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                              }`}
                            >
                              <i className={`fa-solid ${a.isCorrect ? "fa-check" : "fa-xmark"}`}></i>
                              {a.isCorrect ? `+${a.points} poin` : "0 poin"}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3 leading-relaxed">
                          {a.question}
                        </p>

                        {isEssay ? (
                          <div className="space-y-3 text-xs">
                            {/* Lembar Jawaban Peserta */}
                            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                <i className="fa-solid fa-align-left text-syarat"></i>
                                <span>Jawaban Uraian Peserta:</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                                {a.userAnswerText || "(tidak ada jawaban)"}
                              </p>
                            </div>

                            {/* FORM INPUT NILAI & FEEDBACK OLEH MENTOR */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-purple-500/30 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                                  <i className="fa-solid fa-pen-to-square"></i>
                                  <span>Form Penilaian Mentor</span>
                                </span>
                                {a.isGraded && (
                                  <span className="text-[10px] text-slate-400">
                                    Dinilai oleh <strong className="text-slate-600 dark:text-slate-300">{a.gradedBy || "Mentor"}</strong>
                                    {a.gradedAt ? ` · ${a.gradedAt}` : ""}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-1">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                    Beri Nilai (0 - {maxPts}):
                                  </label>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxPts}
                                      step="1"
                                      value={currentGradeInput?.points ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setGradingInputs((prev) => ({
                                          ...prev,
                                          [gradeKey]: {
                                            points: val,
                                            feedback: prev[gradeKey]?.feedback || "",
                                          },
                                        }));
                                      }}
                                      placeholder={`0 - ${maxPts}`}
                                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-syarat"
                                    />
                                    <span className="absolute right-3 text-[11px] font-bold text-slate-400 pointer-events-none">
                                      / {maxPts} Pts
                                    </span>
                                  </div>
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                    Catatan / Feedback Uraian (Opsional):
                                  </label>
                                  <input
                                    type="text"
                                    value={currentGradeInput?.feedback ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGradingInputs((prev) => ({
                                        ...prev,
                                        [gradeKey]: {
                                          points: prev[gradeKey]?.points ?? "",
                                          feedback: val,
                                        },
                                      }));
                                    }}
                                    placeholder="Contoh: Pemahaman gestur dan ekspresi sudah tepat..."
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-syarat"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  disabled={savingGradeKey === gradeKey}
                                  onClick={() => handleSaveGrade(a.quizId, maxPts)}
                                  className="btn-duotone px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                  <i
                                    className={`fa-solid ${
                                      savingGradeKey === gradeKey ? "fa-spinner fa-spin" : "fa-floppy-disk"
                                    }`}
                                  ></i>
                                  <span>{a.isGraded ? "Perbarui Nilai" : "Simpan Nilai Essai"}</span>
                                </button>
                              </div>
                            </div>

                            {a.hint && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center gap-1.5 text-[11px]">
                                <i className="fa-solid fa-lightbulb text-amber-500"></i>
                                <span><strong>Petunjuk Soal:</strong> {a.hint}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-xs">
                            {a.options.map((opt, oIdx) => {
                              const isUser = oIdx === a.userAnswerIndex;
                              const isCorrect = oIdx === a.correctAnswerIndex;
                              const labels = ["A", "B", "C", "D", "E"];
                              let cls = "flex items-center gap-2 p-2 rounded-xl border ";
                              if (isCorrect) cls += "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold";
                              else if (isUser && !isCorrect) cls += "bg-rose-500/10 border-rose-400 text-rose-700 dark:text-rose-300";
                              else cls += "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500";

                              return (
                                <div key={oIdx} className={cls}>
                                  <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                                    {labels[oIdx]}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                                      Kunci
                                    </span>
                                  )}
                                  {isUser && !isCorrect && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-500/20 px-1.5 py-0.5 rounded shrink-0">
                                      Pilihan
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Pembahasan Resmi KHUSUS Pilihan Ganda */}
                        {a.type !== "essai" && a.explanation && (
                          <p className="mt-2 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 p-2 rounded-lg leading-relaxed">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            <strong>Pembahasan:</strong> {a.explanation}
                          </p>
                        )}

                        {/* Petunjuk Soal Pilihan Ganda jika ada */}
                        {a.type !== "essai" && a.hint && (
                          <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-1.5 rounded-lg flex items-center gap-1.5">
                            <i className="fa-solid fa-lightbulb"></i>
                            <span><strong>Petunjuk:</strong> {a.hint}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs space-y-2 h-full flex flex-col items-center justify-center">
                <i className="fa-solid fa-arrow-pointer text-3xl text-slate-300"></i>
                <p>Pilih peserta di daftar kiri untuk melihat detail lembar jawaban dan melakukan penilaian essai.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
