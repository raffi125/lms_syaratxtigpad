import { supabase, supabaseAdmin, isSupabaseConfigured } from "./supabase";

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
  zoom_url: string;
  presence_code: string;
  status: string;
  attendees: number;
}

export interface DBAttendanceLog {
  id: number;
  user_id?: number;
  session_id?: number;
  name: string;
  user_id_code?: string;
  npm?: string;
  institution: string;
  time: string;
  method: string;
  verified: boolean;
  proof_url?: string;
  proofUrl?: string;
}

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
    return data || [];
  },

  async addZoomSession(session: Partial<DBZoomSession>): Promise<DBZoomSession | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("zoom_sessions")
      .insert([session])
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
    const { error } = await supabase.from("zoom_sessions").update(updates).eq("id", id);
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
    const { data, error } = await client
      .from("attendance_logs")
      .select("*")
      .order("id", { ascending: false });
    if (error) {
      console.warn("Supabase getAttendanceLogs error:", error.message);
      return [];
    }
    return (data || []).map((row: any) => {
      let proofUrl = row.proof_url || "";
      let method = row.method || "";
      if (!proofUrl && method && method.includes("[PROOF:")) {
        const match = method.match(/\[PROOF:(.*?)\]/);
        if (match) {
          proofUrl = match[1];
          method = method.replace(/\[PROOF:.*?\]/, "").trim();
        }
      }
      return {
        ...row,
        method,
        proof_url: proofUrl,
        proofUrl: proofUrl,
      };
    });
  },

  async addAttendanceLog(log: Partial<DBAttendanceLog>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;

    // Persiapkan method string yang menyematkan bukti screenshot jika ada
    let cleanMethod = log.method || "Kode Sesi";
    const proofUrl = log.proof_url || (log as any).proofUrl || "";
    if (proofUrl && !cleanMethod.includes("[PROOF:")) {
      cleanMethod = `${cleanMethod} [PROOF:${proofUrl}]`;
    }

    const basePayload: any = {
      name: log.name,
      institution: log.institution || "",
      time: log.time || "",
      method: cleanMethod,
      verified: log.verified ?? true,
    };
    if (log.user_id_code || log.npm) {
      basePayload.user_id_code = log.user_id_code || log.npm;
    }

    const fullPayload: any = { ...basePayload };
    if (typeof log.user_id === "number" && log.user_id > 0 && log.user_id < 2000000000) {
      fullPayload.user_id = log.user_id;
    }
    if (typeof log.session_id === "number" && log.session_id > 0) {
      fullPayload.session_id = log.session_id;
    }

    // Eksekusi insert dengan payload lengkap
    let { error } = await client.from("attendance_logs").insert([fullPayload]);

    // Jika terjadi FK violation (23503), retry bertahap agar presensi peserta tidak pernah hilang
    if (error && (error.code === "23503" || error.message.includes("foreign key"))) {
      console.warn("Supabase addAttendanceLog FK warning, retrying safely:", error.message);
      const retry1 = { ...basePayload };
      if (fullPayload.session_id) retry1.session_id = fullPayload.session_id;
      let res = await client.from("attendance_logs").insert([retry1]);
      if (res.error && (res.error.code === "23503" || res.error.message.includes("foreign key"))) {
        res = await client.from("attendance_logs").insert([basePayload]);
      }
      error = res.error;
    }

    if (error) {
      console.warn("Supabase addAttendanceLog error:", error.message);
      return false;
    }
    return true;
  },

  async recordAttendance(log: Partial<DBAttendanceLog>): Promise<boolean> {
    return this.addAttendanceLog(log);
  },

  async deleteAttendanceLog(id: number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;
    const { error } = await client.from("attendance_logs").delete().eq("id", id);
    if (error) {
      console.warn("Supabase deleteAttendanceLog error:", error.message);
      return false;
    }
    return true;
  },

  async cancelAttendance(sessionId: number, userIdOrName: string | number): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const client = supabaseAdmin || supabase;
    let query = client.from("attendance_logs").delete().eq("session_id", sessionId);
    if (typeof userIdOrName === "number") {
      query = query.eq("user_id", userIdOrName);
    } else {
      query = query.or(`user_id_code.eq.${userIdOrName},name.eq.${userIdOrName}`);
    }
    const { error } = await query;
    if (error) {
      console.warn("Supabase cancelAttendance error:", error.message);
      return false;
    }
    return true;
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
};

export const supabaseService = SupabaseService;
