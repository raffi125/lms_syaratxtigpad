"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseStorageService } from "@/lib/supabaseStorage";
import { QuizItem, QuizAnswerRecord } from "@/types";

export default function KuisPage() {
  const {
    currentRole,
    currentUser,
    quizzes,
    addQuiz,
    updateQuiz,
    deleteQuiz,
    updateProfile,
    showToast,
    logActivity,
    addNotification,
  } = useApp();

  const isManager = currentRole === "mentor" || currentRole === "admin";

  // Navigation / Quiz flow screens
  const [screen, setScreen] = useState<"list" | "start" | "active" | "completed">("list");
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
  const [finalScore, setFinalScore] = useState(currentUser.score || 0);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState<number>(100);
  const [validationError, setValidationError] = useState(false);
  const [showReviewDetail, setShowReviewDetail] = useState(false);
  const [openHints, setOpenHints] = useState<{ [key: number]: boolean }>({});
  const [essayAnswers, setEssayAnswers] = useState<{ [key: number]: string }>({});

  // Mentor / Admin Add & Edit Question Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);

  // Form Fields
  const [newType, setNewType] = useState<"pilihan_ganda" | "essai">("pilihan_ganda");
  const [newQuestion, setNewQuestion] = useState("");
  const [newMeeting, setNewMeeting] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"mudah" | "sedang" | "sulit">("sedang");
  const [newPoints, setNewPoints] = useState<number>(10);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newHint, setNewHint] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Bank Soal Filter & Search States
  const [bankFilterMeeting, setBankFilterMeeting] = useState("Semua");
  const [bankSearch, setBankSearch] = useState("");

  // Dynamic distinct meetings/topics extracted from existing quizzes
  const distinctMeetings = Array.from(
    new Set(quizzes.map((q) => (q.meeting || "Umum").trim()).filter(Boolean))
  ).sort();

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screen === "active" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [screen, timeLeft]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (qId: number, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
    setValidationError(false);
  };

  const handleEssayChange = (qId: number, text: string) => {
    setEssayAnswers((prev) => ({ ...prev, [qId]: text }));
    setValidationError(false);
  };

  const answeredCount = quizzes.filter((q) => {
    if (q.type === "essai") {
      return (essayAnswers[q.id] || "").trim().length > 0;
    }
    return answers[q.id] !== undefined;
  }).length;

  const progressPercent =
    quizzes.length > 0 ? Math.round((answeredCount / quizzes.length) * 100) : 0;

  const toggleHint = (qId: number) => {
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Submit Quiz Calculation
  const handleSubmitQuiz = async () => {
    if (quizzes.length === 0) return;

    if (answeredCount < quizzes.length) {
      setValidationError(true);
      return;
    }

    let totalPossible = 0;
    let totalEarned = 0;
    let correctCount = 0;

    quizzes.forEach((q) => {
      const qPts = q.points && q.points > 0 ? q.points : 10;
      totalPossible += qPts;
      if (q.type === "essai") {
        const text = (essayAnswers[q.id] || "").trim();
        if (text.length > 0) {
          totalEarned += qPts;
          correctCount++;
        }
      } else {
        if (answers[q.id] === q.correctAnswer) {
          totalEarned += qPts;
          correctCount++;
        }
      }
    });

    const calculated = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    setFinalScore(calculated);
    setEarnedPoints(totalEarned);
    setTotalPossiblePoints(totalPossible);
    updateProfile({ score: calculated });
    setScreen("completed");

    logActivity({
      title: "Menyelesaikan Kuis Evaluasi",
      description: `Ujian komprehensif BISINDO selesai dengan perolehan skor ${calculated}/100 (${correctCount}/${quizzes.length} soal tuntas, ${totalEarned}/${totalPossible} poin)`,
      category: "kuis",
      statusText: calculated >= 70 ? `Lulus (${calculated})` : `Remedial (${calculated})`,
      statusBadge: calculated >= 70 ? "green" : "amber",
      icon: "fa-solid fa-stopwatch-20 text-tigpad",
    });

    if (calculated >= 70) {
      addNotification({
        title: "Selamat! Kuis Evaluasi Lulus",
        message: `Anda berhasil lulus Kuis Evaluasi BISINDO dengan nilai ${calculated}/100. Nilai telah tercatat di profil.`,
        type: "kuis",
        targetRole: "all",
        linkUrl: "/kuis",
        sender: "Sistem LMS",
      });
    }

    // Save answer detail to cloud so admin/mentor can review
    const answerRecords: QuizAnswerRecord[] = quizzes.map((q) => {
      const isEssay = q.type === "essai";
      const userAnswerIdx = isEssay ? -1 : (answers[q.id] ?? -1);
      const essayText = (essayAnswers[q.id] || "").trim();
      const isCorrect = isEssay ? essayText.length > 0 : (userAnswerIdx === q.correctAnswer);
      const qPts = q.points && q.points > 0 ? q.points : 10;

      return {
        quizId: q.id,
        question: q.question,
        meeting: q.meeting,
        options: q.options || [],
        userAnswerIndex: userAnswerIdx,
        userAnswerText: isEssay ? (essayText || "(tidak dijawab)") : (userAnswerIdx >= 0 ? q.options[userAnswerIdx] : "(tidak dijawab)"),
        correctAnswerIndex: isEssay ? -1 : q.correctAnswer,
        correctAnswerText: isEssay ? (q.explanation || "Jawaban panduan essai") : (q.options[q.correctAnswer] ?? ""),
        isCorrect,
        points: qPts,
        explanation: q.explanation,
        hint: q.hint || "",
        type: q.type || "pilihan_ganda",
      };
    });

    fetch("/api/quiz-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userRole: currentRole,
        score: calculated,
        earnedPoints: totalEarned,
        totalPossiblePoints: totalPossible,
        passed: calculated >= 70,
        answers: answerRecords,
      }),
    }).catch(() => {}); // ponytail: fire-and-forget, no blocking the UX

    showToast(
      `Ujian selesai! Nilai Anda: ${calculated}/100`,
      calculated >= 70 ? "success" : "warning"
    );
  };


  // Open Create Question Modal
  const openCreateModal = () => {
    setEditingQuizId(null);
    setNewType("pilihan_ganda");
    setNewQuestion("");
    setNewMeeting("");
    setNewDifficulty("sedang");
    setNewPoints(10);
    setNewImageUrl("");
    setNewHint("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectAnswer(0);
    setNewExplanation("");
    setCreateModalOpen(true);
  };

  // Open Edit Question Modal
  const openEditModal = (q: QuizItem) => {
    setEditingQuizId(q.id);
    setNewType(q.type || "pilihan_ganda");
    setNewQuestion(q.question);
    setNewMeeting(q.meeting || "");
    setNewDifficulty(q.difficulty || "sedang");
    setNewPoints(q.points ?? 10);
    setNewImageUrl(q.imageUrl || "");
    setNewHint(q.hint || "");
    setNewOptions(q.options && q.options.length >= 2 ? [...q.options] : ["", "", "", ""]);
    setNewCorrectAnswer(q.correctAnswer ?? 0);
    setNewExplanation(q.explanation || "");
    setManageModalOpen(false);
    setCreateModalOpen(true);
  };

  // Image File Upload to Supabase Storage
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Berkas harus berupa gambar (JPG, PNG, WebP)!", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran gambar maksimal 5 MB!", "warning");
      return;
    }

    try {
      setIsUploadingImage(true);
      showToast("Mengunggah foto gestur isyarat ke Supabase Storage...", "info");
      const result = await SupabaseStorageService.uploadFile("quizzes", file);
      if (result.error) {
        showToast(`Gagal mengunggah: ${result.error}`, "warning");
      } else {
        setNewImageUrl(result.url);
        showToast("Foto ilustrasi isyarat berhasil diunggah!", "success");
      }
    } catch (err: any) {
      showToast(`Terjadi kesalahan: ${err.message || err}`, "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Dynamic Options Management
  const handleAddOption = () => {
    if (newOptions.length >= 5) {
      showToast("Maksimal 5 pilihan jawaban (A sampai E)!", "warning");
      return;
    }
    setNewOptions([...newOptions, ""]);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (newOptions.length <= 2) {
      showToast("Minimal sediakan 2 pilihan jawaban!", "warning");
      return;
    }
    const updated = newOptions.filter((_, idx) => idx !== indexToRemove);
    setNewOptions(updated);
    if (newCorrectAnswer === indexToRemove) {
      setNewCorrectAnswer(0);
    } else if (newCorrectAnswer > indexToRemove) {
      setNewCorrectAnswer(newCorrectAnswer - 1);
    }
  };

  // Save Question (Add or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      showToast("Teks pertanyaan wajib diisi!", "warning");
      return;
    }

    const isEssay = newType === "essai";
    const validOptions = isEssay ? [] : newOptions.filter((opt) => opt.trim().length > 0);
    if (!isEssay && validOptions.length < 2) {
      showToast("Minimal sediakan 2 pilihan jawaban yang tidak kosong untuk soal pilihan ganda!", "warning");
      return;
    }

    const correctIdx = isEssay ? 0 : Math.min(newCorrectAnswer, validOptions.length - 1);
    const meetingTitle = newMeeting.trim() || "Umum";

    const payload: Partial<QuizItem> = {
      question: newQuestion.trim(),
      options: validOptions,
      correctAnswer: correctIdx,
      explanation: newExplanation.trim(),
      meeting: meetingTitle,
      difficulty: newDifficulty,
      points: Number(newPoints) || 10,
      imageUrl: newImageUrl.trim(),
      hint: newHint.trim(),
      type: newType,
    };

    if (editingQuizId !== null) {
      await updateQuiz(editingQuizId, payload);
      showToast("Soal kuis berhasil diperbarui di database!", "success");
      logActivity({
        title: "Memperbarui Soal Kuis",
        description: `Soal #${editingQuizId} berhasil diperbarui: "${newQuestion.trim().slice(0, 40)}..."`,
        category: "kuis",
        statusText: "Diperbarui",
        statusBadge: "blue",
        icon: "fa-solid fa-pen-to-square text-syarat",
      });
    } else {
      await addQuiz(payload);
      showToast("Soal kuis baru berhasil ditambahkan ke database!", "success");
      logActivity({
        title: "Menambahkan Soal Kuis Baru",
        description: `Soal baru ditambahkan: "${newQuestion.trim().slice(0, 40)}..." (${meetingTitle})`,
        category: "kuis",
        statusText: "Tersimpan",
        statusBadge: "blue",
        icon: "fa-solid fa-circle-question text-syarat",
      });
      addNotification({
        title: "Bank Soal Kuis Diperbarui",
        message: `Tersedia butir soal baru (${meetingTitle}) pada Kuis Evaluasi BISINDO.`,
        type: "kuis",
        targetRole: "all",
        linkUrl: "/kuis",
        sender: currentUser.name || "Mentor / Admin",
      });
    }

    setEditingQuizId(null);
    setCreateModalOpen(false);
  };

  // Filtered Quizzes in Bank Soal Modal
  const filteredBankQuizzes = quizzes.filter((q) => {
    const matchMeeting =
      bankFilterMeeting === "Semua" ||
      (q.meeting || "Umum").toLowerCase() === bankFilterMeeting.toLowerCase();
    const matchSearch =
      bankSearch.trim() === "" ||
      q.question.toLowerCase().includes(bankSearch.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(bankSearch.toLowerCase()));
    return matchMeeting && matchSearch;
  });

  // Calculate Total Available Points
  const totalQuizPoints = quizzes.reduce((sum, q) => sum + (q.points || 10), 0);
  const totalImageQuizzes = quizzes.filter((q) => q.imageUrl && q.imageUrl.trim() !== "").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* SCREEN 1: QUIZ SELECTOR & MANAGEMENT */}
        {screen === "list" && (
          <div id="quizListScreen" className="space-y-6">
            {/* Header Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-tigpad/15 text-tigpad text-xs font-bold border border-tigpad/30 inline-block mb-1">
                  <i className="fa-solid fa-stopwatch-20"></i> Evaluasi Pembelajaran BISINDO
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Daftar Kuis Evaluasi Peserta
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Uji pemahaman isyarat, budaya Tuli, dan komunikasi praktis BISINDO dengan bank soal resmi database cloud.
                </p>
              </div>

              {isManager && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={openCreateModal}
                    className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                  >
                    <i className="fa-solid fa-plus-circle"></i>
                    <span>Tambah Soal Kuis</span>
                  </button>
                  {quizzes.length > 0 && (
                    <button
                      onClick={() => setManageModalOpen(true)}
                      className="px-4 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
                    >
                      <i className="fa-solid fa-list-check text-syarat"></i>
                      <span>Kelola Bank Soal ({quizzes.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-syarat/10 text-syarat flex items-center justify-center text-lg">
                  <i className="fa-solid fa-clipboard-question"></i>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Soal</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">
                    {quizzes.length} Butir
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Akumulasi Poin</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">
                    {totalQuizPoints} Pts
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-image"></i>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Gestur Bergambar</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">
                    {totalImageQuizzes} Soal
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-award"></i>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Nilai Anda</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">
                    {currentUser.score !== undefined ? `${currentUser.score}/100` : "Belum Ujian"}
                  </div>
                </div>
              </div>
            </div>

            {/* IF NO QUIZZES IN DATABASE: CLEAN PRODUCTION EMPTY STATE */}
            {quizzes.length === 0 ? (
              <div className="glass-card rounded-3xl p-10 sm:p-14 text-center space-y-5 border border-dashed border-slate-300 dark:border-slate-700 shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto shadow-inner">
                  <i className="fa-solid fa-clipboard-question"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                    Belum Ada Bank Soal Kuis di Database Cloud
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                    {isManager
                      ? "Database bank soal kuis saat ini masih kosong. Sebagai Mentor atau Admin, Anda dapat menambahkan butir soal lengkap dengan pilihan jawaban, foto gestur isyarat Supabase Storage, tingkat kesulitan, dan petunjuk pengerjaan."
                      : "Evaluasi kuis pembelajaran BISINDO sedang dipersiapkan oleh mentor pengajar. Silakan periksa kembali beberapa saat lagi."}
                  </p>
                </div>

                {isManager && (
                  <button
                    onClick={openCreateModal}
                    className="btn-duotone px-6 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
                  >
                    <i className="fa-solid fa-plus-circle text-base"></i>
                    <span>Buat Soal Kuis Pertama</span>
                  </button>
                )}
              </div>
            ) : (
              /* Quiz Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl space-y-4 border-2 border-transparent hover:border-syarat transition-all flex flex-col justify-between group shadow-lg">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-[10px] font-bold">
                        Komprehensif • Supabase Cloud
                      </span>
                      <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                        Aktif
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base group-hover:text-syarat transition-colors">
                      Ujian Kuis Evaluasi Komprehensif BISINDO
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Uji penguasaan kosakata isyarat, ekspresi wajah, alfabet jari, dan pemahaman etika komunikasi teman Tuli dengan kurikulum terpadu.
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                      <span>
                        <i className="fa-solid fa-clipboard-question mr-1 text-tigpad"></i>{" "}
                        {quizzes.length} Soal Ujian ({totalQuizPoints} Poin)
                      </span>
                      <span>
                        <i className="fa-regular fa-clock mr-1 text-syarat"></i> 15 Menit
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setAnswers({});
                        setValidationError(false);
                        setOpenHints({});
                        setScreen("start");
                      }}
                      className="btn-duotone w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <i className="fa-solid fa-play"></i>
                      <span>Mulai Ujian Evaluasi</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 2: PRE-QUIZ START SCREEN */}
        {screen === "start" && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 text-center max-w-2xl mx-auto border-2 border-syarat/30 animate-slide-up shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-syarat to-tigpad text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-xl">
              <i className="fa-solid fa-stopwatch-20"></i>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-tigpad/15 text-tigpad text-xs font-bold border border-tigpad/30 inline-block">
                Evaluasi Pembelajaran Resmi
              </span>
              <h1 className="text-2xl sm:text-3xl font-black">
                Ujian Kuis Evaluasi Komprehensif BISINDO
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Terdapat <strong>{quizzes.length} butir soal</strong> ({totalQuizPoints} poin maksimal) yang bersumber langsung dari bank soal resmi database cloud.
              </p>
            </div>

            {/* Instructions Box */}
            <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-3 text-slate-700 dark:text-slate-300">
              <div className="font-bold text-syarat dark:text-syarat-light flex items-center gap-2 text-sm">
                <i className="fa-solid fa-circle-info"></i> Petunjuk Pengerjaan Ujian:
              </div>
              <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-stopwatch text-tigpad mt-0.5"></i>
                  <span>
                    <strong>Timer Otomatis:</strong> Durasi pengerjaan adalah 15 Menit. Jawaban akan tersimpan otomatis saat waktu habis.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-award text-amber-500 mt-0.5"></i>
                  <span>
                    <strong>Kelulusan Sertifikat:</strong> Dapatkan minimal nilai 70 poin untuk memenuhi syarat penerbitan sertifikat resmi BISINDO.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-image text-purple-500 mt-0.5"></i>
                  <span>
                    <strong>Soal Ilustrasi Gestur:</strong> Perhatikan foto/ilustrasi bentuk tangan dan ekspresi wajah pada soal bergambar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fa-solid fa-lightbulb text-yellow-500 mt-0.5"></i>
                  <span>
                    <strong>Petunjuk Soal:</strong> Jika mentor menyertakan petunjuk, Anda dapat membuka tips soal untuk membantu mengingat materi.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScreen("list")}
                className="px-5 py-3 rounded-2xl font-bold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                ← Kembali
              </button>
              <button
                onClick={() => {
                  setTimeLeft(15 * 60);
                  setScreen("active");
                }}
                className="btn-duotone flex-1 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-play"></i>
                <span>Saya Siap • Mulai Ujian Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: ACTIVE QUIZ ENGINE */}
        {screen === "active" && (
          <div className="space-y-6 animate-slide-up quiz-no-copy">
            {/* Quiz Header Card */}
            <div className="glass-card p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-2 border-tigpad/40 shadow-xl">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-syarat text-white text-[10px] font-bold">
                    Ujian Berlangsung
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    <i className="fa-solid fa-shield-halved"></i> Mode Ujian Aktif
                  </span>
                </div>
                <h1 className="text-xl font-black mt-1">
                  Ujian Kuis Evaluasi Komprehensif BISINDO
                </h1>
              </div>

              {/* Quiz Countdown Timer */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-mono flex items-center gap-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                <i className={`fa-solid fa-stopwatch text-lg ${timeLeft < 180 ? "text-red-500 animate-bounce" : "text-tigpad animate-pulse"}`}></i>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-sans font-bold">
                    Sisa Waktu Timer
                  </div>
                  <div className={`text-lg font-black ${timeLeft < 180 ? "text-red-500" : "text-tigpad"}`}>
                    {formatTimer(timeLeft)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Questions Area */}
              <div className="lg:col-span-8 glass-card p-6 sm:p-8 rounded-3xl space-y-8 shadow-xl">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Progress Jawaban Terisi</span>
                    <span className="text-tigpad">
                      {answeredCount} / {quizzes.length} Soal ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-syarat to-tigpad h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {validationError && (
                  <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2 animate-bounce">
                    <i className="fa-solid fa-triangle-exclamation text-base"></i>
                    <span>Masih ada soal yang belum dijawab! Mohon lengkapi seluruh butir soal sebelum mengirim.</span>
                  </div>
                )}

                <div className="space-y-8">
                  {quizzes.map((q, qIndex) => {
                    const optionLabels = ["A", "B", "C", "D", "E"];
                    const questionPoints = q.points || 10;
                    const isHintOpen = openHints[q.id];

                    return (
                      <div
                        key={q.id}
                        id={`question_box_${q.id}`}
                        className="p-5 sm:p-6 rounded-2xl bg-white/95 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
                      >
                        {/* Question Metadata Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-syarat text-white text-[10px] font-bold">
                              Soal #{qIndex + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              q.type === "essai"
                                ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
                                : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
                            }`}>
                              {q.type === "essai" ? "Soal Essai" : "Pilihan Ganda"}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                              <i className="fa-solid fa-bookmark mr-1 text-tigpad"></i>
                              {q.meeting || "Umum"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                q.difficulty === "mudah"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : q.difficulty === "sulit"
                                  ? "bg-rose-500/10 text-rose-600"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              Tingkat: {q.difficulty || "sedang"}
                            </span>
                          </div>

                          <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
                            ★ {questionPoints} Poin
                          </div>
                        </div>

                        {/* Question Text */}
                        <h3 className="font-extrabold text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100">
                          {q.question}
                        </h3>

                        {/* Sign Gesture Image Illustration (if provided) */}
                        {q.imageUrl && q.imageUrl.trim() !== "" && (
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                              <i className="fa-solid fa-camera text-syarat"></i>
                              <span>Foto / Ilustrasi Gestur Isyarat:</span>
                            </div>
                            <div className="relative rounded-xl overflow-hidden max-w-sm border border-slate-200 dark:border-slate-700">
                              <img
                                src={q.imageUrl}
                                alt="Ilustrasi Gestur Isyarat Soal"
                                className="w-full max-h-64 object-contain bg-white dark:bg-slate-900"
                              />
                            </div>
                          </div>
                        )}

                        {/* Question Hint Toggle (if available) */}
                        {q.hint && q.hint.trim() !== "" && (
                          <div className="text-xs">
                            <button
                              type="button"
                              onClick={() => toggleHint(q.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors"
                            >
                              <i className="fa-solid fa-lightbulb"></i>
                              <span>{isHintOpen ? "Tutup Petunjuk Soal" : "💡 Butuh Petunjuk Soal?"}</span>
                            </button>
                            {isHintOpen && (
                              <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 animate-slide-up">
                                <strong>Petunjuk:</strong> {q.hint}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Question Input: Essay Textarea OR Multiple Choice Options */}
                        {q.type === "essai" ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <i className="fa-solid fa-pen-fancy text-purple-600"></i>
                                <span>Lembar Jawaban Essai / Uraian:</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {(essayAnswers[q.id] || "").length} Karakter
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              value={essayAnswers[q.id] || ""}
                              onChange={(e) => handleEssayChange(q.id, e.target.value)}
                              placeholder="Tuliskan uraian jawaban Anda di sini secara lengkap..."
                              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all leading-relaxed"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2.5 text-xs pt-1">
                            {q.options.map((optText, optIdx) => {
                              const isChecked = answers[q.id] === optIdx;
                              const label = optionLabels[optIdx] || String.fromCharCode(65 + optIdx);

                              return (
                                <label
                                  key={optIdx}
                                  onClick={() => handleSelectAnswer(q.id, optIdx)}
                                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-syarat/10 border-syarat text-syarat dark:text-syarat-light font-bold ring-1 ring-syarat/20 shadow-sm"
                                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-tigpad"
                                  }`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                                      isChecked
                                        ? "bg-syarat text-white"
                                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    }`}
                                  >
                                    {label}
                                  </span>
                                  <span className="flex-1 leading-relaxed">{optText}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigator Sidebar */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-card p-6 rounded-3xl space-y-4 shadow-xl sticky top-6">
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <i className="fa-solid fa-list-ol text-tigpad"></i>
                    <span>Navigasi Butir Soal</span>
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {quizzes.map((q, idx) => {
                      const isFilled = q.type === "essai"
                        ? (essayAnswers[q.id] || "").trim().length > 0
                        : answers[q.id] !== undefined;
                      return (
                        <a
                          key={q.id}
                          href={`#question_box_${q.id}`}
                          className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all border ${
                            isFilled
                              ? "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300 font-black shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-syarat"
                          }`}
                        >
                          #{idx + 1}
                        </a>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Sudah dijawab:</span>
                      <strong className="text-green-600">{answeredCount} soal</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Belum dijawab:</span>
                      <strong className="text-amber-500">{quizzes.length - answeredCount} soal</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitQuiz}
                    className="btn-duotone w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg mt-4"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Kirim Jawaban Evaluasi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: COMPLETED RESULT SCREEN & DETAILED REVIEW */}
        {screen === "completed" && (
          <div className="space-y-6 animate-slide-up max-w-3xl mx-auto">
            <div className="glass-card p-8 sm:p-10 rounded-3xl space-y-6 text-center border-2 border-green-500/40 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-xl">
                <i className="fa-solid fa-circle-check"></i>
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-bold">
                  Ujian Kuis Selesai
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">Hasil Evaluasi Kuis BISINDO</h2>
                <div className="text-5xl font-black text-syarat dark:text-syarat-light pt-2">
                  {finalScore} / 100
                </div>
                <div className="flex justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
                  <span>Poin Diperoleh: <strong>{earnedPoints} / {totalPossiblePoints} Pts</strong></span>
                  <span>•</span>
                  <span>
                    Benar: <strong>{quizzes.filter((q) => answers[q.id] === q.correctAnswer).length} / {quizzes.length} Soal</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto pt-2 leading-relaxed">
                  Status:{" "}
                  <strong className={finalScore >= 70 ? "text-green-500" : "text-amber-500"}>
                    {finalScore >= 70 ? "LULUS (≥ 70)" : "REMEDIAL (< 70)"}
                  </strong>{" "}
                  •{" "}
                  {finalScore >= 70
                    ? "Selamat! Anda memenuhi kualifikasi kompetensi BISINDO dan sertifikat kelulusan siap diterbitkan."
                    : "Belum mencapai batas nilai minimal 70. Silakan tinjau kembali materi modul dan ikuti ujian remedial."}
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setAnswers({});
                    setScreen("list");
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ← Kembali Ke Daftar Kuis
                </button>
                <button
                  onClick={() => setShowReviewDetail(!showReviewDetail)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-syarat/10 text-syarat border border-syarat/30 hover:bg-syarat/20 transition-colors flex items-center gap-2"
                >
                  <i className={`fa-solid ${showReviewDetail ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
                  <span>{showReviewDetail ? "Sembunyikan Pembahasan" : "Lihat Pembahasan Lengkap"}</span>
                </button>
                {finalScore >= 70 && (
                  <Link
                    href="/sertifikat"
                    className="btn-duotone px-6 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-lg"
                  >
                    <i className="fa-solid fa-award"></i>
                    <span>Lihat Sertifikat Saya →</span>
                  </Link>
                )}
              </div>
            </div>

            {/* DETAILED QUESTION REVIEW SECTION */}
            {showReviewDetail && (
              <div className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-syarat"></i>
                    <span>Pembahasan Soal & Kunci Jawaban</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {quizzes.length} Butir Soal Dievaluasi
                  </span>
                </div>

                <div className="space-y-4">
                  {quizzes.map((q, idx) => {
                    const isEssay = q.type === "essai";
                    const userAnswerIdx = answers[q.id];
                    const isCorrect = isEssay
                      ? (essayAnswers[q.id] || "").trim().length > 0
                      : userAnswerIdx === q.correctAnswer;
                    const optionLabels = ["A", "B", "C", "D", "E"];

                    return (
                      <div
                        key={q.id}
                        className={`glass-card p-5 sm:p-6 rounded-3xl space-y-4 border-2 ${
                          isCorrect ? "border-emerald-500/30" : "border-rose-500/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold">
                              #{idx + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isEssay
                                ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
                                : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
                            }`}>
                              {isEssay ? "Soal Essai" : "Pilihan Ganda"}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {q.meeting || "Umum"}
                            </span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                              isCorrect
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/15 text-rose-600"
                            }`}
                          >
                            <i className={`fa-solid ${isCorrect ? "fa-check" : "fa-xmark"}`}></i>
                            {isEssay
                              ? (isCorrect ? "Essai Terjawab" : "Belum Dijawab")
                              : (isCorrect ? "Jawaban Benar" : "Jawaban Salah")}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {q.question}
                        </h4>

                        {q.imageUrl && (
                          <div className="max-w-xs rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                            <img src={q.imageUrl} alt="Ilustrasi" className="w-full h-auto" />
                          </div>
                        )}

                        {isEssay ? (
                          <div className="space-y-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                              <div className="font-bold text-slate-500 uppercase text-[10px]">
                                Lembar Jawaban Essai Anda:
                              </div>
                              <p className="font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                                {essayAnswers[q.id]?.trim() || "(tidak ada jawaban)"}
                              </p>
                            </div>
                            {q.explanation && (
                              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                                <div className="font-bold text-emerald-700 dark:text-emerald-300 uppercase text-[10px] flex items-center gap-1.5">
                                  <i className="fa-solid fa-clipboard-check"></i>
                                  <span>Panduan Kunci / Rubrik Acuan Jawaban:</span>
                                </div>
                                <p className="text-emerald-900 dark:text-emerald-100 leading-relaxed whitespace-pre-wrap">
                                  {q.explanation}
                                </p>
                              </div>
                            )}
                            {q.hint && (
                              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                <i className="fa-solid fa-lightbulb text-amber-500"></i>
                                <span><strong>Petunjuk Soal:</strong> {q.hint}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {q.options.map((opt, oIdx) => {
                              const isUserChoice = userAnswerIdx === oIdx;
                              const isThisCorrect = q.correctAnswer === oIdx;
                              const label = optionLabels[oIdx] || String.fromCharCode(65 + oIdx);

                              let itemClass = "p-3 rounded-xl border flex items-center gap-2 ";
                              if (isThisCorrect) {
                                itemClass += "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold";
                              } else if (isUserChoice && !isThisCorrect) {
                                itemClass += "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300";
                              } else {
                                itemClass += "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
                              }

                              return (
                                <div key={oIdx} className={itemClass}>
                                  <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                                    {label}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {isThisCorrect && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <i className="fa-solid fa-check"></i> Kunci Benar
                                    </span>
                                  )}
                                  {isUserChoice && !isThisCorrect && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <i className="fa-solid fa-xmark"></i> Pilihan Anda
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Pembahasan Resmi KHUSUS Soal Pilihan Ganda (Bukan Essai agar tidak duplikat) */}
                        {!isEssay && q.explanation && (
                          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-xs space-y-1">
                            <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                              <i className="fa-solid fa-circle-info"></i> Pembahasan Resmi:
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MENTOR / ADMIN MODAL: CREATE / EDIT QUIZ QUESTION */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setCreateModalOpen(false)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-2xl w-full relative z-10 animate-slide-up space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-tigpad flex items-center gap-2">
                  <i className={editingQuizId ? "fa-solid fa-pen-to-square" : "fa-solid fa-plus-circle"}></i>
                  <span>{editingQuizId ? `Edit Soal Kuis (ID #${editingQuizId})` : "Tambah Butir Soal Kuis Baru"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {editingQuizId
                    ? "Perbarui detail butir soal, pilihan jawaban, petunjuk, atau gambar gestur isyarat."
                    : "Lengkapi data klasifikasi, opsi jawaban, dan media isyarat untuk bank soal Supabase cloud."}
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              {/* SECTION 1: METADATA & KLASIFIKASI SOAL */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <i className="fa-solid fa-layer-group text-syarat"></i>
                  <span>Klasifikasi & Bobot Nilai</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bentuk / Tipe Soal */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">
                      Bentuk / Tipe Soal
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewType("pilihan_ganda")}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                          newType === "pilihan_ganda"
                            ? "bg-syarat text-white border-syarat shadow"
                            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-syarat"
                        }`}
                      >
                        <i className="fa-solid fa-list-check"></i>
                        <span>Pilihan Ganda</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType("essai")}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                          newType === "essai"
                            ? "bg-purple-600 text-white border-purple-700 shadow"
                            : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-purple-500"
                        }`}
                      >
                        <i className="fa-solid fa-pen-fancy"></i>
                        <span>Soal Essai / Uraian</span>
                      </button>
                    </div>
                  </div>

                  {/* Judul / Topik Pertemuan Kuis (Input Manual seperti Modul) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Judul / Topik Pertemuan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newMeeting}
                      onChange={(e) => setNewMeeting(e.target.value)}
                      placeholder="Contoh: Modul 1 - Kosakata Dasar BISINDO..."
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-tigpad outline-none transition"
                    />
                  </div>

                  {/* Bobot Poin Soal */}
                  <div>
                    <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">
                      Bobot Nilai (Poin)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={newPoints}
                        onChange={(e) => setNewPoints(Math.max(1, parseInt(e.target.value) || 10))}
                        className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-center text-xs"
                      />
                      <div className="flex gap-1">
                        {[5, 10, 15, 20].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setNewPoints(pt)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                              newPoints === pt
                                ? "bg-syarat text-white border-syarat"
                                : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            +{pt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tingkat Kesulitan */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold mb-1 text-slate-600 dark:text-slate-300">
                      Tingkat Kesulitan
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["mudah", "sedang", "sulit"] as const).map((diff) => {
                        const isSelected = newDifficulty === diff;
                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setNewDifficulty(diff)}
                            className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                              isSelected
                                ? diff === "mudah"
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow"
                                  : diff === "sulit"
                                  ? "bg-rose-500 text-white border-rose-600 shadow"
                                  : "bg-amber-500 text-white border-amber-600 shadow"
                                : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {diff}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TEKS PERTANYAAN & PETUNJUK */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Teks Pertanyaan / Soal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Contoh: Manakah bentuk isyarat tangan yang tepat untuk melambangkan kata 'Terima Kasih' dalam BISINDO?"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold leading-relaxed"
                  />
                </div>

                {/* Petunjuk Soal (Hint) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-600 dark:text-slate-300 text-xs">
                      💡 Petunjuk Pengerjaan / Hint (Opsional)
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Bantuan untuk peserta saat ujian
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder="Contoh: Perhatikan orientasi telapak tangan dan posisi di dekat dada..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Petunjuk ini hanya muncul jika peserta menekan tombol &ldquo;💡 Butuh Petunjuk Soal?&rdquo; saat mengerjakan kuis.
                  </p>
                </div>
              </div>

              {/* SECTION 3: UPLOAD FOTO / ILUSTRASI GESTUR (SUPABASE STORAGE) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <i className="fa-solid fa-camera text-purple-500"></i>
                    <span>Foto / Ilustrasi Gestur Isyarat (Opsional)</span>
                  </div>
                  {newImageUrl && (
                    <button
                      type="button"
                      onClick={() => setNewImageUrl("")}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* File Upload Trigger */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Unggah berkas foto langsung ke Supabase Storage:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageFileChange}
                      className="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-syarat/10 file:text-syarat hover:file:bg-syarat/20 cursor-pointer"
                    />
                    {isUploadingImage && (
                      <p className="text-[10px] text-tigpad font-bold mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Mengunggah ke Supabase Storage (kolab/quizzes)...</span>
                      </p>
                    )}
                  </div>

                  {/* Or Direct Image URL Input */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Atau input tautan URL gambar eksternal:
                    </label>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                {/* Image Preview Box */}
                {newImageUrl && (
                  <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <img
                      src={newImageUrl}
                      alt="Preview Ilustrasi Soal"
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                        Preview Terlampir
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{newImageUrl}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: PILIHAN JAWABAN DINAMIS (PILIHAN GANDA) ATAU RUBRIK ESSAI */}
              {newType === "essai" ? (
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                  <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 text-xs">
                    <i className="fa-solid fa-clipboard-check"></i>
                    <span>Kunci / Rubrik Acuan Jawaban Essai (Untuk Penilaian)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tuliskan standar atau poin-poin kunci jawaban yang benar. <strong className="text-purple-700 dark:text-purple-300">Catatan:</strong> Kunci ini dirahasiakan dari peserta selama ujian dan hanya ditampilkan pada laporan penilaian / review mentor setelah ujian dikumpulkan.
                  </p>
                  <textarea
                    rows={3}
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Contoh acuan: Peserta wajib menguraikan 3 aspek gestur BISINDO, yaitu bentuk tangan (handshape), lokasi (location), dan orientasi telapak tangan..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold leading-relaxed"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <i className="fa-solid fa-list-check text-green-500"></i>
                      <span>Pilihan Jawaban (Klik huruf untuk kunci jawaban benar)</span>
                    </label>
                    {newOptions.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs font-bold text-syarat hover:underline flex items-center gap-1"
                      >
                        <i className="fa-solid fa-plus"></i> Tambah Opsi
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {newOptions.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx);
                      const isChecked = newCorrectAnswer === idx;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            isChecked
                              ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/30"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setNewCorrectAnswer(idx)}
                            title="Klik untuk menjadikan opsi ini kunci jawaban benar"
                            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-green-600 text-white shadow"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                          <input
                            type="text"
                            required={idx < 2}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[idx] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={`Teks pilihan jawaban ${label}...`}
                            className="flex-1 bg-transparent border-none outline-none text-xs font-medium"
                          />
                          {isChecked && (
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-300 px-2 py-0.5 rounded-md bg-green-500/20">
                              ✓ Kunci Benar
                            </span>
                          )}
                          {newOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Hapus opsi ini"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 5: PEMBAHASAN / PENJELASAN SOLUSI (KHUSUS PILIHAN GANDA) */}
              {newType === "pilihan_ganda" && (
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                    Pembahasan / Penjelasan Jawaban (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Tuliskan pembahasan lengkap mengapa jawaban ini benar, etika komunikasi terkait, atau catatan isyarat..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs leading-relaxed"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="btn-duotone px-6 py-2.5 rounded-xl text-xs font-bold shadow flex items-center gap-2"
                >
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>{editingQuizId ? "Perbarui Soal di Database" : "Simpan Soal Ke Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENTOR / ADMIN MODAL: MANAGE QUESTION BANK */}
      {manageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setManageModalOpen(false)}
          ></div>
          <div className="glass-card p-6 rounded-3xl max-w-3xl w-full relative z-10 animate-slide-up space-y-4 max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-syarat dark:text-syarat-light flex items-center gap-2">
                  <i className="fa-solid fa-list-check"></i> Kelola Bank Soal Kuis ({quizzes.length} Soal)
                </h3>
                <p className="text-xs text-slate-500">
                  Data soal bersumber langsung dari tabel Supabase cloud resmi. Anda dapat mengedit atau menghapus butir soal.
                </p>
              </div>
              <button
                onClick={() => setManageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="flex-1 relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Cari pertanyaan, opsi, atau topik..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <select
                value={bankFilterMeeting}
                onChange={(e) => setBankFilterMeeting(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="Semua">Semua Pertemuan / Topik</option>
                {distinctMeetings.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions List */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {filteredBankQuizzes.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <i className="fa-solid fa-folder-open text-3xl mb-2"></i>
                  <p>Tidak ada butir soal yang sesuai dengan kriteria filter.</p>
                </div>
              ) : (
                filteredBankQuizzes.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-syarat transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat font-bold text-[10px]">
                          Soal #{idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                          q.type === "essai"
                            ? "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800"
                            : "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800"
                        }`}>
                          {q.type === "essai" ? "Essai" : "Pilihan Ganda"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          {q.meeting || "Umum"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                            q.difficulty === "mudah"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : q.difficulty === "sulit"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {q.difficulty || "sedang"}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          ★ {q.points || 10} Poin
                        </span>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(q)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-syarat/10 text-syarat hover:bg-syarat/20 transition-colors flex items-center gap-1"
                          title="Edit soal ini"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus soal #${idx + 1} ("${q.question.slice(0, 30)}...") dari database Supabase?`)) {
                              deleteQuiz(q.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Hapus soal ini"
                        >
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </div>

                    <div className="font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                      {q.question}
                    </div>

                    {q.imageUrl && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <img
                          src={q.imageUrl}
                          alt="Thumbnail"
                          className="w-12 h-12 object-cover rounded-lg border"
                        />
                        <div className="text-[10px] text-slate-500 truncate flex-1">
                          Foto Gestur: {q.imageUrl}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 text-[11px]">
                      {q.options.map((opt, oIdx) => {
                        const isKunci = q.correctAnswer === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                              isKunci
                                ? "bg-green-500/15 text-green-700 dark:text-green-300 font-bold border border-green-500/30"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <span className="w-5 text-center font-bold">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isKunci && <span className="text-[10px]">✓ Kunci Jawaban</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.type === "essai" ? (
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                        <div className="font-bold text-purple-700 dark:text-purple-300 text-[10px] uppercase flex items-center gap-1.5">
                          <i className="fa-solid fa-clipboard-check"></i>
                          <span>Kunci / Rubrik Acuan Jawaban Essai:</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                          {q.explanation || "(Belum ada rubrik acuan)"}
                        </p>
                      </div>
                    ) : (
                      q.explanation && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <strong className="text-slate-700 dark:text-slate-300">Pembahasan:</strong>{" "}
                          {q.explanation}
                        </div>
                      )
                    )}

                    {q.hint && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 flex items-center gap-2">
                        <i className="fa-solid fa-lightbulb text-amber-500"></i>
                        <span><strong>Petunjuk Soal (Hint):</strong> {q.hint}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setManageModalOpen(false);
                  openCreateModal();
                }}
                className="btn-duotone px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Tambah Soal Baru</span>
              </button>
              <button
                onClick={() => setManageModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
