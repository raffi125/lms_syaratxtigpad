import type { User, ModuleItem, ZoomData, CertificateItem, QuizSubmission } from "@/types";

export interface PertemuanQuizMetric {
  pertemuanNumber: number;
  title: string;
  topic: string;
  targetDuration: string;
  completedCount: number;
  completionRate: number; // percentage peserta yang telah menyelesaikan kuis
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  remedialCount: number;
  passingRate: number; // percentage lulus KKM (>= 70)
  status: "Tuntas" | "Memenuhi KKM" | "Perlu Evaluasi" | "Selesai" | "Berlangsung" | "Mendatang";
  attendanceRate: number; // Dipertahankan untuk kompatibilitas tipe
}

export type PertemuanMetric = PertemuanQuizMetric;

export interface AnalyticsCalculationResult {
  // 1. Peserta Kuis
  totalPeserta: number;
  activePeserta: number;
  pesertaTrendVsPertemuanLalu: number;

  // 2. Kuis & Nilai (Inti Perhitungan Murni Berbasis Nilai Kuis)
  kkm: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  passedCount: number;
  remedialCount: number;
  passingRate: number; // percentage >= KKM
  remedialRate: number; // percentage < KKM
  scoreTrendVsPertemuanLalu: number;

  // 3. Distribusi Predikat Nilai Kuis
  distribution: {
    gradeA: { count: number; percentage: number; label: string };
    gradeB: { count: number; percentage: number; label: string };
    gradeC: { count: number; percentage: number; label: string };
  };

  // 4. Analitik Nilai Kuis per Pertemuan / Silabus
  totalPertemuan: number;
  avgProgress: number; // Rata-rata kelulusan kuis (%)
  avgPertemuanCompleted: number;
  pertemuanBreakdown: PertemuanQuizMetric[];

  // 5. Presensi / Zoom (Dipertahankan 0 untuk kompatibilitas antarmuka)
  totalZoomSessions: number;
  totalVerifiedLogs: number;
  attendanceRate: number;
  attendanceTrendVsPertemuanLalu: number;

  // 6. Sertifikasi Berbasis Nilai Kuis (Murni Nilai Kuis >= KKM)
  totalEligible: number;
  totalIssued: number;
  pendingIssued: number;
  certificationRate: number;
}

const DEFAULT_TOPICS = [
  { pNum: 1, title: "Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli", topic: "Komunikasi, Inklusi & Budaya Tuli" },
  { pNum: 2, title: "Pertemuan 2: Bahasa Isyarat & Pengenalan Abjad", topic: "Bahasa Isyarat & Pengenalan Abjad" },
  { pNum: 3, title: "Pertemuan 3: Perkenalan & Komunikasi Dasar", topic: "Perkenalan & Komunikasi Dasar" },
  { pNum: 4, title: "Pertemuan 4: Isyarat Keluarga, Rumah & Lingkungan", topic: "Isyarat Keluarga, Rumah & Lingkungan" },
  { pNum: 5, title: "Pertemuan 5: Kata Tanya, Kalimat Tanya & Emosi", topic: "Kata Tanya, Kalimat Tanya & Emosi" },
  { pNum: 6, title: "Pertemuan 6: Penerapan Percakapan & Interaksi Teman Tuli", topic: "Penerapan Percakapan & Evaluasi" },
];

/**
 * Menghitung laporan dan analitik pembelajaran MURNI BERDASARKAN NILAI KUIS SAJA.
 * Evaluasi capaian belajar, kelulusan KKM, dan hak sertifikasi dihitung secara eksklusif dari skor kuis.
 */
