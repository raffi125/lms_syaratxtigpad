"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SupabaseService } from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  User,
  Role,
  ModuleItem,
  CertificateItem,
  AttendanceItem,
  ActiveZoomSession,
  ZoomData,
  ToastState,
  DBUser,
  DBModule,
  DBCertificate,
  DBZoomSession,
  DBAttendanceLog,
  QuizItem,
  DBQuiz,
  NotificationItem,
  LearningActivity,
} from "@/types";

export type {
  User,
  Role,
  ModuleItem,
  CertificateItem,
  AttendanceItem,
  ActiveZoomSession,
  ZoomData,
  QuizItem,
  NotificationItem,
  LearningActivity,
};

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  currentRole: Role;
  currentUser: User;
  currentUserId: number | null;
  isAuthenticated: boolean;
  switchRole: (role: Role) => void;
  loginUser: (emailOrId: string, password?: string) => Promise<boolean>;
  registerUser: (userData: {
    name: string;
    email: string;
    user_id?: string;
    npm?: string;
    institution?: string;
    password?: string;
    phone?: string;
  }) => Promise<boolean>;
  logout: () => void;
  users: User[];
  modules: ModuleItem[];
  quizzes: QuizItem[];
  certificates: CertificateItem[];
  zoomData: ZoomData;
  notifications: NotificationItem[];
  unreadNotifCount: number;
  addNotification: (notif: {
    title: string;
    message: string;
    type?: NotificationItem["type"];
    targetRole?: NotificationItem["targetRole"];
    userId?: number;
    linkUrl?: string;
    sender?: string;
  }) => void;
  markNotificationAsRead: (id: number) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: number) => void;
  activities: LearningActivity[];
  logActivity: (activity: {
    title: string;
    description: string;
    category: LearningActivity["category"];
    statusText?: string;
    statusBadge?: LearningActivity["statusBadge"];
    icon?: string;
  }) => void;
  clearActivities: () => void;
  toast: ToastState;
  showToast: (message: string, type?: "success" | "error" | "warning" | "info") => void;
  hideToast: () => void;
  toggleModuleComplete: (id: number) => void;
  addModule: (module: Partial<ModuleItem>) => void;
  updateModule: (id: number, module: Partial<ModuleItem>) => void;
  deleteModule: (id: number) => void;
  submitAttendance: (code: string) => boolean;
  addZoomSession: (session: Partial<ActiveZoomSession>) => Promise<void>;
  updateZoomSession: (id: number, session: Partial<ActiveZoomSession>) => Promise<void>;
  deleteZoomSession: (id: number) => Promise<void>;
  addQuiz: (quiz: Partial<QuizItem>) => Promise<void>;
  updateQuiz: (id: number, quiz: Partial<QuizItem>) => Promise<void>;
  deleteQuiz: (id: number) => Promise<void>;
  issueCertificate: (id: number, fileName?: string, fileUrl?: string) => void;
  revokeCertificate: (id: number) => void;
  addUser: (user: Partial<User>) => void;
  updateUser: (id: number, data: Partial<User>) => void;
  deleteUser: (id: number) => void;
  updateProfile: (data: Partial<User>) => void;
  isSupabaseActive: boolean;
  refreshFromSupabase: () => Promise<void>;
}

// Initial clean production administrator and mentor users
export const INITIAL_ADMIN: User = {
  id: 1,
  name: "Administrator",
  email: "admin@kolab.id",
  user_id: "ADMIN-01",
  npm: "ADMIN-01",
  role: "admin",
  status: "Aktif",
  institution: "Administrator Sistem BISINDO",
  score: 100,
  progress: 100,
  password: "admin",
};

export const INITIAL_MENTOR: User = {
  id: 2,
  name: "Mentor",
  email: "mentor@kolab.id",
  user_id: "MENTOR-01",
  npm: "MENTOR-01",
  role: "mentor",
  status: "Aktif",
  institution: "Instruktur & Pengajar BISINDO",
  score: 95,
  progress: 100,
  password: "mentor",
};

export const INITIAL_PESERTA_LIST: User[] = [];

export const INITIAL_MODULES_DATA: ModuleItem[] = [];

export const EMPTY_ZOOM_DATA: ZoomData = {
  activeSession: null,
  sessions: [],
  attendanceLogs: [],
};

export const INITIAL_ZOOM_DATA: ZoomData = EMPTY_ZOOM_DATA;

export const INITIAL_CERTIFICATES: CertificateItem[] = [];

