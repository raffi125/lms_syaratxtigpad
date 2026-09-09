import { supabase, supabaseAdmin, isSupabaseConfigured } from "./supabase";
import type { QuizSubmission, DBQuizUser } from "@/types";

export interface DBUser {
  id: number;
  name: string;
  email: string;
  user_id: string;
  npm?: string;
  role: "peserta" | "mentor" | "admin";
  status: string;
  institution: string;
  score: number;
  progress: number;
  avatar_url?: string;
}

export interface DBModule {
  id: number;
  title: string;
  category: string;
  description: string;
  duration: string;
  date?: string;
  time?: string;
  video_url: string;
  pdf_url: string;
  completed?: boolean;
}

export interface DBQuiz {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface DBCertificate {
  id: number;
  user_id?: number;
  name: string;
  user_id_code?: string;
  npm?: string;
  score: number;
  progress: number;
  cert_issued: boolean;
  cert_file_name: string;
  cert_file_url?: string;
  issue_date: string;
}

export interface DBZoomSession {
  id: number;
  title: string;
  meeting_id: string;
  passcode: string;
  host: string;
  date: string;
  time?: string;
  zoom_url: string;
  presence_code: string;
  status: string;
  attendees: number;
  desc?: string;
}

export interface DBAttendanceLog {
  id: number;
  user_id?: number;
  session_id?: number;
  name: string;
  user_id_code?: string;
  npm?: string;
  institution: string;
  date?: string;
  time: string;
  method: string;
  status?: string;
  verified: boolean;
  proof_url?: string;
  proofUrl?: string;
}

export type DBAbsen = DBAttendanceLog;

export interface DBGameWord {
  id: number;
  word: string;
  difficulty: "easy" | "medium" | "hard";
}

// ==========================================
// SUPABASE API SERVICE
// ==========================================

export const SupabaseService = {
  // 1. Users
  async getUsers(): Promise<DBUser[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.warn("Supabase getUsers error:", error.message);
      return [];
    }
    return (data || []).map((u: any) => ({
      ...u,
      user_id: u.user_id || u.npm || "",
      npm: u.user_id || u.npm || "",
    }));
  },

  async addUser(user: Partial<DBUser>): Promise<DBUser | null> {
    if (!isSupabaseConfigured()) return null;
    const payload: any = {};
    if (user.name) payload.name = user.name;
    if (user.email) payload.email = user.email;
    if (user.user_id || user.npm) payload.user_id = user.user_id || user.npm;
    if (user.role) payload.role = user.role;
    if (user.status) payload.status = user.status;
    if (user.institution) payload.institution = user.institution;
    if (user.score !== undefined) payload.score = user.score;
    if (user.progress !== undefined) payload.progress = user.progress;
    if (user.avatar_url) payload.avatar_url = user.avatar_url;
    
    const { data, error } = await supabase.from("users").insert([payload]).select().single();
    if (error) {
      console.error("Supabase addUser error:", error.message);
      return null;
    }
    return data
      ? {
          ...data,
          user_id: data.user_id || data.npm || "",
          npm: data.user_id || data.npm || "",
        }
      : null;
  },

