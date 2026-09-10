import * as XLSX from "xlsx";
import type { AttendanceItem, ActiveZoomSession, User, CertificateItem } from "@/types";

/**
 * Ekspor data daftar presensi Zoom ke format Microsoft Excel (.xlsx)
 * Dilengkapi informasi sesi, waktu presensi, metode, dan status bukti tangkapan layar (screenshot) Zoom.
 */
export function exportAttendanceToExcel(
  attendanceLogs: AttendanceItem[],
  sessions: ActiveZoomSession[] = [],
  sessionTitle?: string,
  fileNamePrefix: string = "Rekap_Presensi_Zoom"
): boolean {
  try {
    if (!attendanceLogs || attendanceLogs.length === 0) {
      alert("Tidak ada data presensi untuk diekspor ke Excel.");
      return false;
    }

    const rows = attendanceLogs.map((log, index) => {
      // Cari sesi jika ada relasi session_id
      const session = sessions.find(
        (s) => s.id === (log.sessionId || log.session_id)
      );
      const sessionName =
        session?.title || sessionTitle || "Sesi Tatap Muka Zoom BISINDO";

      const hasProof = Boolean(log.proof_url || log.proofUrl);
      let proofStatus = "Tidak Ada";
      let proofLink = "-";

      if (hasProof) {
        const url = (log.proof_url || log.proofUrl || "").trim();
        proofStatus = "Ada (SS Terlampir)";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          proofLink = url;
        } else if (url.startsWith("data:image")) {
          proofLink = "Tersimpan Langsung (Format Gambar Digital)";
        } else {
          proofLink = url || "Terlampir";
        }
      }

      return {
        "No": index + 1,
        "Nama Peserta": log.name || "-",
        "User ID / NPM": log.user_id || log.npm || "-",
        "Instansi / Lembaga": log.institution || "-",
        "Sesi Zoom": sessionName,
        "Tanggal Presensi": log.date || "",
        "Waktu Presensi": (log.time || "").replace(/^Hari ini\s*[•,]\s*/i, ""),
        "Metode Presensi": log.method || "Presensi Mandiri",
        "Status": log.verified ? "Hadir (Terverifikasi)" : "Belum Hadir",
        "Bukti SS Zoom": proofStatus,
        "Tautan / Keterangan Bukti SS": proofLink,
      };
    });

    // Buat worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Atur lebar kolom (column widths) agar rapi saat dibuka di Excel
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 28 }, // Nama Peserta
      { wch: 18 }, // User ID / NPM
      { wch: 28 }, // Instansi
      { wch: 32 }, // Sesi Zoom
      { wch: 16 }, // Tanggal Presensi
      { wch: 18 }, // Waktu Presensi
      { wch: 25 }, // Metode Presensi
      { wch: 22 }, // Status
      { wch: 20 }, // Bukti SS Zoom
      { wch: 45 }, // Tautan Bukti SS
    ];

    // Buat workbook dan lampirkan sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Presensi");

    // Tanggal hari ini untuk penamaan file
    const today = new Date().toISOString().split("T")[0];
    const safeTitle = sessionTitle
      ? `_${sessionTitle.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}`
      : "";
    const fileName = `${fileNamePrefix}${safeTitle}_${today}.xlsx`;

    // Download file Excel menggunakan Blob agar kompatibel di semua browser
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    if (typeof window !== "undefined") {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }

    return true;
  } catch (error) {
    console.error("Gagal mengekspor presensi ke Excel:", error);
    alert("Terjadi kesalahan saat memproses ekspor file Excel.");
    return false;
  }
}

/**
 * Ekspor data laporan dan analitik nilai kuis peserta ke format Microsoft Excel (.xlsx)
 * Menampilkan data peserta, nilai kuis, predikat grade, status kelulusan KKM, dan status sertifikasi.
 */
export function exportQuizReportToExcel(
  pesertaList: User[],
  kkmThreshold: number = 70,
  certificates: CertificateItem[] = [],
  fileNamePrefix: string = "Laporan_Nilai_Kuis"
): boolean {
  try {
    if (!pesertaList || pesertaList.length === 0) {
      alert("Tidak ada data nilai kuis peserta untuk diekspor ke Excel.");
      return false;
    }

    const rows = pesertaList.map((p, index) => {
      const cert = certificates.find(
        (c) =>
          c.id === p.id ||
          c.name.toLowerCase() === p.name.toLowerCase() ||
          (c.user_id && (c.user_id === p.user_id || c.user_id === p.npm))
      );

      const score = p.score ?? 0;
      const isPassed = score >= kkmThreshold;
      let gradeLabel = `Grade C (<${kkmThreshold}) - Remedial`;
      if (score >= 85) {
        gradeLabel = "Grade A (≥85) - Sangat Baik";
      } else if (score >= kkmThreshold) {
        gradeLabel = `Grade B (${kkmThreshold}–84) - Lulus Memenuhi`;
      }

      let certStatus = "Belum Memenuhi Syarat KKM";
      if (cert?.certIssued) {
        certStatus = "Sertifikat Terbit";
      } else if (isPassed) {
        certStatus = "Memenuhi Syarat Kuis (Siap Terbit)";
      }

      return {
        "No": index + 1,
        "Nama Peserta": p.name || "-",
        "User ID / NPM": p.user_id || p.npm || "-",
        "Email": p.email || "-",
        "Instansi / Lembaga": p.institution || "-",
        "Nilai Kuis (Skor)": score,
        "Predikat Grade": gradeLabel,
        "Status Kelulusan": isPassed ? "LULUS KKM" : "REMEDIAL",
        "Standar KKM": kkmThreshold,
        "Status Sertifikat": certStatus,
        "Keterangan Evaluasi": isPassed ? "Tuntas Evaluasi Kuis" : "Menunggu Ujian Remedial",
      };
    });

    // Buat worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Atur lebar kolom
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 28 }, // Nama Peserta
      { wch: 18 }, // User ID / NPM
      { wch: 26 }, // Email
      { wch: 28 }, // Instansi
      { wch: 18 }, // Nilai Kuis (Skor)
      { wch: 32 }, // Predikat Grade
      { wch: 20 }, // Status Kelulusan
      { wch: 14 }, // Standar KKM
      { wch: 32 }, // Status Sertifikat
      { wch: 26 }, // Keterangan Evaluasi
    ];

    // Buat workbook dan lampirkan sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Nilai Kuis");

    const today = new Date().toISOString().split("T")[0];
    const fileName = `${fileNamePrefix}_${today}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    if (typeof window !== "undefined") {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }

    return true;
  } catch (error) {
    console.error("Gagal mengekspor laporan nilai kuis ke Excel:", error);
    alert("Terjadi kesalahan saat memproses ekspor file Excel nilai kuis.");
    return false;
  }
}
