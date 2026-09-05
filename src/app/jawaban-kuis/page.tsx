"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import type { QuizSubmission, QuizAnswerRecord } from "@/types";

export default function JawabanKuisPage() {
  const { currentRole, showToast } = useApp();
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuizSubmission | null>(null);
  const [search, setSearch] = useState("");
  const [passFilter, setPassFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isManager = currentRole === "mentor" || currentRole === "admin";

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz-submissions");
      const data = await res.json();
      setSubmissions(data.data || []);
    } catch {
      showToast("Gagal memuat data jawaban kuis.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm("Hapus riwayat jawaban ini?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/quiz-submissions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selected?.id === id) setSelected(null);
        showToast("Riwayat jawaban dihapus.", "info");
      }
    } catch {
      showToast("Gagal menghapus riwayat jawaban.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q);
    const matchPass =
      passFilter === "all" ||
      (passFilter === "lulus" && s.passed) ||
      (passFilter === "remedial" && !s.passed);
    return matchSearch && matchPass;
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
              <i className="fa-solid fa-stopwatch-20 mr-1"></i> Evaluasi
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Jawaban Kuis Peserta
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lihat detail jawaban per soal yang dikerjakan setiap peserta.
            </p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <i className="fa-solid fa-arrows-rotate text-syarat"></i>
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Pengerjaan", value: submissions.length, icon: "fa-users", color: "text-syarat bg-syarat/10" },
            { label: "Lulus", value: submissions.filter((s) => s.passed).length, icon: "fa-circle-check", color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Remedial", value: submissions.filter((s) => !s.passed).length, icon: "fa-circle-xmark", color: "text-rose-500 bg-rose-500/10" },
            {
              label: "Rata-rata Nilai",
              value: submissions.length > 0
                ? Math.round(submissions.reduce((s, x) => s + x.score, 0) / submissions.length) + ""
                : "-",
              icon: "fa-star",
              color: "text-amber-500 bg-amber-500/10",
            },
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
          {/* List */}
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
              <select
                value={passFilter}
                onChange={(e) => setPassFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="all">Semua Hasil</option>
                <option value="lulus">Lulus (≥70)</option>
                <option value="remedial">Remedial (&lt;70)</option>
              </select>
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
                    selected?.id === s.id ? "border-syarat shadow-md" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.userName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.userEmail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-black ${s.passed ? "text-emerald-500" : "text-rose-500"}`}>
                        {s.score}
                      </div>
                      <div className={`text-[10px] font-bold ${s.passed ? "text-emerald-500" : "text-rose-500"}`}>
                        {s.passed ? "Lulus" : "Remedial"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{s.earnedPoints}/{s.totalPossiblePoints} poin</span>
                    <span>{s.submittedAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                {/* Header detail */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">{selected.userName}</h3>
                    <p className="text-xs text-slate-400">{selected.userEmail} · {selected.userRole}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selected.passed ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                        <i className={`fa-solid ${selected.passed ? "fa-check" : "fa-xmark"} mr-1`}></i>
                        {selected.passed ? "Lulus" : "Remedial"} — Nilai {selected.score}/100
                      </span>
                      <span className="text-xs text-slate-400">{selected.earnedPoints}/{selected.totalPossiblePoints} poin · {selected.submittedAt}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelected(null)}
                      className="text-slate-400 hover:text-red-500 text-sm transition-colors"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                    <button
                      disabled={!!deletingId}
                      onClick={() => deleteSubmission(selected.id)}
                      className="text-slate-400 hover:text-red-500 text-sm transition-colors"
                      title="Hapus riwayat ini"
                    >
                      <i className={`fa-solid ${deletingId === selected.id ? "fa-spinner fa-spin" : "fa-trash-can"}`}></i>
                    </button>
                  </div>
                </div>

                {/* Answer detail per soal */}
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {selected.answers.map((a: QuizAnswerRecord, idx: number) => (
                    <div
                      key={a.quizId}
                      className={`p-4 rounded-2xl border-2 ${a.isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-xs font-bold">#{idx + 1}</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            a.type === "essai"
                              ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
                              : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
                          }`}>
                            {a.type === "essai" ? "Essai" : "Pilihan Ganda"}
                          </span>
                          {a.meeting && (
                            <span className="text-[10px] text-slate-500 font-semibold">{a.meeting}</span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${a.isCorrect ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                          <i className={`fa-solid ${a.isCorrect ? "fa-check" : "fa-xmark"}`}></i>
                          {a.isCorrect ? `+${a.points} poin` : "0 poin"}
                        </span>
                      </div>

                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 leading-relaxed">{a.question}</p>

                      {a.type === "essai" || (a.options && a.options.length === 0) ? (
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              Jawaban Essai Peserta:
                            </div>
                            <p className="text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                              {a.userAnswerText || "(tidak ada jawaban)"}
                            </p>
                          </div>
                          {a.explanation && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 space-y-1">
                              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <i className="fa-solid fa-clipboard-check"></i>
                                <span>Rubrik / Model Acuan Jawaban Essai:</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {a.explanation}
                              </p>
                            </div>
                          )}
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

                      {/* Pembahasan Resmi KHUSUS Soal Pilihan Ganda (Bukan Essai agar tidak menduplikasi rubrik) */}
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
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs space-y-2 h-full flex flex-col items-center justify-center">
                <i className="fa-solid fa-arrow-pointer text-3xl text-slate-300"></i>
                <p>Pilih peserta di kiri untuk melihat detail jawaban per soal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