export function calculateAnalytics(
  users: User[],
  modules: ModuleItem[] = [],
  zoomData: ZoomData = { activeSession: null, attendanceLogs: [] },
  certificates: CertificateItem[] = [],
  kkmThreshold = 70,
  quizSubmissions: QuizSubmission[] = []
): AnalyticsCalculationResult {
  const pesertaList = users.filter((u) => u.role === "peserta");
  const totalPeserta = pesertaList.length;

  // 1. Peserta metrics
  const activePeserta = pesertaList.filter((u) => u.status === "Aktif").length;
  const pesertaTrendVsPertemuanLalu = 0;

  // 2. Kuis & Nilai metrics (Murni dari skor kuis)
  let avgScore = 0;
  let highestScore = 0;
  let lowestScore = 0;
  let medianScore = 0;
  let passedCount = 0;
  let remedialCount = 0;
  let passingRate = 0;
  let remedialRate = 0;

  // Helper untuk mendapatkan nilai kuis murni peserta (skala 0-100, terpisah total dari poin game)
  const getPesertaQuizScore = (p: User): number => {
    const sub = quizSubmissions.find(
      (s) => s.userId === p.id || s.userName.toLowerCase() === p.name.toLowerCase()
    );
    if (sub && typeof sub.score === "number") {
      return Math.min(100, Math.max(0, sub.score));
    }
    return Math.min(100, Math.max(0, Number(p.score ?? 0)));
  };

  const countA = pesertaList.filter((p) => getPesertaQuizScore(p) >= 85).length;
  const countB = pesertaList.filter((p) => {
    const s = getPesertaQuizScore(p);
    return s >= kkmThreshold && s < 85;
  }).length;
  const countC = pesertaList.filter((p) => getPesertaQuizScore(p) < kkmThreshold).length;

  if (totalPeserta > 0) {
    const scores = pesertaList.map((p) => getPesertaQuizScore(p)).sort((a, b) => a - b);
    const sumScore = scores.reduce((acc, curr) => acc + curr, 0);
    avgScore = +(sumScore / totalPeserta).toFixed(1);
    highestScore = Math.max(...scores);
    lowestScore = Math.min(...scores);

    const mid = Math.floor(scores.length / 2);
    medianScore = scores.length % 2 !== 0 ? scores[mid] : +((scores[mid - 1] + scores[mid]) / 2).toFixed(1);

    passedCount = scores.filter((s) => s >= kkmThreshold).length;
    remedialCount = totalPeserta - passedCount;
    passingRate = +((passedCount / totalPeserta) * 100).toFixed(1);
    remedialRate = +((remedialCount / totalPeserta) * 100).toFixed(1);
  }

  // 3. Distribusi Predikat Nilai Kuis
  const distribution = {
    gradeA: {
      count: countA,
      percentage: totalPeserta > 0 ? +((countA / totalPeserta) * 100).toFixed(1) : 0,
      label: "Grade A (≥85) - Sangat Baik",
    },
    gradeB: {
      count: countB,
      percentage: totalPeserta > 0 ? +((countB / totalPeserta) * 100).toFixed(1) : 0,
      label: `Grade B (${kkmThreshold}–84) - Lulus Memenuhi KKM`,
    },
    gradeC: {
      count: countC,
      percentage: totalPeserta > 0 ? +((countC / totalPeserta) * 100).toFixed(1) : 0,
      label: `Grade C (<${kkmThreshold}) - Perlu Remedial`,
    },
  };

  // 4. Analitik Nilai Kuis per Pertemuan / Topik Kuis
  const meetingsSource = modules.length > 0
    ? modules.map((m, idx) => ({
        pNum: idx + 1,
        title: m.title.toLowerCase().startsWith("pertemuan") ? m.title : `Pertemuan ${idx + 1}: ${m.title}`,
        topic: m.description || m.category || `Materi Pertemuan ${idx + 1}`,
        duration: m.duration || "30 Menit",
      }))
    : DEFAULT_TOPICS.map((t) => ({
        ...t,
        duration: "30 Menit",
      }));

  const totalPertemuan = meetingsSource.length;

  const pertemuanBreakdown: PertemuanQuizMetric[] = meetingsSource.map((m) => {
    const pNum = m.pNum;

    // Filter submission khusus pertemuan ini jika tersedia
    const meetingSubmissions = quizSubmissions.filter((sub) => {
      const matchCat = sub.category && sub.category.toLowerCase().includes(`pertemuan ${pNum}`);
      const matchTitle = sub.quizTitle && sub.quizTitle.toLowerCase().includes(`pertemuan ${pNum}`);
      const matchAns = Array.isArray(sub.answers) && sub.answers.some((a) => (a.meeting || "").toLowerCase().includes(`pertemuan ${pNum}`));
      return matchCat || matchTitle || matchAns;
    });

    let pAvgScore = avgScore;
    let pHighest = highestScore;
    let pLowest = lowestScore;
    let pPassed = passedCount;
    let pRemedial = remedialCount;
    let pPassingRate = passingRate;
    let pCompletedCount = totalPeserta;

    if (meetingSubmissions.length > 0) {
      const mScores = meetingSubmissions.map((s) => s.score).sort((a, b) => a - b);
      const sum = mScores.reduce((acc, cur) => acc + cur, 0);
      pAvgScore = +(sum / mScores.length).toFixed(1);
      pHighest = Math.max(...mScores);
      pLowest = Math.min(...mScores);
      pPassed = mScores.filter((s) => s >= kkmThreshold).length;
      pRemedial = mScores.length - pPassed;
      pPassingRate = +((pPassed / mScores.length) * 100).toFixed(1);
      pCompletedCount = meetingSubmissions.length;
    }

    const completionRate = totalPeserta > 0 ? +((pCompletedCount / totalPeserta) * 100).toFixed(1) : 0;

    let pStatus: PertemuanQuizMetric["status"] = "Memenuhi KKM";
    if (pAvgScore >= 80) {
      pStatus = "Tuntas";
    } else if (pAvgScore >= kkmThreshold) {
      pStatus = "Memenuhi KKM";
    } else {
      pStatus = "Perlu Evaluasi";
    }

    return {
      pertemuanNumber: pNum,
      title: m.title,
      topic: m.topic,
      targetDuration: m.duration,
      completedCount: pCompletedCount,
      completionRate,
      avgScore: pAvgScore,
      highestScore: pHighest,
      lowestScore: pLowest,
      passedCount: pPassed,
      remedialCount: pRemedial,
      passingRate: pPassingRate,
      status: pStatus,
      attendanceRate: pPassingRate,
    };
  });

  const avgProgress = passingRate;
  const avgPertemuanCompleted = totalPertemuan > 0 ? +((passingRate / 100) * totalPertemuan).toFixed(1) : 0;

  // 5. Presensi / Zoom (Diabaikan - Murni Nilai Kuis Saja)
  const totalZoomSessions = 0;
  const totalVerifiedLogs = 0;
  const attendanceRate = 0;
  const attendanceTrendVsPertemuanLalu = 0;

  // 6. Sertifikasi Murni Berdasarkan Nilai Kuis (KKM >= 70)
  // Peserta yang mencapai KKM 70 langsung dinyatakan memenuhi syarat kelulusan resmi
  const eligiblePeserta = pesertaList.filter((p) => getPesertaQuizScore(p) >= kkmThreshold);
  const totalEligible = eligiblePeserta.length;
  const totalIssued = certificates.filter((c) => c.certIssued).length;
  const pendingIssued = Math.max(0, totalEligible - totalIssued);
  const certificationRate = totalEligible > 0 ? +((totalIssued / totalEligible) * 100).toFixed(1) : 0;

  return {
    totalPeserta,
    activePeserta,
    pesertaTrendVsPertemuanLalu: 0,
    kkm: kkmThreshold,
    avgScore,
    highestScore,
    lowestScore,
    medianScore,
    passedCount,
    remedialCount,
    passingRate,
    remedialRate,
    scoreTrendVsPertemuanLalu: 0,
    distribution,
    totalPertemuan,
    avgProgress,
    avgPertemuanCompleted,
    pertemuanBreakdown,
    totalZoomSessions,
    totalVerifiedLogs,
    attendanceRate,
    attendanceTrendVsPertemuanLalu,
    totalEligible,
    totalIssued,
    pendingIssued,
    certificationRate,
  };
}
