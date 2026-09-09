"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { SupabaseStorageService } from "@/lib/supabaseStorage";

export default function ModulPage() {
  const { currentRole, currentUser, modules, toggleModuleComplete, addModule, updateModule, deleteModule, showToast } = useApp();

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

  const getEmbedUrl = (url?: string) => {
    if (!url) return "";
    if (url.includes("youtube.com/embed/")) return url;
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    return url;
  };

  const completedCount = modules.filter((m) => m.completed).length;
  const totalCount = modules.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentModalModule = modules[activeModuleIndex] || modules[0];

  const handleOpenPlayer = (index: number) => {
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
            {modules.map((m, idx) => {
              const isCompleted = !isManager && m.completed;
              return (
                <div
                  key={m.id}
                  className={`glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between group relative overflow-hidden border-2 transition-all ${
                    isCompleted
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
                        Modul {idx + 1}
                      </span>
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
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl w-fit">
                        {m.date && (
                          <span className="flex items-center gap-1 text-syarat dark:text-syarat-light">
                            <i className="fa-regular fa-calendar text-xs"></i> {m.date}
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
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-500">
                      <i className="fa-solid fa-user-tie text-tigpad mr-1"></i>{" "}
                      {m.mentor || "Mentor BISINDO"}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isManager ? (
                        <>
                          <button
                            onClick={() => toggleModuleComplete(m.id)}
                            className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                              isCompleted
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

                          <button
                            onClick={() => handleOpenPlayer(idx)}
                            className="btn-duotone px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                          >
                            <i className="fa-solid fa-circle-play"></i> Buka Materi
                          </button>
                        </>
                      ) : (
                        <>
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
      </div>

      {/* MODAL PEMBELAJARAN INTERAKTIF */}
      {modalOpen && currentModalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          ></div>

          <div className="glass-card p-6 rounded-3xl max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto relative z-10 animate-slide-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-syarat text-white text-[10px] font-bold">
                    LMS Video Player
                  </span>
                  <span
                    id="playerModuleIdBadge"
                    className="text-xs text-slate-500 font-semibold"
                  >
                    • Modul {activeModuleIndex + 1}
                  </span>
                </div>
                <h3
                  id="playerModuleTitle"
                  className="font-extrabold text-lg tracking-tight mt-1"
                >
                  {currentModalModule.title}
                </h3>
              </div>

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
            </div>

            {/* MODE 1: VIDEO PLAYER */}
            {playerMode === "video" && (
              <div id="playerView_video" className="space-y-4">
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
                  ) : currentModalModule.videoUrl.includes("youtube.com") || currentModalModule.videoUrl.includes("youtu.be") ? (
                    <iframe
                      id="youtubeIframe"
                      className="w-full h-full border-0 rounded-2xl"
                      src={getEmbedUrl(currentModalModule.videoUrl)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
              </div>
            )}

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

            {/* Modal Footer Actions */}
            <div className="modal-action border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center">
              {!isManager ? (
                <button
                  type="button"
                  onClick={() => toggleModuleComplete(currentModalModule.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    currentModalModule.completed
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      : "bg-green-500 text-white shadow hover:bg-green-600"
                  }`}
                >
                  <i className="fa-solid fa-circle-check"></i>
                  <span>
                    {currentModalModule.completed
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
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT MODUL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setUploadModalOpen(false)}
          ></div>

          <div className="glass-card p-6 sm:p-7 rounded-3xl max-w-lg w-full relative z-10 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-tigpad flex items-center gap-2">
                <i className="fa-solid fa-folder-plus"></i>{" "}
                {editingModuleId !== null
                  ? "Edit Modul Pembelajaran"
                  : "Upload & Kelola Modul Pembelajaran Baru"}
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 text-slate-500 hover:text-red-500"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4 mt-4 text-xs">
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
                  {formVideoUrl && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-syarat/10 text-syarat font-bold">
                      {formVideoUrl.includes("supabase.co") ? "Supabase Storage" : "Tautan Eksternal"}
                    </span>
                  )}
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
                    placeholder="Atau tautan: https://youtube.com/... / https://supabase.co/..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border text-[11px] font-mono"
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
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
