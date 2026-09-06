"use client";

import React, { useState } from "react";
import { SupabaseService } from "@/lib/supabaseService";
import { DBGameWord } from "@/types";

interface WordBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  allWordItems: DBGameWord[];
  fetchWordBank: () => Promise<void>;
  reloadGameWords: () => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  logActivity: (act: any) => void;
}

export default function WordBankModal({
  isOpen,
  onClose,
  allWordItems,
  fetchWordBank,
  reloadGameWords,
  showToast,
  logActivity,
}: WordBankModalProps) {
  const [bankTab, setBankTab] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [bankSearch, setBankSearch] = useState("");

  // Form Tambah / Edit Kata
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [inputWord, setInputWord] = useState("");
  const [inputDifficulty, setInputDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [isSubmittingWord, setIsSubmittingWord] = useState(false);
  const [isSeedingWords, setIsSeedingWords] = useState(false);

  if (!isOpen) return null;

  const handleStartEditWord = (item: DBGameWord) => {
    setEditingWordId(item.id);
    setInputWord(item.word);
    setInputDifficulty(item.difficulty);
  };

  const handleCancelEditWord = () => {
    setEditingWordId(null);
    setInputWord("");
    setInputDifficulty("easy");
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputWord.toUpperCase().trim().replace(/[^A-Z]/g, "");
    if (!clean) {
      showToast("Kata harus berupa huruf A-Z tanpa angka, spasi, atau simbol!", "warning");
      return;
    }
    if (clean.length < 2) {
      showToast("Kata minimal harus terdiri dari 2 huruf!", "warning");
      return;
    }

    setIsSubmittingWord(true);
    try {
      if (editingWordId !== null) {
        const res = await SupabaseService.updateGameWord(editingWordId, clean, inputDifficulty);
        if (res.success) {
          showToast(`Kata "${clean}" berhasil diperbarui!`, "success");
          logActivity({
            title: "Memperbarui Kata Game BISINDO",
            description: `Mengubah kata #${editingWordId} menjadi "${clean}" (${inputDifficulty})`,
            category: "game",
            statusText: "Diperbarui",
            statusBadge: "blue",
            icon: "fa-solid fa-pen-to-square text-syarat",
          });
          setEditingWordId(null);
          setInputWord("");
          await fetchWordBank();
          await reloadGameWords();
        } else {
          showToast(res.error || "Gagal memperbarui kata", "error");
        }
      } else {
        const res = await SupabaseService.addGameWord(clean, inputDifficulty);
        if (res.success) {
          showToast(`Kata "${clean}" berhasil ditambahkan ke bank kata (${inputDifficulty})!`, "success");
          logActivity({
            title: "Menambahkan Kata Game BISINDO",
            description: `Menambahkan kata "${clean}" ke tingkat kesulitan ${inputDifficulty}`,
            category: "game",
            statusText: "Ditambahkan",
            statusBadge: "green",
            icon: "fa-solid fa-plus text-syarat",
          });
          setInputWord("");
          await fetchWordBank();
          await reloadGameWords();
        } else {
          showToast(res.error || "Gagal menambahkan kata", "error");
        }
      }
    } finally {
      setIsSubmittingWord(false);
    }
  };

  const handleDeleteWord = async (item: DBGameWord) => {
    if (!confirm(`Hapus kata "${item.word}" dari bank kata?`)) return;
    const ok = await SupabaseService.deleteGameWord(item.id);
    if (ok) {
      showToast(`Kata "${item.word}" berhasil dihapus.`, "info");
      logActivity({
        title: "Menghapus Kata Game BISINDO",
        description: `Menghapus kata "${item.word}" dari bank kata`,
        category: "game",
        statusText: "Dihapus",
        statusBadge: "red",
        icon: "fa-solid fa-trash text-red-500",
      });
      if (editingWordId === item.id) {
        handleCancelEditWord();
      }
      await fetchWordBank();
      await reloadGameWords();
    } else {
      showToast("Gagal menghapus kata.", "error");
    }
  };

  const handleSeedDefaultWords = async () => {
    if (!confirm("Muat daftar kosakata dasar BISINDO ke database Supabase? Kata yang sudah ada tidak akan diduplikasi.")) return;
    setIsSeedingWords(true);
    try {
      const res = await SupabaseService.seedDefaultGameWords();
      if (res.success) {
        if (res.count > 0) {
          showToast(`Berhasil menambahkan ${res.count} kosakata standar BISINDO ke database!`, "success");
          logActivity({
            title: "Memuat Kosakata Standar BISINDO",
            description: `Menambahkan ${res.count} kata standar ke bank kata BisindoSpelling`,
            category: "game",
            statusText: `${res.count} Kata Baru`,
            statusBadge: "green",
            icon: "fa-solid fa-cloud-arrow-down text-syarat",
          });
        } else {
          showToast("Semua kosakata standar BISINDO sudah ada di database.", "info");
        }
        await fetchWordBank();
        await reloadGameWords();
      } else {
        showToast(res.error || "Gagal memuat kosakata standar", "error");
      }
    } finally {
      setIsSeedingWords(false);
    }
  };

  const filteredWordList = allWordItems.filter((item) => {
    const matchTab = bankTab === "all" || item.difficulty === bankTab;
    const matchSearch =
      bankSearch.trim() === "" ||
      item.word.toLowerCase().includes(bankSearch.toLowerCase().trim());
    return matchTab && matchSearch;
  });

  const easyCount = allWordItems.filter((w) => w.difficulty === "easy").length;
  const mediumCount = allWordItems.filter((w) => w.difficulty === "medium").length;
  const hardCount = allWordItems.filter((w) => w.difficulty === "hard").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="glass-card p-5 sm:p-6 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-10 animate-slide-up border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[11px] font-bold border border-purple-500/30">
                <i className="fa-solid fa-shield-halved mr-1"></i> Khusus Mentor & Admin
              </span>
              <span className="text-xs text-slate-400">
                Total: {allWordItems.length} Kata Tersimpan
              </span>
            </div>
            <h3 className="font-black text-lg sm:text-xl text-slate-800 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-book-bookmark text-syarat"></i>
              <span>Kelola Bank Kata BisindoSpelling</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tambah, ubah, atau hapus kosakata latihan ejaan abjad jari BISINDO langsung dari database Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Tutup Modal"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
          {/* Form Tambah / Edit Kata */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-xs">
                <i className={`fa-solid ${editingWordId !== null ? "fa-pen-to-square text-amber-500" : "fa-circle-plus text-syarat"}`}></i>
                <span>{editingWordId !== null ? `Edit Kata #${editingWordId}` : "Tambah Kosakata Baru"}</span>
              </h4>
              {editingWordId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEditWord}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-semibold"
                >
                  ✕ Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveWord} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Kata BISINDO (Huruf A-Z) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inputWord}
                    onChange={(e) => setInputWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                    placeholder="Contoh: BISINDO, SEKOLAH, IBU..."
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-black uppercase tracking-wider focus:ring-2 focus:ring-syarat outline-none transition"
                  />
                  <span className="text-[10px] text-slate-400">
                    Hanya alfabet A-Z tanpa spasi atau simbol. Maks. 15 huruf.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Tingkat Kesulitan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inputDifficulty}
                    onChange={(e) => setInputDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold focus:ring-2 focus:ring-syarat outline-none transition"
                  >
                    <option value="easy">Mudah (3-4 Huruf)</option>
                    <option value="medium">Sedang (5-6 Huruf)</option>
                    <option value="hard">Sulit (7+ Huruf)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">
                    Kategori ronde di game BisindoSpelling
                  </span>
                </div>
              </div>

              {/* Real-time Sign Gesture Sprite Preview */}
              {inputWord.trim().length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      Pratinjau Gestur Abjad Jari ({inputWord.length} Huruf):
                    </span>
                    <span className="font-mono text-syarat font-black tracking-widest">
                      {inputWord.split("").join(" ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {inputWord.split("").map((char, idx) => (
                      <div
                        key={`${char}-${idx}`}
                        className="flex flex-col items-center bg-white dark:bg-slate-900 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/assets/sprites/${char}.webp`}
                          alt={char}
                          className="w-9 h-9 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 mt-1">
                          {char}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end items-center gap-2 pt-1">
                {editingWordId !== null && (
                  <button
                    type="button"
                    onClick={handleCancelEditWord}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmittingWord || !inputWord.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-syarat to-tigpad hover:opacity-90 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  {isSubmittingWord ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Menyimpan...</span>
                    </>
                  ) : editingWordId !== null ? (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Simpan Perubahan</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus"></i>
                      <span>Tambahkan Kata</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Filter Bar & Seeding Button */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-1">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setBankTab("all")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                  bankTab === "all"
                    ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Semua ({allWordItems.length})
              </button>
              <button
                type="button"
                onClick={() => setBankTab("easy")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                  bankTab === "easy"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Mudah ({easyCount})
              </button>
              <button
                type="button"
                onClick={() => setBankTab("medium")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                  bankTab === "medium"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Sedang ({mediumCount})
              </button>
              <button
                type="button"
                onClick={() => setBankTab("hard")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                  bankTab === "hard"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Sulit ({hardCount})
              </button>
            </div>

            {/* Search & Seed */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Cari kata..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-syarat"
                />
              </div>
              <button
                type="button"
                onClick={handleSeedDefaultWords}
                disabled={isSeedingWords}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-all border border-slate-200 dark:border-slate-700"
                title="Isi bank kata otomatis dengan kosakata standar BISINDO"
              >
                <i className={`fa-solid ${isSeedingWords ? "fa-spinner fa-spin text-syarat" : "fa-cloud-arrow-down text-syarat"}`}></i>
                <span>{isSeedingWords ? "Memuat..." : "Isi Kosakata Standar"}</span>
              </button>
            </div>
          </div>

          {/* Daftar Kata Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {filteredWordList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <i className="fa-solid fa-folder-open text-3xl"></i>
                <p className="font-bold">Belum ada kata yang sesuai kriteria.</p>
                <p className="text-[11px] text-slate-500">
                  Tambahkan kata baru di atas atau klik &quot;Isi Kosakata Standar&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Kata (BISINDO)</th>
                      <th className="p-3">Pratinjau Isyarat</th>
                      <th className="p-3 text-center">Level</th>
                      <th className="p-3 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWordList.map((item, idx) => {
                      const letters = item.word.split("");
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            editingWordId === item.id ? "bg-amber-500/10" : ""
                          }`}
                        >
                          <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-3 font-mono font-black text-slate-800 dark:text-white tracking-wider text-sm">
                            <span>{item.word}</span>
                            <span className="ml-2 text-[10px] font-sans font-semibold text-slate-400">
                              ({letters.length} huruf)
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {letters.slice(0, 6).map((c, cIdx) => (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  key={`${c}-${cIdx}`}
                                  src={`/assets/sprites/${c}.webp`}
                                  alt={c}
                                  className="w-5 h-5 object-contain rounded bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                  title={c}
                                />
                              ))}
                              {letters.length > 6 && (
                                <span className="text-[10px] text-slate-400 font-bold ml-0.5">
                                  +{letters.length - 6}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {item.difficulty === "easy" ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                Mudah
                              </span>
                            ) : item.difficulty === "medium" ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold text-[10px]">
                                Sedang
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-[10px]">
                                Sulit
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditWord(item)}
                                className="p-1.5 rounded-lg bg-syarat/10 hover:bg-syarat/20 text-syarat dark:text-syarat-light transition-colors"
                                title="Ubah kata ini"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWord(item)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                                title="Hapus kata ini dari database"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
          <span className="text-slate-400 text-[11px]">
            Menampilkan {filteredWordList.length} dari {allWordItems.length} kata
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
