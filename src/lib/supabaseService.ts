import { supabase, isSupabaseConfigured } from "./supabase";

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
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("*")
      .order("id", { ascending: false });
    if (error) return [];
    return data || [];
  },

  async addAttendanceLog(log: Partial<DBAttendanceLog>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase.from("attendance_logs").insert([log]);
    return !error;
  },

  async recordAttendance(log: Partial<DBAttendanceLog>): Promise<boolean> {
    return this.addAttendanceLog(log);
  },

  // 6. Game Words
  async getGameWords(difficulty: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("game_words")
      .select("word")
      .eq("difficulty", difficulty);
    if (error || !data) return [];
    return data.map((d) => d.word);
  },

  async addGameWord(word: string, difficulty: "easy" | "medium" | "hard"): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { error } = await supabase
      .from("game_words")
      .insert({ word: word.toUpperCase().trim(), difficulty });
    return !error;
  },
};

export const supabaseService = SupabaseService;
