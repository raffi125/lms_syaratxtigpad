"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useApp } from "@/context/AppContext";

import { SupabaseStorageService } from "@/lib/supabaseStorage";

export default function ProfilePage() {
  const { currentUser, updateProfile, showToast, certificates } = useApp();
  const userCert = certificates.find((c) => c.id === currentUser.id);

  const [name, setName] = useState(currentUser.name || "");
  const [email, setEmail] = useState(currentUser.email || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(currentUser.avatar_url || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  React.useEffect(() => {
    setName(currentUser.name || "");
    setEmail(currentUser.email || "");
    setPhone(currentUser.phone || "");
    setAvatarPhoto(currentUser.avatar_url || null);
  }, [currentUser]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Format berkas harus berupa gambar (JPG, PNG, WebP)!", "warning");
      return;
    }

    setIsUploadingPhoto(true);
    showToast("Mengunggah foto profil ke Supabase Storage...", "info");

    const cleanExt = file.name.split(".").pop() || "jpg";
    const fileName = `user_${currentUser.id}_${Date.now()}.${cleanExt}`;

    const res = await SupabaseStorageService.uploadFile("avatars", file, fileName);
    setIsUploadingPhoto(false);

    if (res.url) {
      setAvatarPhoto(res.url);
      updateProfile({ avatar_url: res.url });
      if (res.isRemote) {
        showToast("✨ Foto profil berhasil diunggah ke Supabase Storage (bucket: image)!", "success");
      } else {
        showToast("Foto profil diperbarui di database profil.", "info");
      }
    } else {
      showToast("Gagal mengunggah foto profil: " + (res.error || "Terjadi kesalahan."), "error");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      email,
      phone,
      avatar_url: avatarPhoto || undefined,
    });
    showToast("Perubahan profil berhasil disimpan!", "success");
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-syarat to-tigpad bg-clip-text text-transparent">
              Profil Pengguna & Kartu Identitas Digital
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informasi identitas peserta, foto profil, dan pengaturan akun.
            </p>
          </div>
          <button
            onClick={handleSave}
            className="btn-duotone px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <i className="fa-solid fa-floppy-disk"></i>
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Virtual Student ID Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#163C8A] via-[#1e4eb8] to-[#F97316] text-white space-y-6 border border-white/30 shadow-xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/logo_tigpad_syarat.png"
                    alt="Logo"
                    className="w-8 h-8 object-contain rounded-lg p-0.5 bg-white shadow-sm flex-shrink-0"
                  />
                  <div>
                    <h4 className="font-black text-xs tracking-tight">
                      <span className="text-white">SYARAT</span>{" "}
                      <span className="text-white/60 text-[10px]">X</span>{" "}
                      <span className="text-amber-300 font-black">TIGPAD</span>
                    </h4>
                    <p className="text-[9px] text-white/80 uppercase tracking-wider">
                      Program Pelatihan Inklusif
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[9px] font-extrabold uppercase tracking-wider backdrop-blur-md border border-white/30">
                  Verified ID
                </span>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label
                  htmlFor="profilePhotoInput"
                  className="relative group cursor-pointer"
                  title="Klik untuk mengunggah / ganti foto profil"
                >
                  <div
                    id="profileCardAvatarBox"
                    className="w-20 h-20 rounded-2xl bg-white text-syarat font-black flex items-center justify-center text-2xl shadow-2xl border-2 border-white/80 overflow-hidden"
                  >
                    {avatarPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPhoto}
                        alt="Foto Profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span id="profileCardInitials">{initials}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fa-solid fa-camera text-base"></i>
                    <span className="text-[9px] font-bold mt-0.5">Ganti Foto</span>
                  </div>
                </label>

                <div className="space-y-1">
                  <h3 id="profileCardName" className="font-extrabold text-lg tracking-tight text-white">
                    {name}
                  </h3>
                  <p id="profileCardNPM" className="font-mono text-xs text-amber-200 font-extrabold">
                    User ID: {currentUser.user_id || currentUser.npm}
                  </p>
                  <p className="text-[11px] text-white/90 font-medium capitalize">
                    {currentUser.role === "peserta"
                      ? "Peserta Pelatihan • Program BISINDO"
                      : currentUser.role === "mentor"
                      ? "Mentor Pelatihan • Program BISINDO"
                      : "Administrator Sistem"}
                  </p>
                  <label
                    htmlFor="profilePhotoInput"
                    className="text-[10px] font-bold text-amber-200 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-cloud-arrow-up"></i> Upload Foto Resmi
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-white/20 flex justify-between items-center text-[10px] text-white/80 font-mono font-semibold">
                <span>STATUS: AKTIF</span>
                <span>KOLAB 2026</span>
              </div>
            </div>

            {/* LMS Summary Box */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                Ringkasan LMS Pembelajaran
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    <i className="fa-solid fa-book-open text-syarat mr-2"></i> Modul Diselesaikan
                  </span>
                  <span className="font-bold">
                    {Math.round((currentUser.progress / 100) * 6)} / 6 Modul ({currentUser.progress}%)
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    <i className="fa-solid fa-graduation-cap text-tigpad mr-2"></i> Nilai Kuis Evaluasi
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {currentUser.score} / 100 ({currentUser.score >= 70 ? "Lulus" : "Remedial"})
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    <i className="fa-solid fa-award text-amber-500 mr-2"></i> Status Sertifikat
                  </span>
                  <span className="font-bold text-amber-500">
                    {userCert?.certIssued ? "Diterbitkan Mentor" : "Belum Terbit"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form Edit Profile */}
          <div className="lg:col-span-7 glass-card p-6 sm:p-8 rounded-3xl space-y-6">
            <h3 className="font-bold text-base flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <i className="fa-solid fa-user-pen text-syarat"></i> Pengaturan Data Diri & Foto Profil
            </h3>

            <form onSubmit={handleSave} id="profileEditForm" className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-extrabold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-camera text-tigpad"></i> Upload Pasfoto Profil Peserta (JPG/PNG)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="profilePhotoInput"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handlePhotoUpload}
                    className="file-input file-input-bordered file-input-sm file-input-primary w-full text-xs bg-white dark:bg-slate-900"
                  />
                  {avatarPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarPhoto(null);
                        updateProfile({ avatar_url: undefined });
                        showToast("Foto profil dihapus.", "info");
                      }}
                      className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold whitespace-nowrap hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <i className="fa-solid fa-trash mr-1"></i> Hapus
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Foto profil ini akan otomatis ditampilkan pada Kartu Identitas Digital dan avatar akun Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold focus:ring-2 focus:ring-tigpad shadow-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={currentUser.user_id || currentUser.npm}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Kategori / Program
                  </label>
                  <input
                    type="text"
                    value="Pelatihan Bahasa Isyarat Indonesia (BISINDO)"
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Alamat Email Terdaftar
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Belum diisi (Contoh: 08123456789)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold shadow-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Lembaga / Instansi
                  </label>
                  <input
                    type="text"
                    value={currentUser.institution || "Komunitas BISINDO"}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="btn-duotone px-6 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
