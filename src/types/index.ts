// ==============================================================================
// KOLAB SYARAT X TIGPAD - CENTRAL TYPES & INTERFACES (PRODUCTION)
// ==============================================================================

export type Role = "peserta" | "mentor" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  user_id: string;
  npm: string;
  role: Role;
  status: string;
  institution: string;
  score: number;
  progress: number;
  phone?: string;
  joinedAt?: string;
  avatar?: string;
  avatar_url?: string;
  password?: string;
}

export interface ModuleItem {
  id: number;
  title: string;
  category: string;
  description: string;
  duration: string;
  date?: string;
  time?: string;
  videoUrl: string;
  pdfUrl: string;
  completed: boolean;
  mentor?: string;
}

export interface CertificateItem {
  id: number;
  name: string;
  user_id: string;
  npm: string;
  score: number;
  progress: number;
  certIssued: boolean;
  certFileName: string;
  certFileUrl?: string;
  issueDate: string;
}

export interface AttendanceItem {
  id: number;
  name: string;
  user_id: string;
  npm: string;
  institution: string;
  date?: string;
  time: string;
  method: string;
  status?: string;
  verified: boolean;
  sessionId?: number;
  session_id?: number;
  proof_url?: string;
  proofUrl?: string;
}

export interface ActiveZoomSession {
  id: number;
  title: string;
  meetingId: string;
  passcode: string;
  host: string;
  date: string;
  time?: string;
  zoomUrl: string;
  presenceCode: string;
  status: string;
  attendees: number;
  desc?: string;
}

export interface ZoomData {
  activeSession: ActiveZoomSession | null;
  sessions?: ActiveZoomSession[];
  attendanceLogs: AttendanceItem[];
  attendance?: AttendanceItem[];
}

export interface QuizItem {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category?: string;
  meeting?: string;
  difficulty?: "mudah" | "sedang" | "sulit";
  points?: number;
  imageUrl?: string;
  hint?: string;
  type?: "pilihan_ganda" | "essai";
}

export interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "zoom" | "modul" | "sertifikat" | "kuis";
  targetRole: "all" | "peserta" | "mentor" | "admin";
  userId?: number;
  createdAt: string;
  isRead: boolean;
  linkUrl?: string;
  sender?: string;
}

export interface LearningActivity {
  id: string | number;
  title: string;
  description: string;
  category: "modul" | "kuis" | "zoom" | "game" | "sertifikat";
  timestamp: string;
  statusText: string;
  statusBadge: "green" | "blue" | "purple" | "amber";
  icon: string;
}

// ==========================================
// SUPABASE DATABASE RECORD TYPES
// ==========================================

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
  created_at?: string;
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
}

export type DBAbsen = DBAttendanceLog;

export interface SupportTicket {
  id: string; // e.g. TKT-2026-XXXX
  name: string;
  email: string;
  category: "akun" | "video_pdf" | "zoom" | "kuis" | "sertifikat" | "bug_teknis" | "lainnya";
  priority: "rendah" | "sedang" | "mendesak";
  subject: string;
  description: string;
  status: "Menunggu Peninjauan" | "Diproses Tim IT" | "Terselesaikan";
  createdAt: string;
}

export interface QuizAnswerRecord {
  quizId: number;
  question: string;
  meeting?: string;
  options: string[];
  userAnswerIndex: number;
  userAnswerText: string;
  correctAnswerIndex: number;
  correctAnswerText: string;
  isCorrect: boolean;
  points: number;
  earnedPoints?: number;
  isGraded?: boolean;
  mentorFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  explanation?: string;
  hint?: string;
  type?: "pilihan_ganda" | "essai";
}

export interface QuizSubmission {
  id: string;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  score: number;
  earnedPoints: number;
  totalPossiblePoints: number;
  passed: boolean;
  submittedAt: string;
  quizTitle?: string;
  category?: string;
  answers: QuizAnswerRecord[];
  hasUngradedEssays?: boolean;
}

export interface DBQuizUser {
  id: string;
  user_id?: number;
  user_name: string;
  user_email?: string;
  user_role?: string;
  quiz_title?: string;
  category?: string;
  score: number;
  earned_points: number;
  total_possible_points: number;
  passed: boolean;
  submitted_at: string;
  answers: QuizAnswerRecord[];
  has_ungraded_essays?: boolean;
  created_at?: string;
}

export interface DBGameWord {
  id: number;
  word: string;
  difficulty: "easy" | "medium" | "hard";
}