export const INITIAL_USERS: User[] = [INITIAL_ADMIN, INITIAL_MENTOR];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: "Selamat Datang di Portal Pembelajaran BISINDO!",
    message: "Platform pembelajaran Bahasa Isyarat Indonesia (BISINDO) kini aktif. Pelajari modul materi dan ikuti evaluasi berkala.",
    type: "info",
    targetRole: "all",
    createdAt: "Baru saja",
    isRead: false,
    linkUrl: "/modul",
    sender: "Administrator Sistem",
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [currentRole, setCurrentRole] = useState<Role>(() => {
    if (typeof window !== "undefined") {
      const savedRole = sessionStorage.getItem("currentRole");
      if (savedRole === "admin" || savedRole === "mentor" || savedRole === "peserta") {
        return savedRole;
      }
    }
    return "peserta";
  });
  // Restore session from sessionStorage so page refresh doesn't log out
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("currentUserId");
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>(INITIAL_CERTIFICATES);
  const [zoomData, setZoomData] = useState<ZoomData>(INITIAL_ZOOM_DATA);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" });
  const [isSupabaseActive, setIsSupabaseActive] = useState<boolean>(false);


  const getFormattedDate = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + " " + months[d.getMonth()] + " " + d.getFullYear();
  };

  // Fetch live data directly from Supabase Cloud
  const refreshFromSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseActive(false);
      return;
    }

    try {
      setIsSupabaseActive(true);
      const [dbUsers, dbModules, dbCerts, dbZoomSessions, dbLogs, dbQuizzes] = await Promise.all([
        SupabaseService.getUsers(),
        SupabaseService.getModules(),
        SupabaseService.getCertificates(),
        SupabaseService.getZoomSessions(),
        SupabaseService.getAttendanceLogs(),
        SupabaseService.getQuizzes(),
      ]);

      if (dbUsers && dbUsers.length > 0) {
        const fetchedUsers: User[] = dbUsers.map((u: DBUser) => {
          const uid = u.user_id || u.npm || "";
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            user_id: uid,
            npm: uid,
            role: u.role as Role,
            status: u.status || "Aktif",
            institution: u.institution || "",
            score: u.score ?? 0,
            progress: u.progress ?? 0,
            avatar_url: u.avatar_url && !u.avatar_url.startsWith("blob:") ? u.avatar_url : undefined,
            password: u.role === "admin" ? "admin" : u.role === "mentor" ? "mentor" : undefined,
          };
        });
        setUsers(fetchedUsers);
      }

      if (dbModules && dbModules.length > 0) {
        setModules(
          dbModules.map((m: DBModule) => ({
            id: m.id,
            title: m.title,
            category: m.category || "BISINDO",
            description: m.description || "",
            duration: m.duration || "90 Menit",
            videoUrl: m.video_url || "",
            pdfUrl: m.pdf_url || "",
            completed: m.completed ?? false,
          }))
        );
      } else {
        setModules([]);
      }


      setQuizzes(
        (dbQuizzes || []).map((q: DBQuiz) => {
          let text = q.explanation || "";
          let category = "Dasar & Budaya";
          let meeting = "Pertemuan 1";
          let difficulty: "mudah" | "sedang" | "sulit" = "sedang";
          let points = 10;
          let imageUrl = "";
          let hint = "";
          let type: "pilihan_ganda" | "essai" = "pilihan_ganda";

          if (q.explanation && q.explanation.trim().startsWith("{") && q.explanation.trim().endsWith("}")) {
            try {
              const parsed = JSON.parse(q.explanation);
              text = parsed.text || "";
              category = parsed.category || category;
              meeting = parsed.meeting || meeting;
              difficulty = parsed.difficulty || difficulty;
              points = parsed.points ?? points;
              imageUrl = parsed.imageUrl || "";
              hint = parsed.hint || "";
              type = parsed.type === "essai" ? "essai" : "pilihan_ganda";
            } catch {
              text = q.explanation;
            }
          }

          return {
            id: q.id,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correct_answer,
            explanation: text,
            category,
            meeting,
            difficulty,
            points,
            imageUrl,
            hint,
            type,
          };
        })
      );

      const rawCerts = dbCerts || [];
      const currentParticipants = (dbUsers && dbUsers.length > 0 ? dbUsers : users).filter(
        (u: any) => u.role === "peserta"
      );

      const mergedCerts: CertificateItem[] = currentParticipants.map((p: any) => {
        const existing = rawCerts.find(
          (c: any) =>
            (c.user_id && String(c.user_id) === String(p.id)) ||
            (c.user_id_code && c.user_id_code === (p.user_id || p.npm)) ||
            (c.name && c.name.toLowerCase() === p.name.toLowerCase())
        );
        const uid = p.user_id || p.npm || "";
        if (existing) {
          return {
            id: p.id,
            name: p.name,
            user_id: uid,
            npm: uid,
            score: existing.score ?? p.score ?? 0,
            progress: existing.progress ?? p.progress ?? 0,
            certIssued: existing.cert_issued ?? false,
            certFileName: existing.cert_file_name || "",
            issueDate: existing.issue_date || "-",
          };
        }
        return {
          id: p.id,
          name: p.name,
          user_id: uid,
          npm: uid,
          score: p.score ?? 0,
          progress: p.progress ?? 0,
          certIssued: false,
          certFileName: "",
          issueDate: "-",
        };
      });

      rawCerts.forEach((c: any) => {
        if (!mergedCerts.some((mc) => mc.id === (c.user_id || c.id) || mc.name.toLowerCase() === c.name.toLowerCase())) {
          const uid = c.user_id_code || c.npm || "";
          mergedCerts.push({
            id: c.user_id || c.id,
            name: c.name,
            user_id: uid,
            npm: uid,
            score: c.score ?? 0,
            progress: c.progress ?? 0,
            certIssued: c.cert_issued ?? false,
            certFileName: c.cert_file_name || "",
            issueDate: c.issue_date || "-",
          });
        }
      });

      setCertificates(mergedCerts);

      if (dbZoomSessions && dbZoomSessions.length > 0) {
        const active = dbZoomSessions[0];
        setZoomData({
          activeSession: {
            id: active.id,
            title: active.title,
            meetingId: active.meeting_id,
            passcode: active.passcode,
            host: active.host,
            date: active.date,
            zoomUrl: active.zoom_url,
            presenceCode: active.presence_code,
            status: active.status,
            attendees: active.attendees || 0,
          },
          sessions: dbZoomSessions.map((s: DBZoomSession) => ({
            id: s.id,
            title: s.title,
            meetingId: s.meeting_id,
            passcode: s.passcode,
            host: s.host,
            date: s.date,
            zoomUrl: s.zoom_url,
            presenceCode: s.presence_code,
            status: s.status,
            attendees: s.attendees || 0,
          })),
          attendanceLogs:
            dbLogs && dbLogs.length > 0
              ? dbLogs.map((l: DBAttendanceLog) => {
                  const uid = l.user_id_code || l.npm || "";
                  return {
                    id: l.id,
                    name: l.name,
                    user_id: uid,
                    npm: uid,
                    institution: l.institution,
                    time: l.time,
                    method: l.method,
                    verified: l.verified,
                    sessionId: l.session_id,
                    session_id: l.session_id,
                  };
                })
              : [],
        });
      } else {
        setZoomData({
          activeSession: EMPTY_ZOOM_DATA.activeSession,
          sessions: [],
          attendanceLogs:
            dbLogs && dbLogs.length > 0
              ? dbLogs.map((l: DBAttendanceLog) => {
                  const uid = l.user_id_code || l.npm || "";
                  return {
                    id: l.id,
                    name: l.name,
                    user_id: uid,
                    npm: uid,
                    institution: l.institution,
                    time: l.time,
                    method: l.method,
                    verified: l.verified,
                    sessionId: l.session_id,
                    session_id: l.session_id,
                  };
                })
              : [],
        });
      }
    } catch (err) {
      console.warn("Error refreshing from Supabase:", err);
    }
  };

  // Initialize on mount: fetch directly from Supabase Cloud
  useEffect(() => {
    // Clear any residual localStorage to ensure purely remote Supabase state
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      refreshFromSupabase();
    }
  }, []);

  // Selalu pastikan hanya peserta yang terdaftar di database memiliki entri di sertifikat
  useEffect(() => {
    const participants = users.filter((u) => u.role === "peserta");
    if (participants.length === 0) {
      setCertificates([]);
      return;
    }

    setCertificates((prev) => {
      let changed = false;
      const validParticipantIds = new Set(participants.map((p) => String(p.id)));
      const validParticipantNames = new Set(participants.map((p) => p.name.toLowerCase()));

      let updated = prev.filter(
        (c) => validParticipantIds.has(String(c.id)) || validParticipantNames.has(c.name.toLowerCase())
      );
      if (updated.length !== prev.length) {
        changed = true;
      }

      participants.forEach((p) => {
        const idx = updated.findIndex(
          (c) => String(c.id) === String(p.id) || c.name.toLowerCase() === p.name.toLowerCase()
        );
        const uid = p.user_id || p.npm || "";
        if (idx === -1) {
          changed = true;
          updated.push({
            id: p.id,
            name: p.name,
            user_id: uid,
            npm: uid,
            score: p.score ?? 0,
            progress: p.progress ?? 0,
            certIssued: false, // Sertifikat hanya terbit manual via upload
            certFileName: "",
            issueDate: "-",
          });
        } else {
          const curr = updated[idx];
          if (
            curr.score !== p.score ||
            curr.progress !== p.progress ||
            curr.user_id !== uid ||
            curr.name !== p.name
          ) {
            changed = true;
            updated[idx] = {
              ...curr,
              name: p.name,
              user_id: uid,
              npm: uid,
              score: p.score ?? curr.score,
              progress: p.progress ?? curr.progress,
            };
          }
        }
      });

      if (changed) {
        return updated;
      }
      return prev;
    });
  }, [users]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  const currentUser =
    (currentUserId ? users.find((u) => u.id === currentUserId) : null) ||
    (currentRole === "admin" ? INITIAL_ADMIN : currentRole === "mentor" ? INITIAL_MENTOR : null) ||
    users.find((u) => u.role === currentRole) ||
    (currentRole === "peserta"
      ? {
          id: currentUserId || 9999,
          name: "Peserta",
          email: "peserta@kolab.id",
          user_id: "PESERTA",
          npm: "PESERTA",
          role: "peserta" as Role,
          status: "Aktif",
          institution: "Masyarakat Umum",
          score: 0,
          progress: 0,
        }
      : INITIAL_ADMIN);

  const isNotificationForUser = (n: NotificationItem) => {
    if (currentRole === "admin") return true;
    if (n.userId !== undefined && n.userId !== null) {
      return n.userId === currentUser.id;
    }
    return n.targetRole === "all" || n.targetRole === currentRole;
  };

  const unreadNotifCount = notifications.filter(
    (n) => !n.isRead && isNotificationForUser(n)
  ).length;

  const addNotification = (notif: {
    title: string;
    message: string;
    type?: NotificationItem["type"];
    targetRole?: NotificationItem["targetRole"];
    userId?: number;
    linkUrl?: string;
    sender?: string;
  }) => {
    const newItem: NotificationItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: notif.title,
      message: notif.message,
      type: notif.type || "info",
      targetRole: notif.targetRole || "all",
      userId: notif.userId,
      createdAt: "Baru saja",
      isRead: false,
      linkUrl: notif.linkUrl,
      sender: notif.sender || (currentRole === "admin" ? "Administrator" : currentRole === "mentor" ? "Mentor" : "Sistem LMS"),
    };

    setNotifications((prev) => [newItem, ...prev]);
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast("Semua notifikasi telah ditandai sudah dibaca.", "success");
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast("Notifikasi berhasil dihapus.", "info");
  };

  const logActivity = (activity: {
    title: string;
    description: string;
    category: LearningActivity["category"];
    statusText?: string;
    statusBadge?: LearningActivity["statusBadge"];
    icon?: string;
  }) => {
    const now = new Date();
    const timeStr = `Hari ini, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;
    const newAct: LearningActivity = {
      id: "act_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: activity.title,
      description: activity.description,
      category: activity.category,
      timestamp: timeStr,
      statusText: activity.statusText || "Selesai",
      statusBadge: activity.statusBadge || "green",
      icon: activity.icon || "fa-solid fa-circle-check",
    };

    setActivities((prev) => [newAct, ...prev.slice(0, 19)]);
  };

  const clearActivities = () => {
    setActivities([]);
  };

  const switchRole = (role: Role) => {
    setCurrentRole(role);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentRole", role);
    }
  };

  const loginUser = async (emailOrId: string, password?: string): Promise<boolean> => {
    const query = emailOrId.trim().toLowerCase();
    const cleanPass = (password || "").trim();

    // 1. Admin login check (hardcoded, tidak perlu DB)
    if (
      query === "admin@kolab.id" ||
      query === "admin" ||
      query === "admin-01" ||
      query === "administrator"
    ) {
      if (cleanPass && cleanPass !== "admin" && cleanPass !== "admin123") {
        showToast("Kata sandi Administrator salah! (Gunakan: admin)", "error");
        return false;
      }
      setCurrentUserId(INITIAL_ADMIN.id);
      setCurrentRole("admin");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("currentUserId", String(INITIAL_ADMIN.id));
        sessionStorage.setItem("currentRole", "admin");
      }
      showToast("Selamat datang, Administrator!", "success");
      return true;
    }

    // 2. Mentor login check (hardcoded, tidak perlu DB)
    if (
      query === "mentor@kolab.id" ||
      query === "mentor" ||
      query === "mentor-01"
    ) {
      if (cleanPass && cleanPass !== "mentor" && cleanPass !== "mentor123") {
        showToast("Kata sandi Mentor salah! (Gunakan: mentor)", "error");
        return false;
      }
      setCurrentUserId(INITIAL_MENTOR.id);
      setCurrentRole("mentor");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("currentUserId", String(INITIAL_MENTOR.id));
        sessionStorage.setItem("currentRole", "mentor");
      }
      showToast("Selamat datang, Mentor!", "success");
      return true;
    }

    // 3. Cari di local state dulu
    let found = users.find(
      (u) =>
        u.email.toLowerCase() === query ||
        (u.user_id && u.user_id.toLowerCase() === query) ||
        (u.npm && u.npm.toLowerCase() === query) ||
        u.name.toLowerCase() === query
    );

    // 4. Fallback: query langsung ke Supabase jika belum ada di state (race condition saat page load)
    if (!found && isSupabaseConfigured()) {
      try {
        const dbUsers = await SupabaseService.getUsers();
        const dbMatch = dbUsers.find(
          (u: any) =>
            u.email?.toLowerCase() === query ||
            u.user_id?.toLowerCase() === query ||
            u.npm?.toLowerCase() === query ||
            u.name?.toLowerCase() === query
        );
        if (dbMatch) {
          const uid = dbMatch.user_id || dbMatch.npm || "";
          const mappedUser: User = {
            id: dbMatch.id,
            name: dbMatch.name,
            email: dbMatch.email,
            user_id: uid,
            npm: uid,
            role: dbMatch.role as Role,
            status: dbMatch.status || "Aktif",
            institution: dbMatch.institution || "",
            score: dbMatch.score ?? 0,
            progress: dbMatch.progress ?? 0,
            avatar_url: dbMatch.avatar_url && !dbMatch.avatar_url.startsWith("blob:") ? dbMatch.avatar_url : undefined,
          };
          // Tambahkan ke state jika belum ada
          setUsers((prev) => {
            if (prev.some((u) => u.id === mappedUser.id)) return prev;
            return [...prev, mappedUser];
          });
          found = mappedUser;
        }
      } catch {
        // ignore, lanjut ke error di bawah
      }
    }

    if (found) {
      // Password di DB tidak disimpan — peserta login tanpa password atau password apapun diterima
      // ponytail: no password column in DB, skip password check for peserta
      setCurrentUserId(found.id);
      setCurrentRole(found.role);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("currentUserId", String(found.id));
        sessionStorage.setItem("currentRole", found.role);
      }
      showToast(`Selamat datang kembali, ${found.name}!`, "success");
      return true;
    }

    showToast("Akun dengan email atau User ID tersebut tidak ditemukan. Silakan periksa kembali atau daftar sebagai peserta baru.", "error");
    return false;
  };


  const registerUser = async (userData: {
    name: string;
    email: string;
    user_id?: string;
    npm?: string;
    institution?: string;
    password?: string;
    phone?: string;
  }): Promise<boolean> => {
    const emailNorm = userData.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
      showToast("Email sudah terdaftar! Silakan gunakan email lain atau langsung masuk.", "warning");
      return false;
    }

    const newUserId = (userData.user_id || userData.npm || "").trim() || ("USER-" + Math.floor(100000 + Math.random() * 900000));
    let createdId = Date.now();

    if (isSupabaseConfigured()) {
      try {
        const created = await SupabaseService.addUser({
          name: userData.name.trim(),
          email: emailNorm,
          user_id: newUserId,
          npm: newUserId,
          role: "peserta",
          status: "Aktif",
          institution: userData.institution?.trim() || "Masyarakat Umum",
          score: 0,
          progress: 0,
        });

        if (created && created.id) {
          createdId = created.id;
          await SupabaseService.createCertificate({
            user_id: created.id,
            name: userData.name.trim(),
            user_id_code: newUserId,
            score: 0,
            progress: 0,
            cert_issued: false,
            cert_file_name: "",
            issue_date: "-",
          }).catch(() => {});
        }
      } catch (err: any) {
        console.warn("Supabase register error:", err);
      }
    }

    const newUser: User = {
      id: createdId,
      name: userData.name.trim(),
      email: emailNorm,
      user_id: newUserId,
      npm: newUserId,
      role: "peserta",
      status: "Aktif",
      institution: userData.institution?.trim() || "Masyarakat Umum",
      score: 0,
      progress: 0,
      phone: userData.phone?.trim() || "",
      password: userData.password,
      joinedAt: getFormattedDate(),
    };

    const newCert: CertificateItem = {
      id: createdId,
      name: newUser.name,
      user_id: newUser.user_id,
      npm: newUser.npm,
      score: 0,
      progress: 0,
      certIssued: false,
      certFileName: "",
      issueDate: "-",
    };

    setUsers((prev) => [newUser, ...prev]);
    setCertificates((prev) => [newCert, ...prev.filter((c) => c.id !== createdId)]);
    setCurrentUserId(createdId);
    setCurrentRole("peserta");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentUserId", String(createdId));
      sessionStorage.setItem("currentRole", "peserta");
    }

    showToast(`Pendaftaran berhasil! Selamat datang di Platform BISINDO, ${newUser.name}.`, "success");
    return true;
  };

  const logout = () => {
    setCurrentUserId(null);
    setCurrentRole("peserta");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("currentUserId");
      sessionStorage.removeItem("currentRole");
    }
    showToast("Anda telah keluar dari akun.", "info");
  };

  const updateProfile = async (data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...data } : u)));

    if (isSupabaseConfigured()) {
      await SupabaseService.updateUser(currentUser.id, {
        name: data.name,
        email: data.email,
        user_id: data.user_id || data.npm,
        npm: data.user_id || data.npm,
        institution: data.institution,
        avatar_url: data.avatar_url || data.avatar,
      });
    }

    showToast("Profil berhasil diperbarui!", "success");
  };

  const toggleModuleComplete = (id: number) => {
    const targetMod = modules.find((m) => m.id === id);
    if (targetMod && !targetMod.completed) {
      logActivity({
        title: `Menyelesaikan Modul: ${targetMod.title}`,
        description: `Kategori ${targetMod.category} • Durasi ${targetMod.duration}`,
        category: "modul",
        statusText: "Tuntas",
        statusBadge: "green",
        icon: "fa-solid fa-circle-check",
      });
    }

    setModules((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m));
      const completedCount = updated.filter((m) => m.completed).length;
      const progressPercent = updated.length > 0 ? Math.round((completedCount / updated.length) * 100) : 0;

      setUsers((uPrev) => uPrev.map((u) => (u.id === currentUser.id ? { ...u, progress: progressPercent } : u)));

      if (isSupabaseConfigured()) {
        SupabaseService.updateUser(currentUser.id, { progress: progressPercent });
      }

      return updated;
    });
    showToast("Status modul diperbarui!", "success");
  };

  const addModule = async (newMod: Partial<ModuleItem>) => {
    const item: ModuleItem = {
      id: Date.now(),
      title: newMod.title || "Modul Baru",
      category: newMod.category || "BISINDO",
      description: newMod.description || "",
      duration: newMod.duration || "90 Menit",
      videoUrl: newMod.videoUrl || "",
      pdfUrl: newMod.pdfUrl || "",
      completed: false,
      mentor: newMod.mentor || "Instruktur BISINDO",
    };
    setModules((prev) => [...prev, item]);

    addNotification({
      title: `Modul Pembelajaran Baru: ${item.title}`,
      message: `Modul baru kategori ${item.category} telah ditambahkan ke kurikulum pembelajaran.`,
      type: "modul",
      targetRole: "all",
      linkUrl: "/modul",
      sender: item.mentor || "Admin LMS",
    });

    if (isSupabaseConfigured()) {
      const created = await SupabaseService.addModule({
        title: item.title,
        category: item.category,
        description: item.description,
        duration: item.duration,
        video_url: item.videoUrl,
        pdf_url: item.pdfUrl,
      });
      if (created) {
        setModules((prev) => prev.map((m) => (m.id === item.id ? { ...m, id: created.id } : m)));
      }
    }
    showToast("Modul berhasil ditambahkan ke database!", "success");
  };

  const updateModule = async (id: number, updated: Partial<ModuleItem>) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
    );
    if (isSupabaseConfigured()) {
      await SupabaseService.updateModule(id, {
        title: updated.title,
        category: updated.category,
        description: updated.description,
        duration: updated.duration,
        video_url: updated.videoUrl,
        pdf_url: updated.pdfUrl,
      });
    }
    showToast("Modul berhasil diperbarui di database!", "success");
  };

  const deleteModule = async (id: number) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
    if (isSupabaseConfigured()) {
      await SupabaseService.deleteModule(id);
    }
    showToast("Modul berhasil dihapus dari database!", "success");
  };

  const submitAttendance = (code: string): boolean => {
    if (!zoomData.activeSession) {
      showToast("Tidak ada sesi Zoom aktif saat ini!", "warning");
      return false;
    }

    if (code.trim().toUpperCase() === zoomData.activeSession.presenceCode.toUpperCase()) {
      const already = zoomData.attendanceLogs.some((l) => l.name === currentUser.name && l.verified);
      if (already) {
        showToast("Anda sudah melakukan presensi pada sesi ini!", "info");
        return true;
      }

      const newLog: AttendanceItem = {
        id: Date.now(),
        name: currentUser.name,
        user_id: currentUser.user_id,
        npm: currentUser.npm,
        institution: currentUser.institution || "Komunitas BISINDO",
        time: "Hari ini • Baru saja",
        method: "Kode Sesi",
        verified: true,
        sessionId: zoomData.activeSession.id,
        session_id: zoomData.activeSession.id,
      };

      setZoomData((prev) => ({
        ...prev,
        attendanceLogs: [newLog, ...prev.attendanceLogs],
      }));

      logActivity({
        title: `Presensi Pertemuan Zoom: ${zoomData.activeSession.title || "Tatap Muka Daring"}`,
        description: `Kode Sesi: ${code.toUpperCase()} • Terverifikasi Hadir`,
        category: "zoom",
        statusText: "Hadir",
        statusBadge: "blue",
        icon: "fa-solid fa-headset",
      });

      if (isSupabaseConfigured()) {
        SupabaseService.recordAttendance({
          user_id: currentUser.id,
          session_id: zoomData.activeSession.id,
          name: currentUser.name,
          npm: currentUser.npm,
          institution: currentUser.institution,
          time: "Hari ini • Baru saja",
          method: "Kode Sesi",
          verified: true,
        });
      }

      showToast("Presensi berhasil terverifikasi!", "success");
      return true;
    } else {
      showToast("Kode presensi tidak sesuai!", "error");
      return false;
    }
  };

  const addZoomSession = async (data: Partial<ActiveZoomSession>) => {
    const newSession: ActiveZoomSession = {
      id: Date.now(),
      title: data.title || "Sesi Praktik Tatap Muka BISINDO",
      host: data.host || currentUser.name,
      date: data.date || "Jadwal Mendatang",
      status: data.status || "MENDATANG",
      meetingId: data.meetingId || "884 920 192",
      passcode: data.passcode || "BISINDO2026",
      presenceCode: data.presenceCode || "BIS-" + Math.floor(100 + Math.random() * 900),
      zoomUrl: data.zoomUrl || "https://zoom.us",
      desc: data.desc || "Sesi tatap muka daring interaktif bersama instruktur.",
      attendees: 0,
    };

    setZoomData((prev) => ({
      ...prev,
      activeSession: newSession,
      sessions: [newSession, ...(prev.sessions || [])],
    }));

    addNotification({
      title: `Jadwal Baru Sesi Zoom: ${newSession.title}`,
      message: `Sesi tatap muka daring baru telah dijadwalkan pada ${newSession.date}. Host: ${newSession.host}.`,
      type: "zoom",
      targetRole: "all",
      linkUrl: "/zoom",
      sender: newSession.host,
    });

    if (isSupabaseConfigured()) {
      const created = await SupabaseService.addZoomSession({
        title: newSession.title,
        meeting_id: newSession.meetingId,
        passcode: newSession.passcode,
        host: newSession.host,
        date: newSession.date,
        zoom_url: newSession.zoomUrl,
        presence_code: newSession.presenceCode,
        status: newSession.status,
        attendees: 0,
      }).catch((e) => {
        console.warn("Supabase add zoom error:", e);
        return null;
      });

      if (created) {
        setZoomData((prev) => ({
          ...prev,
          activeSession: { ...newSession, id: created.id },
          sessions: (prev.sessions || []).map((s) => (s.id === newSession.id ? { ...s, id: created.id } : s)),
        }));
      }
    }

    showToast("Jadwal sesi Zoom baru berhasil ditambahkan!", "success");
  };

  const updateZoomSession = async (id: number, updated: Partial<ActiveZoomSession>) => {
    setZoomData((prev) => {
      const updatedSessions = (prev.sessions || []).map((s) => (s.id === id ? { ...s, ...updated } : s));
      const active = updatedSessions.find((s) => s.id === (prev.activeSession?.id || id)) || updatedSessions[0] || EMPTY_ZOOM_DATA.activeSession;
      return {
        ...prev,
        sessions: updatedSessions,
        activeSession: active,
      };
    });

    if (isSupabaseConfigured()) {
      await SupabaseService.updateZoomSession(id, {
        title: updated.title,
        meeting_id: updated.meetingId,
        passcode: updated.passcode,
        host: updated.host,
        date: updated.date,
        zoom_url: updated.zoomUrl,
        presence_code: updated.presenceCode,
        status: updated.status,
      });
    }
    showToast("Sesi Zoom berhasil diperbarui di database!", "success");
  };

  const deleteZoomSession = async (id: number) => {
    setZoomData((prev) => {
      const remaining = prev.sessions.filter((s) => s.id !== id);
      return {
        ...prev,
        sessions: remaining,
        activeSession: remaining[0] || {
          id: 0,
          title: "Belum Ada Sesi Zoom",
          meetingId: "-",
          passcode: "-",
          host: "-",
          date: "-",
          zoomUrl: "",
          presenceCode: "",
          status: "MENDATANG",
          attendees: 0,
          desc: "Belum ada sesi tatap muka daring aktif di database.",
        },
      };
    });

    if (isSupabaseConfigured()) {
      await SupabaseService.deleteZoomSession(id);
    }
    showToast("Sesi Zoom berhasil dihapus dari database!", "info");
  };

  const addQuiz = async (quizData: Partial<QuizItem>) => {
    const rawExplanation = quizData.explanation || "";
    const qType = quizData.type || "pilihan_ganda";
    const metaPayload = JSON.stringify({
      text: rawExplanation,
      category: quizData.category || "Dasar & Budaya",
      meeting: quizData.meeting || "Pertemuan 1",
      difficulty: quizData.difficulty || "sedang",
      points: quizData.points ?? 10,
      imageUrl: quizData.imageUrl || "",
      hint: quizData.hint || "",
      type: qType,
    });

    const item: QuizItem = {
      id: Date.now(),
      question: quizData.question || "Pertanyaan Kuis Baru",
      options: qType === "essai" ? [] : (quizData.options || ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"]),
      correctAnswer: quizData.correctAnswer ?? 0,
      explanation: rawExplanation,
      category: quizData.category || "Dasar & Budaya",
      meeting: quizData.meeting || "Pertemuan 1",
      difficulty: quizData.difficulty || "sedang",
      points: quizData.points ?? 10,
      imageUrl: quizData.imageUrl || "",
      hint: quizData.hint || "",
      type: qType,
    };
    setQuizzes((prev) => [...prev, item]);

    if (isSupabaseConfigured()) {
      const created = await SupabaseService.addQuiz({
        question: item.question,
        options: item.options,
        correct_answer: item.correctAnswer,
        explanation: metaPayload,
      });
      if (created) {
        setQuizzes((prev) => prev.map((q) => (q.id === item.id ? { ...q, id: created.id } : q)));
      }
    }
    showToast("Soal kuis berhasil ditambahkan ke database!", "success");
  };

  const updateQuiz = async (id: number, updated: Partial<QuizItem>) => {
    const existing = quizzes.find((q) => q.id === id);
    const category = updated.category ?? existing?.category ?? "Dasar & Budaya";
    const meeting = updated.meeting ?? existing?.meeting ?? "Pertemuan 1";
    const difficulty = updated.difficulty ?? existing?.difficulty ?? "sedang";
    const points = updated.points ?? existing?.points ?? 10;
    const imageUrl = updated.imageUrl ?? existing?.imageUrl ?? "";
    const hint = updated.hint ?? existing?.hint ?? "";
    const qType = updated.type ?? existing?.type ?? "pilihan_ganda";
    const rawText = updated.explanation !== undefined ? updated.explanation : (existing?.explanation || "");

    const metaPayload = JSON.stringify({
      text: rawText,
      category,
      meeting,
      difficulty,
      points,
      imageUrl,
      hint,
      type: qType,
    });

    setQuizzes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated, explanation: rawText, category, meeting, difficulty, points, imageUrl, hint, type: qType } : q))
    );

    if (isSupabaseConfigured()) {
      await SupabaseService.updateQuiz(id, {
        question: updated.question ?? existing?.question,
        options: updated.options ?? existing?.options,
        correct_answer: updated.correctAnswer ?? existing?.correctAnswer,
        explanation: metaPayload,
      });
    }
    showToast("Soal kuis berhasil diperbarui di database!", "success");
  };

  const deleteQuiz = async (id: number) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    if (isSupabaseConfigured()) {
      await SupabaseService.deleteQuiz(id);
    }
    showToast("Soal kuis berhasil dihapus dari database!", "info");
  };

  const issueCertificate = async (id: number, fileName?: string, fileUrl?: string) => {
    if (!fileName) {
      showToast("Pilih dan upload berkas file sertifikat terlebih dahulu!", "warning");
      return;
    }
    const formattedDate = getFormattedDate();
    const finalFileName = fileName;
    const finalFileUrl = fileUrl || "";

    setCertificates((prev) => {
      const exists = prev.some((c) => c.id === id);
      let updated: CertificateItem[];
      if (exists) {
        updated = prev.map((c) =>
          c.id === id
            ? {
                ...c,
                certIssued: true,
                certFileName: finalFileName,
                certFileUrl: finalFileUrl || c.certFileUrl || "",
                issueDate: formattedDate,
              }
            : c
        );
      } else {
        const u = users.find((user) => user.id === id);
        const uid = u?.user_id || u?.npm || "";
        const newCert: CertificateItem = {
          id: id,
          name: u?.name || "Peserta",
          user_id: uid,
          npm: uid,
          score: u?.score ?? 0,
          progress: u?.progress ?? 0,
          certIssued: true,
          certFileName: finalFileName,
          certFileUrl: finalFileUrl,
          issueDate: formattedDate,
        };
        updated = [newCert, ...prev];
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      await SupabaseService.issueCertificate(id, finalFileName, formattedDate, finalFileUrl);
    }

    const target = certificates.find((c) => c.id === id) || users.find((u) => u.id === id);
    const targetName = target?.name || "Peserta";
    const targetUserId = target?.user_id || target?.npm || "";
    const targetId = target?.id || id;

    // 1. Notifikasi Personal Langsung untuk Peserta Penerima
    addNotification({
      title: "🎉 Selamat! Sertifikat Resmi Anda Telah Diterbitkan",
      message: `Halo ${targetName}, berkas sertifikat resmi kelulusan BISINDO Anda (${finalFileName}) telah berhasil diverifikasi dan diterbitkan oleh Tim Pengajar. Buka menu Sertifikat untuk melihat dan mengunduh berkas.`,
      type: "sertifikat",
      targetRole: "peserta",
      userId: targetId,
      linkUrl: "/sertifikat",
      sender: "Tim Mentor BISINDO",
    });

    // 2. Notifikasi Pengumuman untuk Mentor & Admin
    addNotification({
      title: `Sertifikat Berhasil Diterbitkan: ${targetName}`,
      message: `Berkas (${finalFileName}) untuk ${targetName} (User ID: ${targetUserId}) telah diterbitkan dan dikirim ke akun peserta.`,
      type: "sertifikat",
      targetRole: "mentor",
      linkUrl: "/sertifikat",
      sender: currentRole === "admin" ? "Administrator" : "Mentor",
    });

    logActivity({
      title: `Sertifikat Resmi Diterbitkan: ${targetName}`,
      description: `Berkas ${finalFileName} terbit pada ${formattedDate}`,
      category: "sertifikat",
      statusText: "Resmi",
      statusBadge: "amber",
      icon: "fa-solid fa-award",
    });
    showToast("✨ Sertifikat untuk \"" + targetName + "\" berhasil diterbitkan!", "success");
  };

  const revokeCertificate = async (id: number) => {
    setCertificates((prev) => {
      const exists = prev.some((c) => c.id === id);
      let updated: CertificateItem[];
      if (exists) {
        updated = prev.map((c) =>
          c.id === id
            ? {
                ...c,
                certIssued: false,
                certFileName: "",
                certFileUrl: "",
                issueDate: "-",
              }
            : c
        );
      } else {
        const u = users.find((user) => user.id === id);
        const uid = u?.user_id || u?.npm || "";
        const newCert: CertificateItem = {
          id: id,
          name: u?.name || "Peserta",
          user_id: uid,
          npm: uid,
          score: u?.score ?? 0,
          progress: u?.progress ?? 0,
          certIssued: false,
          certFileName: "",
          certFileUrl: "",
          issueDate: "-",
        };
        updated = [newCert, ...prev];
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      await SupabaseService.revokeCertificate(id);
    }

    const target = certificates.find((c) => c.id === id) || users.find((u) => u.id === id);
    const targetName = target?.name || "Peserta";
    const targetId = target?.id || id;

    // Notifikasi Personal untuk Peserta bahwa sertifikat dibatalkan
    addNotification({
      title: "Pemberitahuan: Status Sertifikat Dibatalkan",
      message: `Halo ${targetName}, penerbitan sertifikat kelulusan Anda telah dibatalkan oleh mentor untuk evaluasi berkas kembali.`,
      type: "warning",
      targetRole: "peserta",
      userId: targetId,
      linkUrl: "/sertifikat",
      sender: "Tim Mentor BISINDO",
    });

    logActivity({
      title: `Sertifikat Dibatalkan: ${targetName}`,
      description: `Status sertifikat ditarik kembali`,
      category: "sertifikat",
      statusText: "Dibatalkan",
      statusBadge: "blue",
      icon: "fa-solid fa-ban text-red-500",
    });

    showToast("Sertifikat milik \"" + targetName + "\" berhasil dibatalkan.", "info");
  };

  const addUser = async (userData: Partial<User>) => {
    const userIdVal = (userData.user_id || userData.npm || "").trim() || ("USER-" + Math.floor(1000 + Math.random() * 9000));
    const newUser: User = {
      id: Date.now(),
      name: userData.name || "Pengguna Baru",
      email: userData.email || ("user" + Date.now() + "@kolab.id"),
      user_id: userIdVal,
      npm: userIdVal,
      role: userData.role || "peserta",
      status: userData.status || "Aktif",
      institution: userData.institution || "Masyarakat Umum",
      score: userData.score ?? 0,
      progress: userData.progress ?? 0,
      password: userData.password,
      joinedAt: getFormattedDate(),
    };

    setUsers((prev) => [newUser, ...prev]);

    if (newUser.role === "peserta") {
      setCertificates((prev) => [
        {
          id: newUser.id,
          name: newUser.name,
          user_id: newUser.user_id,
          npm: newUser.npm,
          score: newUser.score,
          progress: newUser.progress,
          certIssued: false,
          certFileName: "",
          issueDate: "-",
        },
        ...prev.filter((c) => c.id !== newUser.id),
      ]);
    }

    if (isSupabaseConfigured()) {
      await SupabaseService.addUser({
        name: newUser.name,
        email: newUser.email,
        user_id: newUser.user_id,
        npm: newUser.npm,
        role: newUser.role,
        status: newUser.status,
        institution: newUser.institution,
        score: newUser.score,
        progress: newUser.progress,
      });
    }

    showToast("Pengguna \"" + newUser.name + "\" berhasil ditambahkan!", "success");
  };

  const updateUser = async (id: number, userData: Partial<User>) => {
    const userIdVal = userData.user_id || userData.npm;
    const patchedData: Partial<User> = {
      ...userData,
      ...(userIdVal ? { user_id: userIdVal, npm: userIdVal } : {}),
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patchedData } : u)));

    // Also update currentRole if editing the active user account role
    if (currentUser.id === id && userData.role) {
      setCurrentRole(userData.role);
    }

    // Keep certificate list synchronized
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...(userData.name ? { name: userData.name } : {}),
              ...(userIdVal ? { user_id: userIdVal, npm: userIdVal } : {}),
              ...(userData.score !== undefined ? { score: userData.score } : {}),
              ...(userData.progress !== undefined ? { progress: userData.progress } : {}),
            }
          : c
      )
    );

    if (isSupabaseConfigured()) {
      await SupabaseService.updateUser(id, {
        name: userData.name,
        email: userData.email,
        user_id: userIdVal,
        npm: userIdVal,
        role: userData.role,
        status: userData.status,
        institution: userData.institution,
        score: userData.score,
        progress: userData.progress,
      });
    }

    logActivity({
      title: "Memperbarui Data Pengguna",
      description: `Data akun ${userData.name || "User #" + id} (${userData.role || "pengguna"}) berhasil diperbarui`,
      category: "modul",
      statusText: "Diperbarui",
      statusBadge: "blue",
      icon: "fa-solid fa-user-pen text-syarat",
    });

    showToast("Data pengguna \"" + (userData.name || "User") + "\" berhasil diperbarui!", "success");
  };

  const deleteUser = async (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setCertificates((prev) => prev.filter((c) => c.id !== id));

    if (isSupabaseConfigured()) {
      await SupabaseService.deleteUser(id);
    }

    showToast("Pengguna berhasil dihapus.", "info");
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currentRole,
        currentUser,
        currentUserId,
        isAuthenticated: currentUserId !== null,
        switchRole,
        loginUser,
        registerUser,
        logout,
        users,
        modules,
        quizzes,
        certificates,
        zoomData,
        notifications,
        unreadNotifCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        activities,
        logActivity,
        clearActivities,
        toast,
        showToast,
        hideToast,
        toggleModuleComplete,
        addModule,
        updateModule,
        deleteModule,
        submitAttendance,
        addZoomSession,
        updateZoomSession,
        deleteZoomSession,
        addQuiz,
        updateQuiz,
        deleteQuiz,
        issueCertificate,
        revokeCertificate,
        addUser,
        updateUser,
        deleteUser,
        updateProfile,
        isSupabaseActive,
        refreshFromSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
