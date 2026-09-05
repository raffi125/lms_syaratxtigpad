import type { User, ModuleItem, ZoomData, CertificateItem } from "@/types";

export interface PertemuanMetric {
  pertemuanNumber: number;
  title: string;
  topic: string;
  targetDuration: string;
  completedCount: number;
  completionRate: number; // percentage
  avgScore: number;
  attendanceRate: number;
  status: "Selesai" | "Berlangsung" | "Mendatang";
}

export interface AnalyticsCalculationResult {
  // 1. Peserta
  totalPeserta: number;
  activePeserta: number;
  pesertaTrendVsPertemuanLalu: number;

  // 2. Kuis & Nilai
  kkm: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  medianScore: number;
  passedCount: number;
  remedialCount: number;
  passingRate: number; // percentage >= KKM
  scoreTrendVsPertemuanLalu: number;

  // 3. Distribusi Nilai
  distribution: {
    gradeA: { count: number; percentage: number; label: string };
    gradeB: { count: number; percentage: number; label: string };
    gradeC: { count: number; percentage: number; label: string };
  };

  // 4. Modul & Pertemuan
  totalPertemuan: number;
  avgProgress: number; // 0 - 100%
  avgPertemuanCompleted: number;
  pertemuanBreakdown: PertemuanMetric[];

  // 5. Presensi / Zoom
  totalZoomSessions: number;
  totalVerifiedLogs: number;
  attendanceRate: number; // percentage
  attendanceTrendVsPertemuanLalu: number;

  // 6. Sertifikasi
  totalEligible: number;
  totalIssued: number;
  pendingIssued: number;
  certificationRate: number;
}

/**
 * Menghitung analitik pembelajaran secara murni berdasarkan data aktual Supabase (Zero Dummy).
 * Seluruh perincian kurikulum diambil langsung dari tabel 'modules'.
 */
