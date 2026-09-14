"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useApp } from "@/context/AppContext";
import { SupabaseStorageService } from "@/lib/supabaseStorage";

export default function ModulPage() {
  const { currentRole, currentUser, modules, toggleModuleComplete, addModule, updateModule, deleteModule, showToast, logActivity } = useApp();

  const isManager = currentRole === "mentor" || currentRole === "admin";

  // Learning Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [playerMode, setPlayerMode] = useState<"video" | "pdf">("video");
  const [videoSource, setVideoSource] = useState<"youtube" | "html5">("youtube");

  // Upload/Edit Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMentor, setFormMentor] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");

  // Key for storing module lock statuses
  const STORAGE_KEY_MODULE_LOCKS = "kolab_module_locked_status";

  // Lock status state (true = locked 🔒, false = open 🔓) per module id
  const [lockedModules, setLockedModules] = useState<{ [key: string]: boolean }>({});

  // Sync lock status dengan cloud Supabase Storage + localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_MODULE_LOCKS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setLockedModules(parsed);
          }
        }
      } catch (e) {}
    }

    fetch("/api/module-locks")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.locks && typeof data.locks === "object") {
          setLockedModules(data.locks);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY_MODULE_LOCKS, JSON.stringify(data.locks));
            } catch (e) {}
          }
        }
      })
      .catch((err) => console.warn("[module-locks] Gagal memuat status kunci modul dari cloud:", err));
  }, []);

  // Apakah sebuah modul terkunci
  const isModuleLocked = (moduleId: number) => !!(lockedModules[String(moduleId)] ?? false);

  // Toggle single module lock (Buka / Kunci) dengan persistensi cloud Supabase
  const toggleModuleLock = (moduleId: number, moduleTitle: string) => {
    const key = String(moduleId);
    const isCurrentlyLocked = isModuleLocked(moduleId);
    const nextLocked = !isCurrentlyLocked;
    const updated = { ...lockedModules, [key]: nextLocked };

    setLockedModules(updated);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_MODULE_LOCKS, JSON.stringify(updated));
      } catch (e) {}
    }

    fetch("/api/module-locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey: key, locked: nextLocked, locks: updated }),
    }).catch((err) => console.error("[module-locks] Gagal menyimpan ke cloud:", err));

    if (nextLocked) {
      showToast(`🔒 Modul "${moduleTitle}" DIKUNCI. Peserta tidak dapat membuka materi ini.`, "warning");
      logActivity({
        title: `Mengunci Modul ${moduleTitle}`,
        description: `Modul ${moduleTitle} dikunci oleh ${currentUser.name || "Mentor"}. Peserta tidak dapat membuka materi pembelajaran.`,
        category: "modul",
        statusText: "Dikunci",
        statusBadge: "amber",
        icon: "fa-solid fa-lock text-amber-500",
      });
    } else {
      showToast(`🔓 Modul "${moduleTitle}" DIBUKA! Peserta kini dapat mempelajari materi.`, "success");
      logActivity({
        title: `Membuka Akses Modul ${moduleTitle}`,
        description: `Akses modul ${moduleTitle} telah dibuka untuk peserta oleh ${currentUser.name || "Mentor"}.`,
        category: "modul",
        statusText: "Terbuka",
        statusBadge: "green",
        icon: "fa-solid fa-lock-open text-green-500",
      });
    }
  };

  // Parser Tautan YouTube Lengkap (watch, youtu.be, shorts, live, embed, timestamps)
  const parseYouTubeVideo = (url?: string): { isYouTube: boolean; embedUrl: string; videoId?: string } => {
    if (!url) return { isYouTube: false, embedUrl: "" };
    const raw = url.trim();
    if (!raw) return { isYouTube: false, embedUrl: "" };

    const normalized = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;

    if (normalized.includes("youtube.com/embed/") || normalized.includes("youtube-nocookie.com/embed/")) {
      return { isYouTube: true, embedUrl: normalized };
    }

    const regExp = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = normalized.match(regExp);

    if (match && match[1]) {
      const videoId = match[1];
      let startSeconds = 0;
      const timeMatch = normalized.match(/[?&]t=([0-9hms]+)/i);
      if (timeMatch && timeMatch[1]) {
        const tVal = timeMatch[1];
        if (/^\d+$/.test(tVal)) {
          startSeconds = parseInt(tVal, 10);
        } else {
          const hours = (tVal.match(/(\d+)h/i) || [])[1] || "0";
          const mins = (tVal.match(/(\d+)m/i) || [])[1] || "0";
          const secs = (tVal.match(/(\d+)s/i) || [])[1] || "0";
          startSeconds = parseInt(hours, 10) * 3600 + parseInt(mins, 10) * 60 + parseInt(secs, 10);
        }
      }
      const startParam = startSeconds > 0 ? `&start=${startSeconds}` : "";
      return {
        isYouTube: true,
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${startParam}`,
      };
    }

    return { isYouTube: false, embedUrl: normalized };
  };

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Pagination states for modules
  const [modulPage, setModulPage] = useState(1);
  const [modulPageSize, setModulPageSize] = useState(6);

  const modulTotalPages = Math.max(1, Math.ceil(modules.length / modulPageSize));
  const paginatedModules = useMemo(() => {
    const start = (modulPage - 1) * modulPageSize;
    return modules.slice(start, start + modulPageSize);
  }, [modules, modulPage, modulPageSize]);

  const currentModalModule = modules[activeModuleIndex] || modules[0];

  const handleOpenPlayer = (index: number) => {
    const mod = modules[index];
    if (!isManager && mod && isModuleLocked(mod.id)) {
      showToast(`🔒 Modul "${mod.title}" sedang dikunci oleh mentor. Silakan tunggu mentor membuka akses.`, "warning");
      return;
    }
    setActiveModuleIndex(index);
    setPlayerMode("video");
    setVideoSource("youtube");
    setModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingModuleId(null);
    setFormTitle("");
    setFormMentor(currentRole === "mentor" ? (currentUser.name || "Mentor") : "Admin LMS");
    setFormDesc("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("09:00");
    setFormVideoUrl("");
    setFormPdfUrl("");
    setUploadModalOpen(true);
  };

  const handleOpenEditModal = (index: number) => {
    const mod = modules[index];
    if (!mod) return;
    setEditingModuleId(mod.id);
    setFormTitle(mod.title);
    setFormMentor(mod.mentor || (currentRole === "mentor" ? currentUser.name : "Mentor"));
    setFormDesc(mod.description || "");
    setFormDate(mod.date || "");
    setFormTime(mod.time || "");
    setFormVideoUrl(mod.videoUrl || "");
    setFormPdfUrl(mod.pdfUrl || "");
    setUploadModalOpen(true);
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    showToast("Mengunggah berkas video ke Supabase Storage...", "info");

    const cleanName = `modul_video_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await SupabaseStorageService.uploadFile("modules/videos", file, cleanName);
    setIsUploadingVideo(false);

    if (res.url) {
      setFormVideoUrl(res.url);
      if (res.isRemote) {
        showToast("✨ Berkas video berhasil diunggah ke Supabase Storage (bucket: modul)!", "success");
      } else {
        showToast("Berkas video disematkan ke modul pembelajaran.", "info");
      }
    } else {
      showToast("Gagal mengunggah video: " + (res.error || "Terjadi kesalahan."), "error");
    }
  };

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    showToast("Mengunggah dokumen PDF ke Supabase Storage (bucket: modul)...", "info");

    const cleanName = `modul_doc_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await SupabaseStorageService.uploadFile("modules/pdfs", file, cleanName);
    setIsUploadingPdf(false);

    if (res.url) {
      setFormPdfUrl(res.url);
      if (res.isRemote) {
        showToast("✨ Dokumen PDF berhasil diunggah ke Supabase Storage (bucket: modul)!", "success");
      } else {
        showToast("Dokumen PDF disematkan ke modul pembelajaran.", "info");
      }
    } else {
      showToast("Gagal mengunggah PDF: " + (res.error || "Terjadi kesalahan."), "error");
    }
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingModuleId !== null) {
      updateModule(editingModuleId, {
        title: formTitle,
        mentor: formMentor,
        description: formDesc,
        date: formDate,
        time: formTime,
        videoUrl: formVideoUrl.trim(),
        pdfUrl: formPdfUrl.trim(),
      });
    } else {
      addModule({
        title: formTitle,
        mentor: formMentor,
        description: formDesc,
        category: "BISINDO",
        duration: "30 Menit",
        date: formDate,
        time: formTime,
        videoUrl: formVideoUrl.trim(),
        pdfUrl: formPdfUrl.trim(),
      });
    }
    setUploadModalOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              id="modulTabHeader"
              className="text-2xl font-black bg-gradient-to-r from-syarat to-tigpad bg-clip-text text-transparent"
            >
              {isManager
                ? "Kelola Modul Pembelajaran BISINDO"
                : "Modul Pembelajaran BISINDO"}
            </h1>
            <p
              id="modulTabSub"
              className="text-xs text-slate-500 dark:text-slate-400"
            >
              {isManager
                ? "Pusat pengelolaan silabus, unggah video pembelajaran visual, berkas PDF, serta pengaturan modul kelas."
                : "Setiap modul dilengkapi video tutorial visual, modul baca PDF, serta rangkuman materi praktis."}
            </p>
          </div>

          {isManager && (
            <div id="mentorUploadModuleBtnContainer">
              <button
                onClick={handleOpenAddModal}
                className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-plus"></i>
                <span>+ Tambah Modul Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Total Completion Progress Banner */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <i
                id="progressBannerIcon"
                className={
                  isManager
                    ? "fa-solid fa-book-bookmark text-syarat"
                    : "fa-solid fa-chart-line text-tigpad"
                }
              ></i>
              <span id="progressBannerTitle">
                {isManager
                  ? "Status Kurikulum & Penerbitan"
                  : "Progress Kelulusan Kurikulum"}
              </span>
            </div>
            <div
              id="overallProgressText"
              className="text-lg font-black text-syarat dark:text-syarat-light"
            >
              {isManager
                ? `Total ${totalCount} Modul Aktif Diterbitkan (Mode Pengajar)`
                : `${completedCount} dari ${totalCount} Modul Selesai (${percent}%)`}
            </div>
          </div>
          <div
            id="overallProgressBarContainer"
            className="w-full sm:w-72 bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner"
          >
            <div
              id="overallProgressBar"
              className="bg-gradient-to-r from-syarat to-tigpad h-full transition-all duration-500"
              style={{ width: isManager ? "100%" : `${percent}%` }}
            ></div>
          </div>
        </div>

        {/* Manager Banner */}
        {isManager && (
          <div
            id="modulManagementBanner"
            className="p-4 rounded-2xl bg-syarat/10 border border-syarat/20 text-xs font-semibold text-syarat dark:text-syarat-light flex justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-sliders text-base"></i>
              <span>
                Panel Kelola Modul: Anda memiliki hak akses untuk menambah, mengedit konten, atau mengunggah materi baru.
              </span>
            </div>
          </div>
        )}

        {/* Modules Grid or Empty State */}
        {modules.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 sm:p-14 text-center space-y-5 border border-dashed border-slate-300 dark:border-slate-700 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-syarat/10 text-syarat flex items-center justify-center text-3xl mx-auto shadow-inner">
              <i className="fa-solid fa-book-open"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                Belum Ada Modul Pembelajaran di Database
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                {isManager
                  ? "Database kurikulum saat ini bersih tanpa data demo. Sebagai Mentor atau Admin, Anda dapat menambahkan materi modul pembelajaran pertama menggunakan tombol di bawah."
                  : "Materi dan kurikulum pembelajaran BISINDO sedang dipersiapkan oleh tim instruktur. Silakan periksa kembali beberapa saat lagi."}
              </p>
            </div>

            {isManager && (
              <button
                onClick={handleOpenAddModal}
                className="btn-duotone px-6 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-plus text-base"></i>
                <span>Tambah Modul Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div id="modulesContainer" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedModules.map((m, idx) => {
              const realIdx = (modulPage - 1) * modulPageSize + idx;
              const isCompleted = !isManager && m.completed;
              const isLocked = isModuleLocked(m.id);
              return (
                <div
                  key={m.id}
                  className={`glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between group relative overflow-hidden border-2 transition-all ${
                    isLocked
                      ? "border-rose-500/25 bg-rose-500/[0.02]"
                      : isCompleted
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {isCompleted && (
                    <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-green-500 text-white text-[10px] font-extrabold flex items-center gap-1 shadow">
                      <i className="fa-solid fa-circle-check"></i> Selesai
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <span className="px-2.5 py-0.5 rounded-md bg-syarat/10 text-syarat dark:text-syarat-light font-bold">
                        Modul {realIdx + 1}
                      </span>
                      {isLocked ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                          <i className="fa-solid fa-lock mr-1"></i>Terkunci
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                          <i className="fa-solid fa-lock-open mr-1"></i>Terbuka
                        </span>
                      )}
                      <span>
                        <i className="fa-solid fa-circle-play text-syarat"></i> Video HD
                      </span>{" "}
                      •
                      <span>
                        <i className="fa-solid fa-file-pdf text-red-500"></i> Ringkasan PDF
                      </span>
                    </div>
                    <h3
                      className={`font-extrabold text-base group-hover:text-syarat transition-colors ${
                        isCompleted ? "text-green-700 dark:text-green-400" : ""
                      }`}
                    >
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {m.description}
                    </p>

                    {(m.date || m.time) && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pt-1">
                        {m.date && (
                          <span className="flex items-center gap-1">
                            <i className="fa-regular fa-calendar text-xs text-syarat"></i> {m.date}
                          </span>
                        )}
                        {m.date && m.time && <span>•</span>}
                        {m.time && (
                          <span className="flex items-center gap-1 text-tigpad">
                            <i className="fa-regular fa-clock text-xs"></i> {m.time} WIB
                          </span>
                        )}
                      </div>
                    )}

                    {isLocked && !isManager && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2">
                        <i className="fa-solid fa-lock text-rose-500"></i>
                        <span>Modul ini sedang dikunci oleh mentor pengajar.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-500">
                      <i className="fa-solid fa-user-tie text-tigpad mr-1"></i>{" "}
                      {m.mentor || "Mentor BISINDO"}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isManager ? (
                        <>
                          <button
                            onClick={() => toggleModuleComplete(m.id)}
                            disabled={isLocked}
                            className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                              isLocked
                                ? "bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed"
                                : isCompleted
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                                : "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/30"
                            }`}
                          >
                            <i
                              className={`fa-solid ${
                                isCompleted ? "fa-arrow-rotate-left" : "fa-check"
                              }`}
                            ></i>
                            <span>{isCompleted ? "Batal" : "Tandai Selesai"}</span>
                          </button>

                          {isLocked ? (
                            <button
                              disabled
                              className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 font-bold text-xs flex items-center gap-1.5 border border-rose-500/30 cursor-not-allowed"
                            >
                              <i className="fa-solid fa-lock"></i> Modul Dikunci
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenPlayer(idx)}
                              className="btn-duotone px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                            >
                              <i className="fa-solid fa-circle-play"></i> Buka Materi
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {isLocked ? (
                            <button
                              onClick={() => toggleModuleLock(m.id, m.title)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 border border-emerald-500/30"
                              title="Buka modul ini agar peserta dapat mempelajari materi"
                            >
                              <i className="fa-solid fa-lock-open"></i> Buka Modul
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleModuleLock(m.id, m.title)}
                              className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 font-bold text-xs hover:bg-rose-500/20 transition-all flex items-center gap-1.5 border border-rose-500/30"
                              title="Kunci modul ini agar peserta tidak dapat membuka materi"
                            >
                              <i className="fa-solid fa-lock"></i> Kunci Modul
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenPlayer(idx)}
                            className="btn-duotone px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                          >
                            <i className="fa-solid fa-eye"></i> Preview
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(idx)}
                            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-all flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-pen-to-square text-syarat"></i> Edit
                          </button>

                          <button
                            onClick={() => deleteModule(m.id)}
                            className="px-3 py-2 rounded-xl bg-red-500/15 text-red-500 font-bold text-xs hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-trash-can"></i> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modul Pagination */}
        {modules.length > 0 && (
          <div className="pt-4">
            <Pagination
              currentPage={modulPage}
              totalPages={modulTotalPages}
              onPageChange={setModulPage}
              pageSize={modulPageSize}
              onPageSizeChange={(newSize) => {
                setModulPageSize(newSize);
                setModulPage(1);
              }}
              totalItems={modules.length}
            />
          </div>
        )}
      </div>

      {/* MODAL PEMBELAJARAN INTERAKTIF */}
      <Modal
        isOpen={modalOpen && !!currentModalModule}
        onClose={() => setModalOpen(false)}
        size="2xl"
        title={currentModalModule?.title}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-syarat text-white text-[10px] font-bold">
            LMS Video Player • Modul {activeModuleIndex + 1}
          </span>
        }
        headerActions={
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setPlayerMode("video")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                playerMode === "video"
                  ? "bg-syarat text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <i className="fa-solid fa-circle-play"></i>
              <span>Video Tutorial</span>
            </button>
            <button
              onClick={() => setPlayerMode("pdf")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                playerMode === "pdf"
                  ? "bg-syarat text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>Dokumen PDF</span>
            </button>
          </div>
        }
        footer={
          <div className="flex justify-between items-center w-full">
            {!isManager ? (
              <button
                type="button"
                onClick={() => toggleModuleComplete(currentModalModule.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentModalModule?.completed
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    : "bg-green-500 text-white shadow hover:bg-green-600"
                }`}
              >
                <i className="fa-solid fa-circle-check"></i>
                <span>
                  {currentModalModule?.completed
                    ? "Batalkan Status Selesai"
                    : "Tandai Modul Ini Selesai"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  handleOpenEditModal(activeModuleIndex);
                }}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 bg-syarat text-white shadow hover:bg-syarat-light"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                <span>Edit Materi Ini</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs hover:bg-slate-300"
            >
              Tutup Player
            </button>
          </div>
        }
      >
        {currentModalModule && (
          <div className="space-y-4">
            {/* MODE 1: VIDEO PLAYER */}
            {playerMode === "video" && (() => {
              const ytData = parseYouTubeVideo(currentModalModule.videoUrl);
              return (
                <div id="playerView_video" className="space-y-3">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl relative flex items-center justify-center">
                    {!currentModalModule.videoUrl ? (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                          <i className="fa-solid fa-video-slash"></i>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-200">Belum Ada Video Pembelajaran</h4>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Tautan video tutorial materi ini belum diunggah oleh instruktur.
                          </p>
                        </div>
                      </div>
                    ) : ytData.isYouTube ? (
                      <iframe
                        id="youtubeIframe"
                        className="w-full h-full border-0 rounded-2xl"
                        src={ytData.embedUrl}
                        title={currentModalModule.title || "YouTube video player"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video
                        id="html5VideoPlayer"
                        className="w-full h-full rounded-2xl"
                        controls
                        src={currentModalModule.videoUrl}
                      >
                        Browser Anda tidak mendukung pemutar video HTML5.
                      </video>
                    )}
                  </div>

                  {currentModalModule.videoUrl && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                      {ytData.isYouTube ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-[11px] inline-flex items-center gap-1.5 border border-red-500/20">
                            <i className="fa-brands fa-youtube text-red-600 text-sm"></i>
                            <span>YouTube Video Player</span>
                          </span>
                          {ytData.videoId && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ID: {ytData.videoId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-syarat/10 text-syarat dark:text-syarat-light font-bold text-[11px] inline-flex items-center gap-1.5 border border-syarat/20">
                          <i className="fa-solid fa-file-video"></i>
                          <span>Pemutar Video HTML5</span>
                        </span>
                      )}

                      {ytData.isYouTube && (
                        <a
                          href={
                            currentModalModule.videoUrl.startsWith("http")
                              ? currentModalModule.videoUrl
                              : `https://${currentModalModule.videoUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-syarat dark:text-syarat-light font-bold hover:underline flex items-center gap-1"
                        >
                          <span>Buka di YouTube</span>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MODE 2: PDF READER */}
            {playerMode === "pdf" && (
              <div id="playerView_pdf" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <i className="fa-solid fa-file-pdf text-red-500 text-base"></i>
                    <span id="pdfFileName">
                      {currentModalModule.title} - Rangkuman Materi
                    </span>
                  </div>
                  {currentModalModule.pdfUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={currentModalModule.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-all flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-up-right-from-square text-syarat"></i> Buka di Tab Baru
                      </a>
                      <a
                        href={currentModalModule.pdfUrl}
                        download
                        className="btn-duotone px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        <i className="fa-solid fa-download"></i> Unduh PDF
                      </a>
                    </div>
                  )}
                </div>

                <div className="w-full h-[520px] rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-200 dark:bg-slate-900 shadow-inner relative flex items-center justify-center">
                  {!currentModalModule.pdfUrl ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto">
                        <i className="fa-solid fa-file-circle-xmark"></i>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Belum Ada Berkas PDF Modul</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Berkas dokumen PDF untuk modul ini belum dilampirkan oleh instruktur.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <object
                      data={`${currentModalModule.pdfUrl}#toolbar=1&navpanes=1`}
                      type="application/pdf"
                      className="w-full h-full rounded-2xl"
                    >
                      <iframe
                        src={`${currentModalModule.pdfUrl}#toolbar=1&navpanes=1`}
                        className="w-full h-full rounded-2xl"
                      />
                    </object>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL: TAMBAH / EDIT MODUL */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        size="lg"
        title={
          editingModuleId !== null
            ? "Edit Modul Pembelajaran"
            : "Upload & Kelola Modul Pembelajaran Baru"
        }
        icon="fa-solid fa-folder-plus"
      >
        <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Judul Modul Pembelajaran</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Judul modul pembelajaran..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Mentor Pengampu</label>
                <input
                  type="text"
                  required
                  value={formMentor}
                  onChange={(e) => setFormMentor(e.target.value)}
                  placeholder="Nama Mentor / Tutor..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Deskripsi Ringkas Modul</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Penjelasan singkat fokus materi..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-xs font-semibold"
                ></textarea>
              </div>

              {/* Input Date & Time Modul */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    <i className="fa-regular fa-calendar text-syarat mr-1"></i> Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    <i className="fa-regular fa-clock text-tigpad mr-1"></i> Waktu / Jam
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>
              </div>

              {/* Video Tutorial Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-slate-700 dark:text-slate-200">
                    <i className="fa-solid fa-video text-syarat mr-1.5"></i> Berkas Video Pembelajaran
                  </label>
                  {formVideoUrl && (() => {
                    const parsed = parseYouTubeVideo(formVideoUrl);
                    if (parsed.isYouTube) {
                      return (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1 border border-red-500/20">
                          <i className="fa-brands fa-youtube"></i> Tautan YouTube Terdeteksi
                        </span>
                      );
                    }
                    if (formVideoUrl.includes("supabase.co")) {
                      return (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-syarat/10 text-syarat font-bold">
                          Supabase Storage
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        Video URL Eksternal
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="video/mp4, video/webm, video/quicktime"
                      onChange={handleVideoFileUpload}
                      disabled={isUploadingVideo}
                      className="file-input file-input-bordered file-input-xs w-full bg-white dark:bg-slate-900 text-[11px]"
                    />
                    {isUploadingVideo && (
                      <span className="text-[11px] text-syarat font-bold animate-pulse flex items-center gap-1 whitespace-nowrap">
                        <i className="fa-solid fa-spinner fa-spin"></i> Mengunggah...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="Tempel tautan YouTube (watch, youtu.be, shorts) atau URL berkas video (.mp4/.webm)..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-[11px] font-mono focus:ring-2 focus:ring-syarat outline-none"
                  />
                </div>
              </div>

              {/* PDF Document Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-bold text-slate-700 dark:text-slate-200">
                    <i className="fa-solid fa-file-pdf text-red-500 mr-1.5"></i> Berkas Dokumen Modul (PDF)
                  </label>
                  {formPdfUrl && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-tigpad/10 text-tigpad font-bold">
                      {formPdfUrl.includes("supabase.co") ? "Supabase Storage" : "Tautan PDF"}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfFileUpload}
                      disabled={isUploadingPdf}
                      className="file-input file-input-bordered file-input-xs w-full bg-white dark:bg-slate-900 text-[11px]"
                    />
                    {isUploadingPdf && (
                      <span className="text-[11px] text-tigpad font-bold animate-pulse flex items-center gap-1 whitespace-nowrap">
                        <i className="fa-solid fa-spinner fa-spin"></i> Mengunggah...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formPdfUrl}
                    onChange={(e) => setFormPdfUrl(e.target.value)}
                    placeholder="Atau tautan PDF: https://supabase.co/.../materi.pdf"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-[11px] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploadingVideo || isUploadingPdf}
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  Simpan & Terbitkan
                </button>
              </div>
            </form>
      </Modal>
    </DashboardLayout>
  );
}
