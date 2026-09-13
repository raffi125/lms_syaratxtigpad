import { NextRequest, NextResponse } from "next/server";
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { requireSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

// Alias login admin/mentor (harus sinkron dengan src/context/AppContext.tsx)
const ADMIN_ALIASES = new Set(["admin@kolab.id", "admin", "admin-01", "administrator"]);
const MENTOR_ALIASES = new Set(["mentor@kolab.id", "mentor", "mentor-01"]);

// Kata sandi universal: semua role peserta/mentor/admin bisa login dengan ini.
const UNIVERSAL_PASSWORD = "changeme01";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions());
}

function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

// GET /api/auth/session → informasi sesi aktif ({ role, sub, name, isLoggedIn })
export async function GET() {
  const token = (await import("next/headers")).cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ isLoggedIn: false });
  }
  return NextResponse.json({
    isLoggedIn: true,
    role: session.role,
    sub: session.sub,
    name: session.name,
  });
}

// POST /api/auth/session → login. Validasi kredensial dilakukan di SERVER (authoritative),
// bukan dipercaya dari body klien. Mirip alur loginUser di AppContext:
// 1) alias admin (+ password opsional: admin/admin123), 2) alias mentor (mentor/mentor123),
// 3) peserta: cocokkan email/user_id/npm/nama dengan tabel users di database.
export async function POST(req: NextRequest) {
  let body: { query?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Payload tidak valid." }, { status: 400 });
  }

  const query = String(body.query || "").trim().toLowerCase();
  const cleanPass = String(body.password || "").trim();

  if (!query) {
    return NextResponse.json(
      { success: false, message: "Email / User ID tidak boleh kosong!" },
      { status: 400 }
    );
  }

  // 1. Admin
  if (ADMIN_ALIASES.has(query)) {
    if (cleanPass !== "admin" && cleanPass !== "admin123" && cleanPass !== UNIVERSAL_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Kata sandi Administrator salah! Silakan periksa kembali." },
        { status: 401 }
      );
    }
    const token = signSession("admin", "1", "Administrator");
    const res = NextResponse.json({ success: true, role: "admin", name: "Administrator" });
    setSessionCookie(res, token);
    return res;
  }

  // 2. Mentor
  if (MENTOR_ALIASES.has(query)) {
    if (cleanPass !== "mentor" && cleanPass !== "mentor123" && cleanPass !== UNIVERSAL_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Kata sandi Mentor salah! Silakan periksa kembali." },
        { status: 401 }
      );
    }
    const token = signSession("mentor", "2", "Mentor");
    const res = NextResponse.json({ success: true, role: "mentor", name: "Mentor" });
    setSessionCookie(res, token);
    return res;
  }

  // 3. Peserta: verifikasi identitas ke tabel users di database (service role)
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, message: "Database tidak terhubung. Silakan coba lagi nanti." },
      { status: 503 }
    );
  }

  try {
    const admin = requireSupabaseAdmin();
    const q = query.toLowerCase().trim();

    // Kolom password_hash mungkin belum diterapkan di database live (user menerapkan SQL manual).
    // Jika kolom tidak ditemukan → ulangi tanpa kolom tersebut (login permisif, akun lama tetap bisa masuk).
    const isColumnMissing = (err: any): boolean =>
      Boolean(err && (err.code === "42703" || err.code === "PGRST204"));

    let rows: Record<string, unknown>[] | null = null;
    let error: { message: string; code?: string } | null = null;

    const first = await admin
      .from("users")
      .select("id, name, email, user_id, role, status, password_hash")
      .or(`email.ilike.${q},user_id.ilike.${q},name.ilike.${q}`)
      .limit(1);
    rows = first.data as Record<string, unknown>[] | null;
    error = first.error;

    if (error && isColumnMissing(error)) {
      const retry = await admin
        .from("users")
        .select("id, name, email, user_id, role, status")
        .or(`email.ilike.${q},user_id.ilike.${q},name.ilike.${q}`)
        .limit(1);
      rows = retry.data as Record<string, unknown>[] | null;
      error = retry.error;
    }

    if (error) {
      console.warn("Auth peserta lookup error:", error.message);
      return NextResponse.json(
        { success: false, message: "Gagal memverifikasi akun. Silakan coba lagi nanti." },
        { status: 500 }
      );
    }

    const match = rows && rows.length > 0 ? rows[0] : null;
    if (!match) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akun dengan email atau User ID tersebut tidak ditemukan. Silakan periksa kembali atau daftar sebagai peserta baru.",
        },
        { status: 401 }
      );
    }
    if (match.status && String(match.status).toLowerCase() === "nonaktif") {
      return NextResponse.json(
        { success: false, message: "Akun Anda dinonaktifkan. Hubungi administrator." },
        { status: 403 }
      );
    }

    const rawRole = String(match.role || "peserta");
    const role: "admin" | "mentor" | "peserta" =
      rawRole === "admin" || rawRole === "mentor" ? rawRole : "peserta";

    // Admin & mentor dari database login dengan password default sesuai role
    // (sinkron dengan refreshFromSupabase di AppContext: admin/admin, mentor/mentor).
    // Peserta: verifikasi hash HANYA jika password_hash tersimpan; akun lama tanpa
    // hash (NULL) tetap bisa login bebas agar tidak terkunci.
    const storedHash = (match as Record<string, unknown>).password_hash;
    if (role === "admin" || role === "mentor") {
      const allowed = role === "admin" ? ["admin", "admin123"] : ["mentor", "mentor123"];
      if (!allowed.includes(cleanPass) && cleanPass !== UNIVERSAL_PASSWORD) {
        const label = role === "admin" ? "Administrator" : "Mentor";
        return NextResponse.json(
          { success: false, message: `Kata sandi ${label} salah! Silakan periksa kembali.` },
          { status: 401 }
        );
      }
    } else if (storedHash && typeof storedHash === "string" && storedHash.trim() !== "") {
      const ok =
        cleanPass === UNIVERSAL_PASSWORD
          ? true
          : await verifyPassword(cleanPass, storedHash);
      if (!ok) {
        return NextResponse.json(
          { success: false, message: "Kata sandi salah! Silakan periksa kembali." },
          { status: 401 }
        );
      }
    }

    const userId = typeof match.id === "number" ? String(match.id) : String(match.user_id || match.id || q);
    const displayName =
      String(match.name || "") ||
      (role === "admin" ? "Administrator" : role === "mentor" ? "Mentor" : "Peserta");
    const token = signSession(role, userId, displayName);
    const res = NextResponse.json({ success: true, role, name: displayName });
    setSessionCookie(res, token);
    return res;
  } catch (err: any) {
    console.warn("Auth peserta error:", err?.message || err);
    return NextResponse.json(
      { success: false, message: "Layanan autentikasi belum siap (periksa konfigurasi KOLAB_SESSION_SECRET)." },
      { status: 503 }
    );
  }
}

// DELETE /api/auth/session → logout, bersihkan cookie
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}