export function calculateAnalytics(
  users: User[],
  modules: ModuleItem[],
  zoomData: ZoomData,
  certificates: CertificateItem[],
  kkmThreshold = 70
): AnalyticsCalculationResult {
  const pesertaList = users.filter((u) => u.role === "peserta");
  const totalPeserta = pesertaList.length;
  const totalPertemuan = modules.length;

  // 1. Peserta metrics
  const activePeserta = pesertaList.filter((u) => u.status === "Aktif").length;
  const pesertaTrendVsPertemuanLalu = 0;

  // 2. Kuis & Nilai metrics
  let avgScore = 0;
  let highestScore = 0;
  let lowestScore = 0;
  let medianScore = 0;
  let passedCount = 0;
  let remedialCount = 0;
  let passingRate = 0;

  const countA = pesertaList.filter((p) => p.score >= 85).length;
  const countB = pesertaList.filter((p) => p.score >= kkmThreshold && p.score < 85).length;
  const countC = pesertaList.filter((p) => p.score < kkmThreshold).length;

  if (totalPeserta > 0) {
    const scores = pesertaList.map((p) => p.score).sort((a, b) => a - b);
    const sumScore = scores.reduce((acc, curr) => acc + curr, 0);
    avgScore = +(sumScore / totalPeserta).toFixed(1);
    highestScore = Math.max(...scores);
    lowestScore = Math.min(...scores);

    const mid = Math.floor(scores.length / 2);
    medianScore = scores.length % 2 !== 0 ? scores[mid] : +((scores[mid - 1] + scores[mid]) / 2).toFixed(1);

    passedCount = scores.filter((s) => s >= kkmThreshold).length;
    remedialCount = totalPeserta - passedCount;
    passingRate = +((passedCount / totalPeserta) * 100).toFixed(1);
  }

  const scoreTrendVsPertemuanLalu = 0;

  // 3. Distribusi Nilai
  const distribution = {
    gradeA: {
      count: countA,
      percentage: totalPeserta > 0 ? +((countA / totalPeserta) * 100).toFixed(1) : 0,
      label: "Sangat Baik (≥85)",
    },
    gradeB: {
      count: countB,
      percentage: totalPeserta > 0 ? +((countB / totalPeserta) * 100).toFixed(1) : 0,
      label: `Baik / Lulus (${kkmThreshold}–84)`,
    },
    gradeC: {
      count: countC,
      percentage: totalPeserta > 0 ? +((countC / totalPeserta) * 100).toFixed(1) : 0,
      label: `Perlu Remedial (<${kkmThreshold})`,
    },
  };

  // 4. Modul & Pertemuan Breakdown Murni dari Data Supabase
  const avgProgress =
    totalPeserta > 0
      ? +(pesertaList.reduce((acc, curr) => acc + (curr.progress || 0), 0) / totalPeserta).toFixed(1)
      : 0;

  const avgPertemuanCompleted =
    totalPertemuan > 0 ? +((avgProgress / 100) * totalPertemuan).toFixed(1) : 0;

  const verifiedLogsList = zoomData.attendanceLogs || zoomData.attendance || [];

  const pertemuanBreakdown: PertemuanMetric[] = modules.map((m, idx) => {
    const pNum = idx + 1;
    const requiredProgress = totalPertemuan > 0 ? (pNum / totalPertemuan) * 100 - 5 : 0;
    const completedPeserta = pesertaList.filter((p) => (p.progress ?? 0) >= requiredProgress);
    const completedCount = completedPeserta.length;
    const completionRate = totalPeserta > 0 ? +((completedCount / totalPeserta) * 100).toFixed(1) : 0;

    const avgPertemuanScore =
      completedPeserta.length > 0
        ? +(completedPeserta.reduce((acc, p) => acc + (p.score ?? 0), 0) / completedPeserta.length).toFixed(1)
        : avgScore;

    // Presensi daring pertemuan dari log aktual
    const matchingSession = (zoomData.sessions || []).find(
      (s) =>
        s.id === m.id ||
        s.title?.toLowerCase().includes(`pertemuan ${pNum}`) ||
        (m.title && s.title?.toLowerCase().includes(m.title.toLowerCase()))
    );

    const sessionLogs = matchingSession
      ? verifiedLogsList.filter((l) => l.sessionId === matchingSession.id && l.verified)
      : [];

    const attRate =
      totalPeserta > 0 && sessionLogs.length > 0
        ? Math.min(100, +((sessionLogs.length / totalPeserta) * 100).toFixed(1))
        : 0;

    const status: "Selesai" | "Berlangsung" | "Mendatang" =
      completionRate >= 100
        ? "Selesai"
        : completionRate > 0
        ? "Berlangsung"
        : "Mendatang";

    return {
      pertemuanNumber: pNum,
      title: m.title.toLowerCase().startsWith("pertemuan") ? m.title : `Pertemuan ${pNum}: ${m.title}`,
      topic: m.description || m.category || "Materi Pembelajaran",
      targetDuration: m.duration || "90 Menit",
      completedCount,
      completionRate,
      avgScore: avgPertemuanScore,
      attendanceRate: attRate,
      status,
    };
  });

  // 5. Presensi / Kehadiran Zoom Murni dari Data Supabase
  const totalZoomSessions = (zoomData.sessions || []).length;
  const totalVerifiedLogs = verifiedLogsList.filter((l) => l.verified).length;

  let attendanceRate = 0;
  if (totalPeserta > 0 && totalZoomSessions > 0 && totalVerifiedLogs > 0) {
    const rawRate = (totalVerifiedLogs / (totalPeserta * totalZoomSessions)) * 100;
    attendanceRate = Math.min(100, +rawRate.toFixed(1));
  }

  const attendanceTrendVsPertemuanLalu = 0;

  // 6. Sertifikasi
  const eligiblePeserta = pesertaList.filter((p) => p.score >= kkmThreshold && (p.progress ?? 0) >= 80);
  const totalEligible = eligiblePeserta.length;
  const totalIssued = certificates.filter((c) => c.certIssued).length;
  const pendingIssued = Math.max(0, totalEligible - totalIssued);
  const certificationRate = totalEligible > 0 ? +((totalIssued / totalEligible) * 100).toFixed(1) : 0;

  return {
    totalPeserta,
    activePeserta,
    pesertaTrendVsPertemuanLalu,
    kkm: kkmThreshold,
    avgScore,
    highestScore,
    lowestScore,
    medianScore,
    passedCount,
    remedialCount,
    passingRate,
    scoreTrendVsPertemuanLalu,
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
