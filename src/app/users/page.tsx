"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { useApp, User, Role } from "@/context/AppContext";

export default function UsersPage() {
  const { users, currentUser, currentRole, addUser, updateUser, deleteUser, showToast } = useApp();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Add Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNpm, setNewNpm] = useState("");
  const [newRole, setNewRole] = useState<Role>("peserta");
  const [newInstitution, setNewInstitution] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Edit Form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const editingUser = users.find((u) => u.id === editingUserId);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNpm, setEditNpm] = useState("");
  const [editRole, setEditRole] = useState<Role>("peserta");
  const [editInstitution, setEditInstitution] = useState("");
  const [editStatus, setEditStatus] = useState("Aktif");
  const [editScore, setEditScore] = useState<number>(0);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editPassword, setEditPassword] = useState("");

  // Delete Confirmation Modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleOpenEditModal = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditNpm(user.user_id || user.npm || "");
    setEditRole(user.role || "peserta");
    setEditInstitution(user.institution || "");
    setEditStatus(user.status || "Aktif");
    setEditScore(user.score ?? 0);
    setEditProgress(user.progress ?? 0);
    setEditPassword(user.password || "");
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId === null) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast("Nama dan email wajib diisi!", "warning");
      return;
    }

    updateUser(editingUserId, {
      name: editName.trim(),
      email: editEmail.trim(),
      user_id: editNpm.trim(),
      npm: editNpm.trim(),
      role: editRole,
      institution: editInstitution.trim() || "Komunitas BISINDO",
      status: editStatus,
      score: Math.min(100, Math.max(0, Number(editScore) || 0)),
      progress: Math.min(100, Math.max(0, Number(editProgress) || 0)),
      ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
    });

    setIsEditModalOpen(false);
    setEditingUserId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast("Nama dan email wajib diisi!", "warning");
      return;
    }
    addUser({
      name: newName.trim(),
      email: newEmail.trim(),
      user_id: newNpm.trim() || undefined,
      npm: newNpm.trim() || undefined,
      role: newRole,
      institution: newInstitution.trim() || "Komunitas BISINDO",
      password: newPassword.trim() || undefined,
    });
    setNewName("");
    setNewEmail("");
    setNewNpm("");
    setNewInstitution("");
    setNewPassword("");
    setIsAddModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showToast("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!", "warning");
      setUserToDelete(null);
      return;
    }
    deleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  const handleExportCSV = () => {
    const headers = "No,Nama,Email,User ID,Peran,Status,Nilai,Progress,Instansi\n";
    const rows = users
      .map(
        (u, idx) =>
          `"${idx + 1}","${u.name}","${u.email}","${u.npm || ""}","${u.role}","${u.status || "Aktif"}","${u.score ?? 0}","${u.progress ?? 0}%","${u.institution || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pengguna_BISINDO_${Date.now()}.csv`;
    link.click();
    showToast("Data pengguna berhasil diekspor ke CSV!", "success");
  };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.user_id || u.npm || "").toLowerCase().includes(q) ||
      (u.institution || "").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  useEffect(() => {
    setUserPage(1);
  }, [search, roleFilter]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  const totalPeserta = users.filter((u) => u.role === "peserta").length;
  const totalMentor = users.filter((u) => u.role === "mentor").length;
  const totalAdmin = users.filter((u) => u.role === "admin").length;

  if (currentRole !== "admin") {
    return (
      <DashboardLayout>
        <div className="glass-card p-12 rounded-3xl text-center space-y-3">
          <i className="fa-solid fa-lock text-4xl text-slate-400"></i>
          <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300">Akses Ditolak</h2>
          <p className="text-xs text-slate-400">Halaman ini hanya dapat diakses oleh Administrator.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-syarat to-tigpad bg-clip-text text-transparent">
              Kelola Pengguna LMS
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manajemen akun Peserta Pelatihan, Mentor Pengajar, dan Administrator Sistem KOLAB BISINDO.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-duotone px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>+ Tambah User Baru</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-2xl glass-card text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <i className="fa-solid fa-file-csv text-green-500"></i>
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Overview Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="statsCardsContainer">
          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Akun
              </span>
              <div className="w-8 h-8 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light flex items-center justify-center text-sm">
                <i className="fa-solid fa-users"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black" id="statTotalUsers">
              {users.length}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Semua Pengguna Terdaftar
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Peserta
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                <i className="fa-solid fa-user-graduate"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400" id="statTotalPeserta">
              {totalPeserta}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Peserta Pelatihan Aktif
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mentor Pengajar
              </span>
              <div className="w-8 h-8 rounded-xl bg-tigpad/15 text-tigpad flex items-center justify-center text-sm">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-tigpad" id="statTotalMentor">
              {totalMentor}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Instruktur & Penguji
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Administrator
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
                <i className="fa-solid fa-user-shield"></i>
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400" id="statTotalAdmin">
              {totalAdmin}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Akses Sistem Penuh
            </div>
          </div>
        </div>

        {/* Role Filter Pills & Search Bar */}
        <div className="glass-card p-4 rounded-3xl space-y-3.5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
            {/* Role Filter Pills */}
            <div className="flex flex-wrap gap-1.5" id="roleFilterButtons">
              <button
                onClick={() => setRoleFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  roleFilter === "all"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span>Semua ({users.length})</span>
              </button>
              <button
                onClick={() => setRoleFilter("peserta")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  roleFilter === "peserta"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <i className="fa-solid fa-user-graduate"></i>
                <span>Peserta ({totalPeserta})</span>
              </button>
              <button
                onClick={() => setRoleFilter("mentor")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  roleFilter === "mentor"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <i className="fa-solid fa-chalkboard-user"></i>
                <span>Mentor ({totalMentor})</span>
              </button>
              <button
                onClick={() => setRoleFilter("admin")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  roleFilter === "admin"
                    ? "bg-syarat text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <i className="fa-solid fa-user-shield"></i>
                <span>Admin ({totalAdmin})</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-72">
              <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-xs"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau User ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
              />
            </div>
          </div>
        </div>

        {/* Table of Users */}
        <div className="glass-card rounded-3xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Pengguna</th>
                  <th className="p-3.5">Peran</th>
                  <th className="p-3.5">Lembaga / Instansi</th>
                  <th className="p-3.5">Progress & Skor</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs font-semibold">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isSelf = currentUser && currentUser.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-syarat to-tigpad text-white font-bold text-xs flex items-center justify-center shadow flex-shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                              {u.avatar_url || u.avatar ? (
                                <img
                                  src={u.avatar_url || u.avatar}
                                  alt={u.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>
                                  {u.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded bg-syarat/15 text-syarat">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {u.email} • User ID: {u.user_id || u.npm || "-"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize inline-flex items-center gap-1 ${
                              u.role === "admin"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                : u.role === "mentor"
                                ? "bg-tigpad/15 text-tigpad"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <i
                              className={
                                u.role === "admin"
                                  ? "fa-solid fa-user-shield"
                                  : u.role === "mentor"
                                  ? "fa-solid fa-chalkboard-user"
                                  : "fa-solid fa-user-graduate"
                              }
                            ></i>
                            <span>{u.role}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {u.institution || "Komunitas BISINDO"}
                        </td>
                        <td className="p-3.5">
                          {u.role === "peserta" ? (
                            <div className="space-y-1 w-28">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>{u.progress ?? 0}% Materi</span>
                                <span className="text-syarat dark:text-syarat-light">{u.score ?? 0} Poin</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-syarat to-tigpad rounded-full transition-all"
                                  style={{ width: `${u.progress ?? 0}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {u.role === "admin" ? "Akses Administrator" : "Akses Instruktur"}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              u.status === "Nonaktif"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : u.status === "Ditangguhkan"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-green-500/15 text-green-600 dark:text-green-400"
                            }`}
                          >
                            <i
                              className={
                                u.status === "Nonaktif"
                                  ? "fa-solid fa-circle-xmark"
                                  : u.status === "Ditangguhkan"
                                  ? "fa-solid fa-triangle-exclamation"
                                  : "fa-solid fa-circle-check"
                              }
                            ></i>{" "}
                            {u.status || "Aktif"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="px-2.5 py-1.5 rounded-xl bg-syarat/10 text-syarat dark:text-syarat-light hover:bg-syarat hover:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                              title="Edit Data Pengguna"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                              <span>Edit</span>
                            </button>
                            <button
                              disabled={isSelf}
                              onClick={() => setUserToDelete(u)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                                isSelf
                                  ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400"
                                  : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                              }`}
                              title={isSelf ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus Pengguna"}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Pagination
              currentPage={userPage}
              totalPages={userTotalPages}
              totalItems={filteredUsers.length}
              pageSize={userPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setUserPage}
              onPageSizeChange={setUserPageSize}
              itemLabel="pengguna"
            />
          </div>
        </div>

        {/* Modal: Tambah Pengguna */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Pengguna Baru"
          subtitle="Buat akun baru untuk peserta, mentor, atau admin"
          icon="fa-solid fa-user-plus"
          size="md"
        >
          <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama lengkap pengguna"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Alamat Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">User ID</label>
                <input
                  type="text"
                  value={newNpm}
                  onChange={(e) => setNewNpm(e.target.value)}
                  placeholder="User ID (Auto jika kosong)"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Peran Akun</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  <option value="peserta">Peserta Umum</option>
                  <option value="mentor">Mentor BISINDO</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Kata Sandi Awal</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi (default jika kosong)"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Instansi / Komunitas / Kota</label>
              <input
                type="text"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
                placeholder="Instansi / Komunitas / Umum"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-duotone px-5 py-2 rounded-xl font-bold shadow"
              >
                Simpan Pengguna
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Pengguna */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Data Pengguna"
          subtitle={
            <span>
              User ID: <strong className="font-mono text-syarat">{editNpm || `#${editingUserId}`}</strong>
            </span>
          }
          icon="fa-solid fa-user-pen"
          size="lg"
        >
          <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
            {/* Preview Foto Profil Pengguna */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-syarat to-tigpad text-white font-bold text-sm flex items-center justify-center shadow overflow-hidden flex-shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                {editingUser?.avatar_url || editingUser?.avatar ? (
                  <img
                    src={editingUser.avatar_url || editingUser.avatar}
                    alt={editName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {editName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                  {editName || "Pengguna"}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {editEmail}
                </div>
                {editingUser?.avatar_url || editingUser?.avatar ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <i className="fa-solid fa-circle-check text-[9px]"></i> Foto Profil Terpasang
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Belum mengunggah foto profil</span>
                )}
              </div>
            </div>

            {/* Informasi Identitas Akun */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Informasi Akun
              </span>
              <div>
                <label className="block font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama lengkap pengguna"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Alamat Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">User ID</label>
                  <input
                    type="text"
                    value={editNpm}
                    onChange={(e) => setEditNpm(e.target.value)}
                    placeholder="User ID Pengguna"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>
              </div>
            </div>

            {/* Peran & Status */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Hak Akses & Status
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Peran Akun</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-syarat"
                  >
                    <option value="peserta">Peserta Umum</option>
                    <option value="mentor">Mentor BISINDO</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Status Akun</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-syarat"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Ditangguhkan">Ditangguhkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Instansi / Komunitas / Kota</label>
                <input
                  type="text"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  placeholder="Instansi / Komunitas / Umum"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
                />
              </div>
            </div>

            {/* Nilai, Progress & Keamanan */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Akademik & Keamanan
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nilai / Skor Akhir</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-syarat"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Ubah Kata Sandi</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Biarkan kosong jika tidak ingin mengubah sandi"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-syarat"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-duotone px-5 py-2 rounded-xl font-bold shadow flex items-center gap-1.5 hover:scale-105 transition-all"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Konfirmasi Hapus Pengguna */}
        <Modal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          title="Konfirmasi Hapus Pengguna"
          icon="fa-solid fa-triangle-exclamation"
          size="sm"
        >
          {userToDelete && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center text-2xl mx-auto shadow-inner">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-800 dark:text-white">
                  Hapus Pengguna Ini?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun{" "}
                  <strong className="text-slate-800 dark:text-slate-100">{userToDelete.name}</strong>{" "}
                  ({userToDelete.email})? Tindakan ini akan menghapus data pengguna dari sistem.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-md text-xs flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-trash-can"></i>
                  <span>Ya, Hapus Akun</span>
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
