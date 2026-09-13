import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// =============================================================================
// GANTI KATA SANDI PESERTA (/api/auth/password)
// -----------------------------------------------------------------------------
// Peserta mengganti kata sandi akunnya sendiri dari halaman Profil.
//  - Sesi HttpOnly wajib (peserta). Hanya baris milik sesi yang boleh diubah.
//  - Jika password_hash tersimpan → verifikasi password saat ini.
//  - Jika password_hash NULL (akun lama / belum punya sandi) → boleh langsung
//    menetapkan sandi baru tanpa password saat ini (tidak mengunci peserta).
// Dikhususkan langsung via service_role karena kolom password_hash TIDAK
// termasuk whitelist peserta pada gateway /api/db.
// =============================================================================

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session || session.role !== "peserta") {
    return NextResponse.json(
      { success: false, message: "Sesi tidak valid. Silakan masuk kembali." },
      { status: 401 }
    );
  }

  let body: { currentPassword?: string; newPassword?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Payload tidak valid." },
      { status: 400 }
    );
  }

  const currentPassword = String(body.currentPassword || "").trim();
  const newPassword = String(body.newPassword || "").trim();

  if (newPassword.length < 6) {
    return NextResponse.json(
      { success: false, message: "Kata sandi baru minimal 6 karakter." },
      { status: 400 }
    );
  }
  if (currentPassword && currentPassword === newPassword) {
    return NextResponse.json(
      { success: false, message: "Kata sandi baru tidak boleh sama dengan kata sandi saat ini." },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, message: "Database tidak terhubung." },
      { status: 503 }
    );
  }

  try {
    const admin = requireSupabaseAdmin();
    const subId = Number(session.sub);

    // Kolom password_hash mungkin belum diterapkan di database live (SQL manual belum dijalankan).
    // Jika kolom tidak ditemukan → ulangi tanpa kolom tersebut; langkah update di bawah akan
    // memberi pesan ramah agar admin menjalankan SQL terbaru.
    const isColumnMissing = (err: any): boolean =>
      Boolean(err && (err.code === "42703" || err.code === "PGRST204"));

    let data: Record<string, unknown>[] | null = null;
    let error: { message: string; code?: string } | null = null;

    const first = await admin
      .from("users")
      .select("id, password_hash")
      .eq("id", subId)
      .limit(1);
    data = first.data as Record<string, unknown>[] | null;
    error = first.error;

    if (error && isColumnMissing(error)) {
      const retry = await admin.from("users").select("id").eq("id", subId).limit(1);
      data = retry.data as Record<string, unknown>[] | null;
      error = retry.error;
    }

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: "Akun peserta tidak ditemukan di database." },
        { status: 404 }
      );
    }

    const storedHash = (data[0] as Record<string, unknown>).password_hash as string | null | undefined;
    if (storedHash && typeof storedHash === "string" && storedHash.trim() !== "") {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Masukkan kata sandi saat ini." },
          { status: 400 }
        );
      }
      const ok = await verifyPassword(currentPassword, storedHash);
      if (!ok) {
        return NextResponse.json(
          { success: false, message: "Kata sandi saat ini salah!" },
          { status: 401 }
        );
      }
    }

    const newHash = await hashPassword(newPassword);
    const { error: updErr } = await admin
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", subId);

    if (updErr) {
      console.warn("Ganti kata sandi error:", updErr.message);
      return NextResponse.json(
        {
          success: false,
          message:
            "Kolom password_hash belum tersedia di database. Jalankan skrip SQL terbaru (schema.sql / supabase_schema.sql).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Kata sandi berhasil diperbarui!" });
  } catch (err: any) {
    console.warn("Ganti kata sandi server error:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Layanan autentikasi belum siap (periksa konfigurasi KOLAB_SESSION_SECRET)." },
      { status: 503 }
    );
  }
}