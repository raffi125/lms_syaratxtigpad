import * as XLSX from "xlsx";
import type { AttendanceItem, ActiveZoomSession } from "@/types";

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
        "Waktu Presensi": log.time || "-",
        "Metode Presensi": log.method || "Kode Sesi & SS Zoom",
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
      { wch: 22 }, // Waktu Presensi
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