  async updateUser(id: number, updates: Partial<DBUser>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.user_id !== undefined || updates.npm !== undefined) payload.user_id = updates.user_id || updates.npm;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.institution !== undefined) payload.institution = updates.institution;
    if (updates.score !== undefined) payload.score = updates.score;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

    const { error } = await supabase.from("users").update(payload).eq("id", id);
    if (error) {
      console.warn("Supabase updateUser error:", error.message);
      return false;
    }
    return true;
  },

  async deleteUser(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("users").delete().eq("id", id);
    return !error;
  },

  // 2. Modules
  async getModules(): Promise<DBModule[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .order("id", { ascending: true });
    if (error) return [];
    return data || [];
  },

  async addModule(mod: Partial<DBModule>): Promise<DBModule | null> {
    if (!isSupabaseConfigured()) return null;
    const payload: any = {};
    if (mod.title) payload.title = mod.title;
    if (mod.category) payload.category = mod.category;
    if (mod.description) payload.description = mod.description;
    if (mod.duration) payload.duration = mod.duration;
    if (mod.date) payload.date = mod.date;
    if (mod.time) payload.time = mod.time;
    if (mod.video_url) payload.video_url = mod.video_url;
    if (mod.pdf_url) payload.pdf_url = mod.pdf_url;

    const { data, error } = await supabase
      .from("modules")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Supabase addModule error:", error.message);
      return null;
    }
    return data;
  },

  async updateModule(id: number, updates: Partial<DBModule>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.time !== undefined) payload.time = updates.time;
    if (updates.video_url !== undefined) payload.video_url = updates.video_url;
    if (updates.pdf_url !== undefined) payload.pdf_url = updates.pdf_url;

    const { error } = await supabase.from("modules").update(payload).eq("id", id);
    return !error;
  },

  async deleteModule(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    return !error;
  },

  // 3. Quizzes
  async getQuizzes(): Promise<DBQuiz[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .order("id", { ascending: true });
    if (error) return [];
    return data || [];
  },

  async addQuiz(quiz: Partial<DBQuiz>): Promise<DBQuiz | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("quizzes")
      .insert([quiz])
      .select()
      .single();
    if (error) {
      console.error("Supabase addQuiz error:", error.message);
      return null;
    }
    return data;
  },

  async updateQuiz(id: number, updates: Partial<DBQuiz>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("quizzes").update(updates).eq("id", id);
    return !error;
  },

  async deleteQuiz(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    return !error;
  },

  // 4. Certificates
  async getCertificates(): Promise<DBCertificate[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .order("id", { ascending: true });
    if (error) return [];
    return data || [];
  },

  async createCertificate(cert: Partial<DBCertificate>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = {
      name: cert.name || "Peserta",
      score: cert.score ?? 0,
      progress: cert.progress ?? 0,
      cert_issued: cert.cert_issued ?? false,
      cert_file_name: cert.cert_file_name || "",
      issue_date: cert.issue_date || "-",
    };
    if (cert.user_id) payload.user_id = cert.user_id;
    if (cert.user_id_code || cert.npm) payload.user_id_code = cert.user_id_code || cert.npm;
    if (cert.cert_file_url) payload.cert_file_url = cert.cert_file_url;

    const { error } = await supabase.from("certificates").insert([payload]);
    if (error) {
      console.warn("Supabase createCertificate error:", error.message);
      return false;
    }
    return true;
  },

  async issueCertificate(id: number, fileName?: string, issueDate?: string, fileUrl?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const updates: any = {
      cert_issued: true,
      cert_file_name: fileName || "Sertifikat_Resmi.pdf",
      issue_date: issueDate || "04 September 2026",
    };
    if (fileUrl) updates.cert_file_url = fileUrl;

    const { error } = await supabase
      .from("certificates")
      .update(updates)
      .eq("id", id);
    return !error;
  },

  async revokeCertificate(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase
      .from("certificates")
      .update({
        cert_issued: false,
        cert_file_name: "",
        issue_date: "-",
      })
      .eq("id", id);
    return !error;
  },

  // 5. Zoom & Attendance
  async getZoomSessions(): Promise<DBZoomSession[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("zoom_sessions")
      .select("*")
      .order("id", { ascending: true });
    if (error) return [];
    return (data || []).map((s: any) => ({
      ...s,
      time: s.time || "",
      desc: s.desc || "",
    }));
  },

  async addZoomSession(session: Partial<DBZoomSession>): Promise<DBZoomSession | null> {
    if (!isSupabaseConfigured()) return null;
    const payload: any = {
      title: session.title,
      meeting_id: session.meeting_id,
      passcode: session.passcode,
      host: session.host,
      date: session.date,
      time: session.time || "14:00",
      zoom_url: session.zoom_url,
      presence_code: session.presence_code,
      status: session.status || "Berlangsung",
      attendees: session.attendees || 0,
    };
    if (session.desc) payload.desc = session.desc;

    const { data, error } = await supabase
      .from("zoom_sessions")
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error("Supabase addZoomSession error:", error.message);
      return null;
    }
    return data;
  },

  async updateZoomSession(id: number, updates: Partial<DBZoomSession>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.meeting_id !== undefined) payload.meeting_id = updates.meeting_id;
    if (updates.passcode !== undefined) payload.passcode = updates.passcode;
    if (updates.host !== undefined) payload.host = updates.host;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.time !== undefined) payload.time = updates.time;
    if (updates.zoom_url !== undefined) payload.zoom_url = updates.zoom_url;
    if (updates.presence_code !== undefined) payload.presence_code = updates.presence_code;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.desc !== undefined) payload.desc = updates.desc;

    const { error } = await supabase.from("zoom_sessions").update(payload).eq("id", id);
    return !error;
  },

  async deleteZoomSession(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("zoom_sessions").delete().eq("id", id);
    return !error;
  },

  async getAttendanceLogs(): Promise<DBAttendanceLog[]> {
    if (!isSupabaseConfigured()) return [];
    const client = supabaseAdmin || supabase;

    // Utamakan tabel baru "absen", jika belum dimigrasikan fallback ke "attendance_logs"
    let data: any = null;
    let err: any = null;

    const resAbsen = await client.from("absen").select("*").order("id", { ascending: false });
    if (!resAbsen.error) {
      data = resAbsen.data;
    } else {
      const resLogs = await client.from("attendance_logs").select("*").order("id", { ascending: false });
      data = resLogs.data;
      err = resLogs.error;
    }

    if (err && !data) {
      console.warn("Supabase getAttendanceLogs error:", err.message);
      return [];
    }

    return (data || []).map((row: any) => {
      let proofUrl = row.proof_url || "";
      let method = (row.method || "").replace(/\[PROOF:.*?\]/g, "").trim();
      if (!proofUrl && row.method && row.method.includes("[PROOF:")) {
        const match = row.method.match(/\[PROOF:(.*?)\]/);
        if (match) {
          proofUrl = match[1];
        }
      }
      return {
        ...row,
        date: row.date || "",
        status: row.status || "Hadir",
        method: method || (proofUrl ? "Presensi Mandiri & SS Zoom" : "Presensi Mandiri"),
        proof_url: proofUrl,
        proofUrl: proofUrl,
      };
    });
  },

  async addAttendanceLog(log: Partial<DBAttendanceLog>): Promise<DBAttendanceLog | null> {
    if (!isSupabaseConfigured()) return null;
    const client = supabaseAdmin || supabase;

    const proofUrl = log.proof_url || (log as any).proofUrl || "";
    const cleanMethod = (log.method || (proofUrl ? "Presensi Mandiri & SS Zoom" : "Presensi Mandiri"))
      .replace(/\[PROOF:.*?\]/g, "")
      .trim();

    const basePayload: any = {
      name: log.name,
      institution: log.institution || "Komunitas BISINDO",
      date: log.date || new Date().toISOString().split("T")[0],
      time: log.time || "",
      method: cleanMethod,
      status: log.status || "Hadir",
      verified: log.verified ?? true,
      proof_url: proofUrl,
    };
    if (log.user_id_code || log.npm) {
      basePayload.user_id_code = log.user_id_code || log.npm;
    }

    const fullPayload: any = { ...basePayload };
    if (typeof log.user_id === "number" && log.user_id > 0 && log.user_id < 2147483647) {
      fullPayload.user_id = log.user_id;
    }
    // Kolom session_id di Postgres bertipe INTEGER (maks 2.147.483.647). Cegah error 22003 out of range:
    if (typeof log.session_id === "number" && log.session_id > 0 && log.session_id < 2147483647) {
      fullPayload.session_id = log.session_id;
    }

    // 1. Coba insert fullPayload ke tabel "absen"
    let res = await client.from("absen").insert([fullPayload]).select();

    // Jika tabel absen belum dibuat, fallback ke attendance_logs
    if (res.error && (res.error.code === "42P01" || res.error.message.includes("does not exist"))) {
      res = await client.from("attendance_logs").insert([fullPayload]).select();
    }

    // 2. Jika terjadi error apa pun (FK 23503, out of range 22003, dsb), retry bertahap agar data presensi pasti tersimpan
    if (res.error) {
      console.warn("Supabase addAttendanceLog initial error, retrying without user_id:", res.error.message);
      // Retry A: Simpan dengan session_id saja jika valid (tanpa user_id)
      const retryWithoutUserId = { ...basePayload };
      if (fullPayload.session_id) retryWithoutUserId.session_id = fullPayload.session_id;
      res = await client.from("absen").insert([retryWithoutUserId]).select();

      // Retry B: Jika masih gagal (apapun kodenya), simpan basePayload murni (tanpa user_id & session_id)
      if (res.error) {
        console.warn("Supabase addAttendanceLog session/FK error, retrying clean basePayload:", res.error.message);
        res = await client.from("absen").insert([basePayload]).select();
      }
    }

    if (res.error) {
      console.error("Supabase addAttendanceLog fatal error:", res.error.message);
      return null;
    }

    const savedRow = res.data && res.data.length > 0 ? res.data[0] : null;
    return savedRow;
  },

  async recordAttendance(log: Partial<DBAttendanceLog>): Promise<boolean> {
    const res = await this.addAttendanceLog(log);
    return Boolean(res);
  },

  async deleteAttendanceLog(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;
    // Coba hapus di tabel absen, jika gagal coba di attendance_logs
    const { error: errAbsen } = await client.from("absen").delete().eq("id", id);
    if (!errAbsen) return true;
    const { error: errLogs } = await client.from("attendance_logs").delete().eq("id", id);
    return !errLogs;
  },

  async cancelAttendance(sessionId: number, userIdOrName: string | number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;
    for (const table of ["absen", "attendance_logs"]) {
      let query = client.from(table).delete().eq("session_id", sessionId);
      if (typeof userIdOrName === "number") {
        query = query.eq("user_id", userIdOrName);
      } else {
        query = query.or(`user_id_code.eq.${userIdOrName},name.eq.${userIdOrName}`);
      }
      await query;
    }
    return true;
  },

  async updateAttendanceVerified(id: number, verified: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;
    const { error: errAbsen } = await client.from("absen").update({ verified }).eq("id", id);
    if (!errAbsen) return true;
    const { error: errLogs } = await client.from("attendance_logs").update({ verified }).eq("id", id);
    return !errLogs;
  },

  async markAllAttended(sessionId: number, usersList: Partial<DBUser>[]): Promise<number> {
    if (!isSupabaseConfigured() || !sessionId || !usersList || usersList.length === 0) return 0;
    const client = supabaseAdmin || supabase;

    // 1. Ambil log presensi yang sudah ada untuk sesi ini di database (cek absen atau attendance_logs)
    let existingLogs: any[] = [];
    const resAbsen = await client.from("absen").select("user_id, user_id_code, name").eq("session_id", sessionId);
    if (!resAbsen.error && resAbsen.data) {
      existingLogs = resAbsen.data;
    } else {
      const resOld = await client.from("attendance_logs").select("user_id, user_id_code, name").eq("session_id", sessionId);
      existingLogs = resOld.data || [];
    }

    const existingNames = new Set((existingLogs || []).map((l: any) => (l.name || "").toLowerCase().trim()));
    const existingCodes = new Set((existingLogs || []).map((l: any) => (l.user_id_code || "").trim()));
    const existingUserIds = new Set((existingLogs || []).map((l: any) => l.user_id).filter(Boolean));

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")} WIB`;

    const toInsert: any[] = [];
    for (const u of usersList) {
      const uCode = (u.user_id || u.npm || "").trim();
      const uName = (u.name || "").toLowerCase().trim();
      const isAlready =
        (u.id && existingUserIds.has(u.id)) ||
        (uCode && existingCodes.has(uCode)) ||
        (uName && existingNames.has(uName));

      if (!isAlready) {
        const item: any = {
          name: u.name || "Peserta",
          user_id_code: u.user_id || u.npm || "",
          institution: u.institution || "Komunitas BISINDO",
          session_id: sessionId,
          date: dateStr,
          time: timeStr,
          method: "Manual Mentor",
          status: "Hadir",
          verified: true,
        };
        if (typeof u.id === "number" && u.id > 0 && u.id < 2000000000) {
          item.user_id = u.id;
        }
        toInsert.push(item);
      }
    }

    if (toInsert.length === 0) return 0;

    let { error } = await client.from("absen").insert(toInsert);
    if (error && (error.code === "42P01" || error.message.includes("does not exist"))) {
      let res = await client.from("attendance_logs").insert(toInsert);
      error = res.error;
    }

    if (error && (error.code === "23503" || error.message.includes("foreign key"))) {
      console.warn("Supabase markAllAttended FK warning, retrying without user_id:", error.message);
      // Percobaan 1: Tanpa user_id
      const safeItems = toInsert.map((item) => {
        const { user_id, ...rest } = item;
        return rest;
      });
      let res = await client.from("absen").insert(safeItems);
      // Percobaan 2: Jika session_id juga melanggar FK (karena sessionId lokal tidak ada di DB), hapus session_id juga
      if (res.error && (res.error.code === "23503" || res.error.message.includes("foreign key"))) {
        console.warn("Supabase markAllAttended session FK warning, retrying pure base items:", res.error.message);
        const safeItemsNoFk = toInsert.map((item) => {
          const { user_id, session_id, ...rest } = item;
          return rest;
        });
        res = await client.from("absen").insert(safeItemsNoFk);
      }
      if (res.error) {
        res = await client.from("attendance_logs").insert(safeItems);
      }
      error = res.error;
    }

    if (error) {
      console.error("Supabase markAllAttended error:", error.message);
      return 0;
    }
    return toInsert.length;
  },

  // 6. Game Words
  async getAllGameWords(): Promise<DBGameWord[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("game_words")
      .select("*")
      .order("id", { ascending: true });
    if (error || !data) return [];
    return data as DBGameWord[];
  },

  async getGameWords(difficulty: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("game_words")
      .select("word")
      .eq("difficulty", difficulty)
      .order("id", { ascending: true });
    if (error || !data) return [];
    return data.map((d) => d.word);
  },

  async addGameWord(word: string, difficulty: "easy" | "medium" | "hard"): Promise<{ success: boolean; data?: DBGameWord; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database tidak terhubung" };
    const cleanWord = word.toUpperCase().trim().replace(/[^A-Z]/g, "");
    if (!cleanWord) return { success: false, error: "Kata tidak boleh kosong dan hanya boleh alfabet A-Z" };
    
    // Cek duplikasi
    const { data: existing } = await supabase
      .from("game_words")
      .select("id")
      .eq("word", cleanWord)
      .eq("difficulty", difficulty)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Kata "${cleanWord}" sudah ada dalam kategori ${difficulty}` };
    }

    const { data, error } = await supabase
      .from("game_words")
      .insert({ word: cleanWord, difficulty })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DBGameWord };
  },

  async updateGameWord(id: number, word: string, difficulty: "easy" | "medium" | "hard"): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database tidak terhubung" };
    const cleanWord = word.toUpperCase().trim().replace(/[^A-Z]/g, "");
    if (!cleanWord) return { success: false, error: "Kata tidak boleh kosong dan hanya boleh alfabet A-Z" };

    const { error } = await supabase
      .from("game_words")
      .update({ word: cleanWord, difficulty })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async deleteGameWord(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase
      .from("game_words")
      .delete()
      .eq("id", id);
    return !error;
  },

  async seedDefaultGameWords(): Promise<{ success: boolean; count: number; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, count: 0, error: "Database tidak terhubung" };
    
    const defaultWords = [
      // Easy (3-4 huruf)
      { word: "HAI", difficulty: "easy" },
      { word: "IBU", difficulty: "easy" },
      { word: "AYAH", difficulty: "easy" },
      { word: "MAU", difficulty: "easy" },
      { word: "TULI", difficulty: "easy" },
      { word: "KITA", difficulty: "easy" },
      { word: "BISA", difficulty: "easy" },
      { word: "SUKA", difficulty: "easy" },
      { word: "PAGI", difficulty: "easy" },
      { word: "HARI", difficulty: "easy" },
      { word: "KAMU", difficulty: "easy" },
      { word: "SAYA", difficulty: "easy" },
      { word: "BAIK", difficulty: "easy" },
      { word: "APA", difficulty: "easy" },
      // Medium (5-6 huruf)
      { word: "TEMAN", difficulty: "medium" },
      { word: "SENANG", difficulty: "medium" },
      { word: "TERIMA", difficulty: "medium" },
      { word: "KASIH", difficulty: "medium" },
      { word: "BELAJAR", difficulty: "medium" },
      { word: "SEKOLAH", difficulty: "medium" },
      { word: "BISINDO", difficulty: "medium" },
      { word: "ISYARAT", difficulty: "medium" },
      { word: "RUMAH", difficulty: "medium" },
      { word: "SEMANGAT", difficulty: "medium" },
      { word: "KELUARGA", difficulty: "medium" },
      // Hard (7+ huruf)
      { word: "KOMUNIKASI", difficulty: "hard" },
      { word: "PENDIDIKAN", difficulty: "hard" },
      { word: "INKLUSIF", difficulty: "hard" },
      { word: "KESETARAAN", difficulty: "hard" },
      { word: "MASYARAKAT", difficulty: "hard" },
      { word: "KOLABORASI", difficulty: "hard" },
      { word: "PEMBELAJARAN", difficulty: "hard" },
      { word: "PEMBERDAYAAN", difficulty: "hard" },
    ];

    // Cek kata yang sudah ada untuk menghindari duplikat
    const { data: existing } = await supabase
      .from("game_words")
      .select("word, difficulty");

    const existingSet = new Set((existing || []).map((e) => `${e.word}_${e.difficulty}`));
    const toInsert = defaultWords.filter((w) => !existingSet.has(`${w.word}_${w.difficulty}`));

    if (toInsert.length === 0) {
      return { success: true, count: 0 };
    }

    const { error } = await supabase
      .from("game_words")
      .insert(toInsert);

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: toInsert.length };
  },

  // 7. Kuis Peserta & Jawaban (quizzes_user)
  async getQuizSubmissions(userId?: number): Promise<QuizSubmission[]> {
    if (!isSupabaseConfigured()) return [];
    const client = supabaseAdmin || supabase;

    const resolveQuizInfo = (cat?: string, title?: string, answers?: any[]) => {
      const ansMeeting = Array.isArray(answers) && answers[0]?.meeting ? String(answers[0].meeting).trim() : "";
      let c = cat && cat !== "Umum" ? cat.trim() : "";
      let t = title && title !== "Kuis Evaluasi" ? title.trim() : "";

      if (!c && ansMeeting) {
        const match = ansMeeting.match(/Pertemuan\s*\d+/i);
        c = match ? match[0] : "Pertemuan 1";
      }

      if (!t && ansMeeting) {
        t = ansMeeting;
      }

      return {
        category: c || "Pertemuan 1",
        quizTitle: t || "Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli",
      };
    };

    // 1. Coba ambil dari tabel database public.quizzes_user
    let query = client.from("quizzes_user").select("*").order("created_at", { ascending: false });
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;

    if (!error && data) {
      // Jika tabel ada tapi masih kosong, jalankan migrasi data lama dari storage
      if (data.length === 0 && !userId) {
        await this.migrateQuizSubmissionsFromStorage();
        const recheck = await client.from("quizzes_user").select("*").order("created_at", { ascending: false });
        if (recheck.data && recheck.data.length > 0) {
          return recheck.data.map((row: any) => {
            const ansList = Array.isArray(row.answers) ? row.answers : [];
            const info = resolveQuizInfo(row.category, row.quiz_title, ansList);
            return {
              id: row.id,
              userId: row.user_id ? Number(row.user_id) : 0,
              userName: row.user_name,
              userEmail: row.user_email || "",
              userRole: row.user_role || "peserta",
              score: row.score ?? 0,
              earnedPoints: row.earned_points ?? 0,
              totalPossiblePoints: row.total_possible_points ?? 100,
              passed: row.passed ?? false,
              submittedAt: row.submitted_at || "-",
              quizTitle: info.quizTitle,
              category: info.category,
              answers: ansList,
              hasUngradedEssays: row.has_ungraded_essays ?? false,
            };
          });
        }
      }

      return data.map((row: any) => {
        const ansList = Array.isArray(row.answers) ? row.answers : [];
        const info = resolveQuizInfo(row.category, row.quiz_title, ansList);
        return {
          id: row.id,
          userId: row.user_id ? Number(row.user_id) : 0,
          userName: row.user_name,
          userEmail: row.user_email || "",
          userRole: row.user_role || "peserta",
          score: row.score ?? 0,
          earnedPoints: row.earned_points ?? 0,
          totalPossiblePoints: row.total_possible_points ?? 100,
          passed: row.passed ?? false,
          submittedAt: row.submitted_at || "-",
          quizTitle: info.quizTitle,
          category: info.category,
          answers: ansList,
          hasUngradedEssays: row.has_ungraded_essays ?? false,
        };
      });
    }

    // 2. Fallback aman jika tabel quizzes_user belum dibuat di SQL Editor
    try {
      const { data: storageData } = await supabaseAdmin.storage
        .from("modul")
        .download("system/quiz_submissions.json");
      if (storageData) {
        const text = await storageData.text();
        const parsed: QuizSubmission[] = JSON.parse(text);
        if (Array.isArray(parsed)) {
          const enriched = parsed.map((s) => {
            const info = resolveQuizInfo(s.category, s.quizTitle, s.answers);
            return {
              ...s,
              category: info.category,
              quizTitle: info.quizTitle,
            };
          });
          if (userId) return enriched.filter((s) => s.userId === userId);
          return enriched;
        }
      }
    } catch {}

    return [];
  },

  async saveQuizSubmission(sub: QuizSubmission): Promise<{ success: boolean; submission?: QuizSubmission; message?: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: "Database tidak terhubung" };
    const client = supabaseAdmin || supabase;

    const ansMeeting = Array.isArray(sub.answers) && sub.answers[0]?.meeting ? String(sub.answers[0].meeting).trim() : "";
    let cat = sub.category && sub.category !== "Umum" ? sub.category.trim() : "";
    let title = sub.quizTitle && sub.quizTitle !== "Kuis Evaluasi" ? sub.quizTitle.trim() : "";
    if (!cat && ansMeeting) {
      const match = ansMeeting.match(/Pertemuan\s*\d+/i);
      cat = match ? match[0] : "Pertemuan 1";
    }
    if (!title && ansMeeting) {
      title = ansMeeting;
    }

    const payload: any = {
      id: sub.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_name: sub.userName,
      user_email: sub.userEmail || "",
      user_role: sub.userRole || "peserta",
      quiz_title: title || "Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli",
      category: cat || "Pertemuan 1",
      score: sub.hasUngradedEssays ? 0 : (sub.score ?? 0),
      earned_points: sub.earnedPoints ?? 0,
      total_possible_points: sub.totalPossiblePoints ?? 100,
      passed: sub.hasUngradedEssays ? false : Boolean(sub.passed),
      submitted_at: sub.submittedAt,
      answers: sub.answers || [],
      has_ungraded_essays: Boolean(sub.hasUngradedEssays),
    };

    if (typeof sub.userId === "number" && sub.userId > 0) {
      payload.user_id = sub.userId;
    }

    let { error } = await client.from("quizzes_user").upsert([payload]);

    // Handle foreign key error if user_id doesn't match
    if (error && (error.code === "23503" || error.message?.includes("foreign key"))) {
      const safePayload = { ...payload };
      delete safePayload.user_id;
      const res = await client.from("quizzes_user").upsert([safePayload]);
      error = res.error;
    }

    // Fallback sync to storage if table quizzes_user does not exist yet
    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      try {
        const current = await this.getQuizSubmissions();
        const filtered = current.filter((s) => s.userId !== sub.userId);
        const updated = [sub, ...filtered];
        await supabaseAdmin.storage
          .from("modul")
          .upload("system/quiz_submissions.json", Buffer.from(JSON.stringify(updated, null, 2), "utf-8"), {
            contentType: "application/json",
            upsert: true,
          });
      } catch {}
    }

    // Update user score in users table if all essays are graded
    if (!sub.hasUngradedEssays && sub.userId) {
      await this.updateUserScore(sub.userId, sub.score);
    }

    return {
      success: true,
      submission: sub,
      message: sub.hasUngradedEssays
        ? "Jawaban kuis berhasil dikumpulkan! Menunggu penilaian essai oleh mentor."
        : `Hasil jawaban kuis berhasil disimpan! Nilai: ${sub.score}/100`,
    };
  },

  async gradeEssayAnswer(
    submissionId: string,
    quizId: number,
    earnedPoints: number,
    mentorFeedback?: string,
    gradedBy?: string
  ): Promise<{ success: boolean; data?: QuizSubmission; message?: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: "Database tidak terhubung" };
    const client = supabaseAdmin || supabase;

    const submissions = await this.getQuizSubmissions();
    const subIndex = submissions.findIndex((s) => s.id === submissionId);
    if (subIndex === -1) {
      return { success: false, message: "Data jawaban kuis tidak ditemukan" };
    }

    const targetSub = submissions[subIndex];
    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updatedAnswers = targetSub.answers.map((ans) => {
      if (ans.quizId === Number(quizId) || String(ans.quizId) === String(quizId)) {
        const maxPoints = ans.points && ans.points > 0 ? ans.points : 10;
        const pointsGiven = Math.max(0, Math.min(Number(earnedPoints) || 0, maxPoints));
        return {
          ...ans,
          earnedPoints: pointsGiven,
          isCorrect: pointsGiven > 0,
          isGraded: true,
          mentorFeedback: mentorFeedback !== undefined ? String(mentorFeedback).trim() : (ans.mentorFeedback || ""),
          gradedBy: String(gradedBy || "Mentor"),
          gradedAt: `${formattedDate} WIB`,
        };
      }
      return ans;
    });

    let totalEarned = 0;
    let totalPossible = 0;
    let hasUngraded = false;

    updatedAnswers.forEach((ans) => {
      const qPts = ans.points && ans.points > 0 ? ans.points : 10;
      totalPossible += qPts;
      if (ans.type === "essai") {
        if (ans.isGraded) {
          totalEarned += ans.earnedPoints ?? 0;
        } else {
          hasUngraded = true;
        }
      } else {
        if (ans.isCorrect) {
          totalEarned += qPts;
        }
      }
    });

    const newScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    const isPassed = newScore >= 70;

    const updatedSub: QuizSubmission = {
      ...targetSub,
      answers: updatedAnswers,
      earnedPoints: totalEarned,
      totalPossiblePoints: totalPossible,
      score: hasUngraded ? 0 : newScore,
      passed: !hasUngraded && isPassed,
      hasUngradedEssays: hasUngraded,
    };

    // Update to table quizzes_user
    const payload: any = {
      score: updatedSub.score,
      earned_points: updatedSub.earnedPoints,
      total_possible_points: updatedSub.totalPossiblePoints,
      passed: updatedSub.passed,
      answers: updatedSub.answers,
      has_ungraded_essays: updatedSub.hasUngradedEssays,
    };

    const { error } = await client.from("quizzes_user").update(payload).eq("id", submissionId);
    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      const updatedList = [...submissions];
      updatedList[subIndex] = updatedSub;
      try {
        await supabaseAdmin.storage
          .from("modul")
          .upload("system/quiz_submissions.json", Buffer.from(JSON.stringify(updatedList, null, 2), "utf-8"), {
            contentType: "application/json",
            upsert: true,
          });
      } catch {}
    }

    if (!hasUngraded && targetSub.userId) {
      await this.updateUserScore(targetSub.userId, newScore);
    }

    return {
      success: true,
      data: updatedSub,
      message: hasUngraded
        ? "Nilai butir soal berhasil disimpan! Masih ada soal essai yang perlu dinilai."
        : `Semua soal essai selesai dinilai! Skor resmi: ${newScore}/100 (${isPassed ? "LULUS" : "REMEDIAL"}).`,
    };
  },

  async deleteQuizSubmission(id?: string, userId?: number, all?: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;

    if (all) {
      await client.from("quizzes_user").delete().neq("id", "");
      try {
        await supabaseAdmin.storage
          .from("modul")
          .upload("system/quiz_submissions.json", Buffer.from(JSON.stringify([], null, 2), "utf-8"), {
            contentType: "application/json",
            upsert: true,
          });
      } catch {}
    } else if (id) {
      await client.from("quizzes_user").delete().eq("id", id);
      try {
        const current = await this.getQuizSubmissions();
        const filtered = current.filter((s) => s.id !== id);
        await supabaseAdmin.storage
          .from("modul")
          .upload("system/quiz_submissions.json", Buffer.from(JSON.stringify(filtered, null, 2), "utf-8"), {
            contentType: "application/json",
            upsert: true,
          });
      } catch {}
    } else if (userId) {
      await client.from("quizzes_user").delete().eq("user_id", userId);
    }

    return true;
  },

  async migrateQuizSubmissionsFromStorage(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const client = supabaseAdmin || supabase;

    try {
      const { data, error } = await supabaseAdmin.storage
        .from("modul")
        .download("system/quiz_submissions.json");

      if (error || !data) return 0;

      const text = await data.text();
      const parsed: QuizSubmission[] = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) return 0;

      const toInsert = parsed.map((sub) => {
        const ansMeeting = Array.isArray(sub.answers) && sub.answers[0]?.meeting ? String(sub.answers[0].meeting).trim() : "";
        let cat = sub.category && sub.category !== "Umum" ? sub.category.trim() : "";
        let title = sub.quizTitle && sub.quizTitle !== "Kuis Evaluasi" ? sub.quizTitle.trim() : "";

        if (!cat && ansMeeting) {
          const match = ansMeeting.match(/Pertemuan\s*\d+/i);
          cat = match ? match[0] : "Pertemuan 1";
        }
        if (!title && ansMeeting) {
          title = ansMeeting;
        }

        return {
          id: sub.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          user_name: sub.userName,
          user_email: sub.userEmail || "",
          user_role: sub.userRole || "peserta",
          quiz_title: title || "Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli",
          category: cat || "Pertemuan 1",
          score: sub.score ?? 0,
          earned_points: sub.earnedPoints ?? 0,
          total_possible_points: sub.totalPossiblePoints ?? 100,
          passed: Boolean(sub.passed),
          submitted_at: sub.submittedAt || new Date().toISOString(),
          answers: sub.answers || [],
          has_ungraded_essays: Boolean(sub.hasUngradedEssays),
          user_id: typeof sub.userId === "number" && sub.userId > 0 ? sub.userId : null,
        };
      });

      let insertRes = await client.from("quizzes_user").upsert(toInsert);
      if (insertRes.error && (insertRes.error.code === "23503" || insertRes.error.message?.includes("foreign key"))) {
        const safeItems = toInsert.map((item) => {
          const { user_id, ...rest } = item;
          return rest;
        });
        insertRes = await client.from("quizzes_user").upsert(safeItems);
      }

      return insertRes.error ? 0 : toInsert.length;
    } catch (e) {
      console.warn("Auto-migrate quiz submissions error:", e);
      return 0;
    }
  },
};

export const supabaseService = SupabaseService;
