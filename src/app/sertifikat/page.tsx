"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";
import { CertificateItem } from "@/types";
import { SupabaseStorageService } from "@/lib/supabaseStorage";

export default function SertifikatPage() {
  const { currentRole, currentUser, certificates, users, issueCertificate, revokeCertificate, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Daftar peserta untuk kelola sertifikat: gabungkan data seluruh users peserta dengan riwayat certificates
  const pesertaList = users.filter((u) => u.role === "peserta");
  const candidateUsers = pesertaList.length > 0 ? pesertaList : users.filter((u) => u.role !== "admin");

  const activeParticipants: CertificateItem[] = candidateUsers.map((u) => {
    const cert = certificates.find(
      (c) =>
        c.id === u.id ||
        c.name.toLowerCase() === u.name.toLowerCase() ||
        (c.user_id && (c.user_id === u.user_id || c.user_id === u.npm))
    );
    const uid = u.user_id || u.npm || "";
    if (cert) {
      return {
        ...cert,
        name: u.name,
        user_id: uid,
        npm: uid,
        score: u.score ?? cert.score,
        progress: u.progress ?? cert.progress,
      };
    }
    return {
      id: u.id,
      name: u.name,
      user_id: uid,
      npm: uid,
      score: u.score ?? 0,
      progress: u.progress ?? 0,
      certIssued: false, // Hanya diterbitkan manual via upload
      certFileName: "",
      issueDate: "-",
    };
  });

  // Tambahkan sertifikat tambahan jika ada yang tidak ada di daftar user
  certificates.forEach((c) => {
    if (!activeParticipants.some((ap) => ap.id === c.id || ap.name.toLowerCase() === c.name.toLowerCase())) {
      activeParticipants.push(c);
    }
  });

  // Quick Direct Upload Form States
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [directTargetId, setDirectTargetId] = useState<number>(activeParticipants[0]?.id || 1);

  useEffect(() => {
    if (activeParticipants.length > 0 && !activeParticipants.some((c) => c.id === directTargetId)) {
      setDirectTargetId(activeParticipants[0].id);
    }
  }, [activeParticipants, directTargetId]);

  // Modal States
  const [uploadModalUser, setUploadModalUser] = useState<any>(null);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [previewUser, setPreviewUser] = useState<any>(null);

  // Peserta Data: Pastikan user hanya melihat data sertifikat miliknya sendiri
  const userCert =
    activeParticipants.find(
      (c) =>
        c.id === currentUser.id ||
        (c.user_id && (c.user_id === currentUser.user_id || c.user_id === currentUser.npm)) ||
        c.name.toLowerCase() === currentUser.name.toLowerCase()
    ) || {
      id: currentUser.id,
      name: currentUser.name,
      user_id: currentUser.user_id || currentUser.npm || "",
      npm: currentUser.user_id || currentUser.npm || "",
      score: currentUser.score,
      progress: currentUser.progress,
      certIssued: false,
      certFileName: "",
      issueDate: "-",
    };
  const isPesertaMode = currentRole === "peserta";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast("Masukkan nama atau User ID yang ingin dicari.", "warning");
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const found =
      activeParticipants.find(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.user_id || c.npm || "").toLowerCase().includes(q)
      ) ||
      users.find(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.user_id || u.npm || "").toLowerCase().includes(q)
      );

    if (found) {
      const asCert: CertificateItem = "certIssued" in found
        ? (found as CertificateItem)
        : {
            id: found.id,
            name: found.name,
            user_id: found.user_id || found.npm || "",
            npm: found.user_id || found.npm || "",
            score: found.score ?? 0,
            progress: found.progress ?? 0,
            certIssued: false,
            certFileName: "",
            issueDate: "-",
          };
      setSearchResult(asCert);
    } else {
      setSearchResult(null);
    }
    setHasSearched(true);
  };

  const [isUploadingCert, setIsUploadingCert] = useState(false);

  const handleDirectUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeParticipants.length === 0) {
      showToast("Belum ada data peserta di database untuk diterbitkan sertifikat!", "warning");
      return;
    }
    if (!directFile) {
      showToast("Pilih file berkas sertifikat terlebih dahulu!", "warning");
      return;
    }

    setIsUploadingCert(true);
    showToast("Mengunggah berkas sertifikat ke Supabase Storage...", "info");

    const cleanName = `cert_${directTargetId}_${Date.now()}_${directFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await SupabaseStorageService.uploadFile("certificates", directFile, cleanName);
    setIsUploadingCert(false);

    issueCertificate(directTargetId, directFile.name, res.url);
    setDirectFile(null);

    if (res.isRemote) {
      showToast(`✨ Berkas sertifikat "${directFile.name}" berhasil diunggah ke Supabase Storage (bucket: serti)!`, "success");
    } else {
      showToast(`Sertifikat "${directFile.name}" diterbitkan ke cloud database.`, "info");
    }
  };

  const handleModalUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalUser) return;
    if (!modalFile) {
      showToast("Pilih berkas file sertifikat terlebih dahulu!", "warning");
      return;
    }

    setIsUploadingCert(true);
    showToast("Mengunggah berkas sertifikat ke Supabase Storage (bucket: serti)...", "info");

    const cleanName = `cert_${uploadModalUser.id}_${Date.now()}_${modalFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const res = await SupabaseStorageService.uploadFile("certificates", modalFile, cleanName);
    setIsUploadingCert(false);

    issueCertificate(uploadModalUser.id, modalFile.name, res.url);
    setUploadModalUser(null);
    setModalFile(null);

    if (res.isRemote) {
      showToast(`✨ Berkas sertifikat "${modalFile.name}" berhasil diunggah ke Supabase Storage (bucket: serti)!`, "success");
    } else {
      showToast(`Sertifikat "${modalFile.name}" diterbitkan ke cloud database.`, "info");
    }
  };

  const handleDownload = (cert: any) => {
    if (cert?.certFileUrl) {
      const a = document.createElement("a");
      a.href = cert.certFileUrl;
      a.download = cert.certFileName || "Sertifikat_Resmi.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Mengunduh berkas "${cert.certFileName || "Sertifikat"}"`, "success");
    } else {
      showToast(
        `Berkas fisik "${cert?.certFileName || "Sertifikat"}" belum diunggah ke sesi browser. Hubungi mentor.`,
        "warning"
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
              <i className="fa-solid fa-award text-amber-500 text-xl"></i>
              <span>
                {isPesertaMode ? "Sertifikat Kelulusan Resmi BISINDO" : "Kelola Penerbitan Sertifikat"}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isPesertaMode
                ? "Bukti sah pencapaian kompetensi dan kelulusan evaluasi program pelatihan BISINDO 2026."
                : "Upload berkas sertifikat browser, terbitkan untuk peserta, atau batalkan penerbitan sertifikat."}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-syarat/10 text-syarat dark:text-syarat-light text-xs font-bold capitalize">
            Akses: {currentRole}
          </span>
        </div>

        {/* PUBLIC VERIFICATION SEARCH BOX */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border-2 border-amber-500/30 shadow-lg">
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
              <i className="fa-solid fa-shield-check text-amber-500"></i> Cek Status & Verifikasi Sertifikat Peserta
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan nama atau User ID untuk mengecek keabsahan sertifikat resmi.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i className="fa-solid fa-user-check absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan Nama Lengkap atau User ID..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-amber-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="btn-duotone px-6 py-3.5 rounded-2xl text-xs font-bold shadow-xl flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
              <span>Cek Status Sertifikat</span>
            </button>
          </form>

          {/* Search Result Box */}
          {hasSearched && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 animate-slide-up">
              {searchResult ? (
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    searchResult.certIssued
                      ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="font-extrabold text-sm flex items-center gap-2">
                      <i
                        className={`fa-solid ${
                          searchResult.certIssued ? "fa-circle-check text-green-500" : "fa-clock text-amber-500"
                        }`}
                      ></i>
                      <span>{searchResult.name}</span>
                      <span className="text-[10px] font-mono opacity-75">User ID: {searchResult.user_id || searchResult.npm}</span>
                    </div>
                    <div>
                      Status:{" "}
                      <strong>
                        {searchResult.certIssued
                          ? `Sertifikat Resmi Diterbitkan (${searchResult.issueDate})`
                          : "Sertifikat Belum Diterbitkan (Menunggu Evaluasi)"}
                      </strong>
                    </div>
                    <div className="text-[10px] opacity-80">
                      Nilai Kuis: {searchResult.score}/100 • Progress: {searchResult.progress}%
                    </div>
                  </div>

                  {searchResult.certIssued && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewUser(searchResult)}
                        className="btn-duotone px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-eye"></i>
                        <span>Lihat Berkas</span>
                      </button>
                      <button
                        onClick={() => handleDownload(searchResult)}
                        className="px-3 py-2 rounded-xl text-xs font-bold glass-card hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>Unduh</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border text-xs text-slate-500 text-center">
                  Data peserta tidak ditemukan dalam sistem pelatihan.
                </div>
              )}
            </div>
          )}
        </div>

        {/* PESERTA VIEW FOR CERTIFICATE */}
        {isPesertaMode && (
          <div className="space-y-6">
            {userCert?.certIssued ? (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 font-bold text-xs border border-green-500/30 flex items-center gap-2">
                    <i className="fa-solid fa-file-circle-check text-green-500"></i>
                    <span>Berkas Sertifikat Resmi Telah Diterbitkan</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(userCert)}
                      className="btn-duotone px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
                    >
                      <i className="fa-solid fa-download"></i>
                      <span>Unduh Berkas Asli</span>
                    </button>
                    {userCert.certFileUrl && (
                      <button
                        onClick={() => setPreviewUser(userCert)}
                        className="px-4 py-2 rounded-xl text-xs font-bold glass-card hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-expand"></i>
                        <span>Pratinjau Layar Penuh</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Uploaded Certificate Document Card (Hasil Upload Manual) */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-syarat/30 shadow-2xl space-y-6">
                  {/* Header & Meta Info */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-syarat/20 to-tigpad/20 border border-syarat/30 text-syarat flex items-center justify-center text-2xl flex-shrink-0">
                        <i className="fa-solid fa-file-certificate"></i>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                            Berkas Sertifikat Resmi Kelulusan BISINDO
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-syarat/10 text-syarat text-[10px] font-bold">
                            Unggahan Mentor
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Dokumen resmi bukti kompetensi dan kelulusan pelatihan Bahasa Isyarat Indonesia (BISINDO) 2026.
                        </p>
                      </div>
                    </div>

                    <div className="text-left md:text-right text-xs space-y-0.5">
                      <div className="text-slate-400 font-mono text-[11px]">
                        Tanggal Terbit: <strong className="text-slate-700 dark:text-slate-200">{userCert.issueDate}</strong>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        Nama Berkas: <strong className="text-syarat dark:text-syarat-light">{userCert.certFileName || "Berkas_Sertifikat.pdf"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Participant & File Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nama Peserta</div>
                      <div className="font-extrabold text-sm text-slate-800 dark:text-white mt-0.5">{userCert.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">User ID: {userCert.user_id || userCert.npm}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Evaluasi Kelulusan</div>
                      <div className="font-extrabold text-sm text-green-600 dark:text-green-400 mt-0.5">Dinyatakan LULUS</div>
                      <div className="text-[10px] text-slate-400">Nilai Kuis: {userCert.score}/100 • {userCert.progress}%</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Verifikasi Berkas</div>
                      <div className="font-extrabold text-sm text-syarat dark:text-syarat-light mt-0.5">Sah & Terverifikasi</div>
                      <div className="text-[10px] text-slate-400">Penyelenggara: KOLAB SYARAT X TIGPAD</div>
                    </div>
                  </div>

                  {/* Real Document Preview */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-file-lines text-syarat"></i>
                        <span>Pratinjau Dokumen Berkas Sertifikat:</span>
                      </span>
                      <button
                        onClick={() => handleDownload(userCert)}
                        className="text-syarat hover:underline text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>Unduh Dokumen Asli</span>
                      </button>
                    </div>

                    {userCert.certFileUrl ? (
                      userCert.certFileUrl.startsWith("data:image/") ||
                      /\.(jpg|jpeg|png|webp)$/i.test(userCert.certFileName || "") ? (
                        <div className="p-4 bg-slate-100/70 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
                          <img
                            src={userCert.certFileUrl}
                            alt={userCert.certFileName || "Sertifikat Resmi"}
                            className="max-h-[650px] w-auto max-w-full rounded-xl shadow-lg border border-slate-300 dark:border-slate-700 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-slate-900">
                          <iframe
                            src={userCert.certFileUrl}
                            className="w-full h-full border-0"
                            title="Pratinjau Dokumen Berkas Sertifikat"
                          ></iframe>
                        </div>
                      )
                    ) : (
                      <div className="p-10 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-syarat/10 text-syarat flex items-center justify-center mx-auto text-3xl">
                          <i className="fa-solid fa-file-pdf"></i>
                        </div>
                        <div className="space-y-1">
                          <div className="font-extrabold text-sm text-slate-800 dark:text-white">
                            {userCert.certFileName || "Berkas_Sertifikat.pdf"}
                          </div>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Berkas resmi sertifikat Anda telah diunggah oleh mentor. Silakan unduh berkas asli melalui tombol di bawah.
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(userCert)}
                          className="btn-duotone px-6 py-2.5 rounded-xl font-bold text-xs shadow-md"
                        >
                          <i className="fa-solid fa-download mr-1.5"></i>
                          <span>Unduh Berkas Sertifikat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-10 rounded-3xl text-center space-y-4 border-2 border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-3xl font-bold">
                  <i className="fa-solid fa-file-circle-xmark"></i>
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    Belum Ada Berkas Sertifikat
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Mentor belum mengunggah berkas sertifikat resmi untuk akun Anda.
                    Sertifikat resmi pelatihan BISINDO diterbitkan secara <strong>manual (unggah berkas)</strong> oleh mentor setelah evaluasi seluruh modul dan kuis evaluasi.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-mono">
                  <span>User ID: <strong>{userCert.user_id || userCert.npm}</strong></span>
                  <span>•</span>
                  <span>Status: <strong>Menunggu Unggahan Berkas Mentor</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MENTOR & ADMIN VIEW: UPLOAD, ISSUE & CANCEL */}
        {!isPesertaMode && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-tigpad/15 text-tigpad text-xs font-bold">
                  Panel Kelola Mentor / Admin
                </span>
                <h3 className="font-extrabold text-lg mt-1">Evaluasi Kelulusan & Terbitkan Sertifikat</h3>
                <p className="text-xs text-slate-500">
                  Upload file sertifikat dari browser, pilih peserta untuk diterbitkan, atau batalkan sertifikat.
                </p>
              </div>
            </div>

            {/* DIRECT UPLOAD FORM CARD */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-syarat/10 via-tigpad/10 to-transparent border-2 border-syarat/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-black text-syarat dark:text-syarat-light text-xs flex items-center gap-2">
                  <i className="fa-solid fa-upload text-tigpad"></i>
                  <span>Upload Berkas Sertifikat → Pilih Peserta → Kirim & Terbitkan</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                  Langkah Cepat
                </span>
              </div>

              <form onSubmit={handleDirectUploadSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
                <div className="sm:col-span-5">
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    1. Upload File Sertifikat (PDF / JPG / PNG)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDirectFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-syarat file:text-white hover:file:bg-syarat-light bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-1"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    2. Pilih ID / Nama Peserta Penerima
                  </label>
                  <select
                    value={directTargetId}
                    onChange={(e) => setDirectTargetId(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                  >
                    {activeParticipants.length === 0 ? (
                      <option value="">(Belum ada peserta terdaftar)</option>
                    ) : (
                      activeParticipants.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (User ID: {c.user_id || c.npm}) — {c.certIssued ? "[SUDAH DITERBITKAN]" : "[SIAP TERBIT]"}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="btn-duotone w-full py-2.5 rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-upload"></i>
                    <span>Kirim & Terbitkan</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Table of Participants */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Nama Peserta</th>
                    <th className="p-3.5">Nilai & Progress</th>
                    <th className="p-3.5">Berkas Sertifikat</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 text-xs font-semibold">
                        Belum ada peserta terdaftar di database. Tambahkan peserta terlebih dahulu di menu Kelola User.
                      </td>
                    </tr>
                  ) : (
                    activeParticipants.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold">
                          <div className="text-slate-800 dark:text-white font-extrabold">{c.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">User ID: {c.user_id || c.npm}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                                c.score >= 70 ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"
                              }`}
                            >
                              {c.score} / 100
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">{c.progress}%</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          {c.certFileName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-syarat/10 text-syarat font-bold">
                              <i className="fa-solid fa-file-pdf text-red-500"></i>
                              <span>{c.certFileName}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada berkas</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {c.certIssued ? (
                            <div>
                              <span className="px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-bold text-[10px] inline-flex items-center gap-1">
                                <i className="fa-solid fa-circle-check"></i> Diterbitkan
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.issueDate}</div>
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold text-[10px]">
                              Belum Terbit
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.certIssued ? (
                              <>
                                <button
                                  onClick={() => setPreviewUser(c)}
                                  className="px-2.5 py-1.5 rounded-xl glass-card hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1"
                                  title="Pratinjau Berkas Dokumen"
                                >
                                  <i className="fa-solid fa-eye text-syarat"></i>
                                  <span>Lihat</span>
                                </button>
                                <button
                                  onClick={() => handleDownload(c)}
                                  className="px-2.5 py-1.5 rounded-xl glass-card hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1"
                                  title="Unduh Berkas Asli"
                                >
                                  <i className="fa-solid fa-download text-green-600"></i>
                                  <span>Unduh</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setUploadModalUser(c);
                                    setModalFile(null);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[11px] hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
                                  title="Ganti Berkas Dokumen"
                                >
                                  <i className="fa-solid fa-file-arrow-up"></i>
                                  <span>Ganti</span>
                                </button>
                                <button
                                  onClick={() => revokeCertificate(c.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-600 font-bold text-[11px] hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                                  title="Batalkan Penerbitan Sertifikat"
                                >
                                  <i className="fa-solid fa-ban"></i>
                                  <span>Batal</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadModalUser(c);
                                  setModalFile(null);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-syarat text-white font-bold text-[11px] hover:bg-syarat-light transition-all flex items-center gap-1.5 shadow-sm"
                                title="Upload berkas sertifikat untuk diterbitkan"
                              >
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                                <span>Upload Berkas</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: UPLOAD FILE PER PESERTA */}
        {uploadModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setUploadModalUser(null)}
            ></div>
            <div className="glass-card p-6 rounded-3xl max-w-md w-full relative z-10 animate-slide-up space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-tigpad flex items-center gap-2">
                  <i className="fa-solid fa-upload"></i> Upload File Sertifikat
                </h3>
                <button
                  onClick={() => setUploadModalUser(null)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="text-xs space-y-1">
                <div>
                  Penerima: <strong>{uploadModalUser.name}</strong>
                </div>
                <div className="text-slate-400 font-mono">User ID: {uploadModalUser.user_id || uploadModalUser.npm}</div>
              </div>

              <form onSubmit={handleModalUploadSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Pilih Berkas Sertifikat (PDF/JPG/PNG)</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-syarat file:text-white rounded-xl border p-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadModalUser(null)}
                    className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-duotone px-5 py-2 rounded-xl font-bold shadow"
                  >
                    Simpan & Terbitkan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PRATINJAU BERKAS DOKUMEN SERTIFIKAT */}
        {previewUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setPreviewUser(null)}
            ></div>
            <div className="glass-card p-6 sm:p-8 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto relative z-10 animate-slide-up space-y-4 shadow-2xl border border-slate-300 dark:border-slate-700">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-sm text-syarat dark:text-syarat-light flex items-center gap-2">
                    <i className="fa-solid fa-file-lines text-amber-500"></i>
                    <span>Pratinjau Berkas Sertifikat Resmi</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Peserta: <strong>{previewUser.name}</strong> • User ID:{" "}
                    <span className="font-mono">{previewUser.user_id || previewUser.npm}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewUser(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {/* File Info Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <i className="fa-solid fa-paperclip text-syarat"></i>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {previewUser.certFileName || "Berkas_Sertifikat.pdf"}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  Terbit: {previewUser.issueDate || "-"}
                </div>
              </div>

              {/* Document Preview Content */}
              <div className="space-y-3">
                {previewUser.certFileUrl ? (
                  previewUser.certFileUrl.startsWith("data:image/") ||
                  /\.(jpg|jpeg|png|webp)$/i.test(previewUser.certFileName || "") ? (
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center max-h-[65vh] overflow-auto">
                      <img
                        src={previewUser.certFileUrl}
                        alt={previewUser.certFileName || "Sertifikat Resmi"}
                        className="max-h-[600px] w-auto max-w-full rounded-xl shadow-lg border border-slate-300 dark:border-slate-700 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-slate-900">
                      <iframe
                        src={previewUser.certFileUrl}
                        className="w-full h-full border-0"
                        title="Pratinjau Berkas Dokumen"
                      ></iframe>
                    </div>
                  )
                ) : (
                  <div className="p-10 text-center bg-slate-100/60 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                    <i className="fa-solid fa-file-pdf text-4xl text-red-500"></i>
                    <div className="font-bold text-sm">
                      {previewUser.certFileName || "Berkas Sertifikat Resmi"}
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Dokumen resmi telah tercatat diterbitkan untuk peserta ini oleh mentor. Silakan unduh berkas di bawah.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleDownload(previewUser)}
                  className="btn-duotone px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
                >
                  <i className="fa-solid fa-download"></i>
                  <span>Unduh Berkas Asli</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
