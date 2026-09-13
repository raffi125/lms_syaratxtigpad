import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { requireSupabaseAdmin } from "@/lib/supabase";

// =============================================================================
// GATEWAY MUTASI DATABASE (/api/db)
// -----------------------------------------------------------------------------
// Semua operasi tulis (insert/update/delete/upsert) dari browser WAJIB lewat
// endpoint ini. Browser TIDAK PERNAH memegang kunci tulis database:
//  - RLS pada semua tabel = read-only untuk anon key (lihat schema.sql).
//  - Gateway hanya menjalankan mutasi jika ada sesi login valid (HttpOnly cookie)
//    DAN peran (admin/mentor/peserta) diizinkan untuk tabel+operasi+kolom tsb.
//  - Eksekusi memakai klien Supabase service_role (requireSupabaseAdmin).
// =============================================================================

type Role = "admin" | "mentor" | "peserta";
type SessionRole = Role | "anonymous";
type Op = "insert" | "update" | "delete" | "upsert";
type Cols = string[] | "*";

const TABLES = [
  "users",
  "modules",
  "quizzes",
  "certificates",
  "zoom_sessions",
  "game_words",
  "absen",
  "quizzes_user",
] as const;
type TableName = (typeof TABLES)[number];

// Kolom-kolom yang sah untuk ditulis per tabel (union semua peran).
const COLUMNS: Record<TableName, string[]> = {
  users: ["name", "email", "user_id", "role", "status", "institution", "score", "progress", "avatar_url"],
  modules: ["title", "category", "description", "duration", "date", "time", "video_url", "pdf_url"],
  quizzes: ["question", "options", "correct_answer", "explanation"],
  certificates: ["user_id", "user_id_code", "name", "score", "progress", "cert_issued", "cert_file_name", "cert_file_url", "issue_date"],
  zoom_sessions: ["title", "meeting_id", "passcode", "host", "date", "time", "zoom_url", "presence_code", "status", "attendees", "desc"],
  game_words: ["word", "difficulty"],
  absen: ["user_id", "session_id", "name", "user_id_code", "institution", "date", "time", "method", "status", "verified", "proof_url"],
  quizzes_user: [
    "user_id", "user_name", "user_email", "user_role", "quiz_title", "category",
    "score", "earned_points", "total_possible_points", "passed", "submitted_at", "answers", "has_ungraded_essays",
  ],
};

// Matriks izin per peran. `cols: "*"` = seluruh kolom; `delete: true` = boleh hapus.
interface TableRule {
  insert?: Cols;
  upsert?: Cols;
  update?: Cols;
  delete?: boolean;
  matchSelf?: boolean; // peserta hanya boleh mengubah baris miliknya sendiri (match.id === sesi.sub)
}
type Matrix = Record<Role, Partial<Record<TableName, TableRule | undefined>>>;

const MATRIX: Matrix = {
  admin: {
    users: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    modules: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    quizzes: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    certificates: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    zoom_sessions: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    game_words: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    absen: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
    quizzes_user: { insert: "*", upsert: "*", update: "*", delete: true, matchSelf: false },
  },
  mentor: {
    // Mentor mengelola modul pembelajaran, bank soal, sesi Zoom, kata game,
    // penerbitan sertifikat, verifikasi presensi, dan penilaian kuis.
    users: { update: ["score", "progress", "status", "institution", "avatar_url"] },
    modules: { insert: "*", update: "*", delete: true },
    quizzes: { insert: "*", update: "*", delete: true },
    certificates: { insert: "*", update: "*", delete: true },
    zoom_sessions: { insert: "*", update: "*", delete: true },
    game_words: { insert: "*", update: "*", delete: true },
    absen: { insert: "*", update: "*", delete: true },
    quizzes_user: { insert: "*", upsert: "*", update: "*", delete: true },
  },
  peserta: {
    // Peserta: presensi mandiri, submit hasil kuis, dan perbarui data profil/progres sendiri.
    // CATATAN KEAMANAN: peserta hanya dapat mengubah BARIS miliknya (match.id === sesi.sub, matchSelf)
    // dan TIDAK dapat mengubah role/status (kolom identitas + otoritas tetap milik admin/mentor).
    users: {
      update: ["name", "email", "user_id", "institution", "avatar_url", "score", "progress"],
      matchSelf: true,
    },
    absen: {
      insert: ["name", "user_id_code", "institution", "date", "time", "method", "status", "proof_url", "session_id", "user_id"],
      delete: true, // hanya baris milik sendiri (dipaksa di bawah)
    },
    quizzes_user: { insert: "*", upsert: "*" },
  },
};

type Payload = Record<string, unknown>;
type PayloadOrRows = Payload | Payload[];

interface DbRequest {
  table?: string;
  op?: Op;
  payload?: PayloadOrRows;
  match?: Record<string, string | number>;
  ilike?: Record<string, string>;
  matchAny?: Array<Record<string, string | number>>;
  neq?: Record<string, string | number>;
  select?: "single" | "rows" | false;
}

function isPayloadArray(payload: PayloadOrRows | undefined): payload is Payload[] {
  return Array.isArray(payload) && payload.length > 0;
}

function stripToColumns(payload: Payload, cols: string[] | "*"): Payload {
  if (cols === "*") return { ...payload };
  const out: Payload = {};
  for (const [k, v] of Object.entries(payload)) {
    if (cols.includes(k)) out[k] = v;
  }
  return out;
}

// Kolom password_hash mungkin belum diterapkan di database live (user menerapkan SQL manual).
// Deteksi error "column does not exist" agar operasi tetap berjalan tanpa kolom tersebut.
function isColumnMissing(error: any): boolean {
  return Boolean(error && (error.code === "42703" || error.code === "PGRST204"));
}

function parseSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}

// Bersihkan nilai filter agar aman disisipkan ke string filter PostgREST (.or()).
function sanitizeFilterValue(value: string | number): string {
  const raw = String(value).replace(/[^\w@.\-+() ]/g, "").trim();
  return raw.length > 200 ? raw.slice(0, 200) : raw;
}

function forbidden(message: string) {
  return NextResponse.json(
    { data: null, error: { code: "42501", message, perms: "denied" } },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  let body: DbRequest = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "400", message: "Payload tidak valid." } },
      { status: 400 }
    );
  }

  const table = (body.table || "").toLowerCase() as TableName;
  const op = body.op;
  const payload = body.payload;

  if (!TABLES.includes(table)) {
    return forbidden(`Tabel '${body.table}' tidak diizinkan untuk mutasi.`);
  }
  if (!op || !["insert", "update", "delete", "upsert"].includes(op)) {
    return forbidden(`Operasi '${String(op)}' tidak valid.`);
  }
  if ((op === "insert" || op === "upsert" || op === "update") && (!payload || (Array.isArray(payload) && payload.length === 0))) {
    return forbidden(`Payload kosong untuk operasi ${op}.`);
  }

  const session = parseSession(req);
  const role: SessionRole = session ? session.role : "anonymous";

  const rule: TableRule | undefined =
    role === "anonymous"
      ? undefined
      : (MATRIX as Record<string, Record<TableName, TableRule | undefined>>)[role]?.[table];

  // ---- Tanpa sesi: HANYA pendaftaran peserta baru + sertifikat awalnya. ----
  if (!session) {
    const single = isPayloadArray(payload) ? payload[0] : (payload as Payload | undefined);
    if (table === "users" && op === "insert") {
      const safe = stripToColumns(single || {}, ["name", "email", "user_id", "institution"]);
      if (!safe.name || !safe.email) {
        return forbidden("Pendaftaran membutuhkan nama dan email.");
      }
      const row: Record<string, unknown> = { ...safe, role: "peserta", status: "Aktif", score: 0, progress: 0 };
      const pwd = (single as Payload | undefined)?.password;
      if (typeof pwd === "string" && pwd.trim() !== "") {
        if (pwd.trim().length < 6) {
          return forbidden("Kata sandi minimal 6 karakter.");
        }
        row.password_hash = await hashPassword(pwd.trim());
      }
      try {
        const admin = requireSupabaseAdmin();
        let { data, error } = await admin.from("users").insert([row]).select().single();
        // Kolom password_hash belum ada → coba sekali tanpa kolom tersebut (pendaftaran tetap berhasil).
        if (error && isColumnMissing(error) && row.password_hash !== undefined) {
          delete row.password_hash;
          const retry = await admin.from("users").insert([row]).select().single();
          data = retry.data;
          error = retry.error;
        }
        if (error) return NextResponse.json({ data: null, error }, { status: 200 });
        if (data && typeof data === "object") {
          delete (data as Record<string, unknown>).password_hash;
        }
        return NextResponse.json({ data, error: null });
      } catch (err: any) {
        return NextResponse.json(
          { data: null, error: { code: "500", message: err?.message || "Gagal menyimpan pendaftaran." } },
          { status: 500 }
        );
      }
    }
    if (table === "certificates" && op === "insert") {
      const safe = stripToColumns(single || {}, [
        "user_id", "name", "user_id_code", "score", "progress",
        "cert_issued", "cert_file_name", "issue_date",
      ]);
      if (!safe.user_id) {
        return forbidden("Pendaftaran sertifikat membutuhkan user_id.");
      }
      const row = {
        ...safe,
        cert_issued: false,
        cert_file_name: safe.cert_file_name || "",
        issue_date: safe.issue_date || "-",
        score: (single as Payload)?.score ?? 0,
        progress: (single as Payload)?.progress ?? 0,
      };
      try {
        const admin = requireSupabaseAdmin();
        const { data, error } = await admin.from("certificates").insert([row]).select().single();
        if (error) return NextResponse.json({ data: null, error }, { status: 200 });
        return NextResponse.json({ data, error: null });
      } catch (err: any) {
        return NextResponse.json(
          { data: null, error: { code: "500", message: err?.message || "Gagal menyimpan sertifikat." } },
          { status: 500 }
        );
      }
    }
    return forbidden("Sesi login diperlukan untuk operasi ini.");
  }

  // ---- Sesi ada: periksa izin peran. ----
  if (!rule) {
    return forbidden(`Peran '${role}' tidak diizinkan mengubah tabel '${table}'.`);
  }

  const isDelete = op === "delete";
  const allowedCols: Cols | undefined = isDelete ? undefined : rule[op];
  if (!isDelete && allowedCols === undefined) {
    return forbidden(`Peran '${role}' tidak boleh melakukan ${op} pada tabel '${table}'.`);
  }
  if (isDelete && rule.delete !== true) {
    return forbidden(`Peran '${role}' tidak boleh menghapus data pada tabel '${table}'.`);
  }

  // ---- Khusus tabel users: hash kata sandi di server, tolak hash mentah. ----
  if (table === "users" && !isDelete && payload) {
    const rows = isPayloadArray(payload) ? payload : ([payload] as Payload[]);
    for (const r of rows) {
      delete r.password_hash; // klien tidak pernah menulis hash langsung
      const pwd = r.password;
      if (typeof pwd === "string" && pwd.trim() !== "") {
        if (pwd.trim().length < 6) {
          return forbidden("Kata sandi minimal 6 karakter.");
        }
        r.password_hash = await hashPassword(pwd.trim());
      }
      delete r.password;
    }
  }

  let safe: PayloadOrRows;
  if (isDelete) {
    safe = {} as Payload;
  } else if (isPayloadArray(payload)) {
    const rows = payload.map((r) => stripToColumns(r, allowedCols as Cols)).filter((r) => Object.keys(r).length > 0);
    if (rows.length === 0) return forbidden("Tidak ada baris dengan kolom yang diizinkan.");
    safe = rows;
  } else {
    safe = stripToColumns(payload as Payload, allowedCols as Cols);
    if (Object.keys(safe).length === 0) {
      return forbidden("Tidak ada kolom yang diizinkan untuk ditulis.");
    }
  }

  // ---- Batasan tambahan khusus peserta (hanya baris tunggal). ----
  if (role === "peserta") {
    if (isPayloadArray(safe)) {
      return forbidden("Peserta tidak dapat menulis data dalam batch.");
    }
    const subId = Number(session.sub);
    if (table === "users" && op === "update" && rule.matchSelf) {
      const matchId = Number((body.match || {}).id);
      if (!subId || !matchId || subId !== matchId) {
        return forbidden("Hanya dapat memperbarui data akun sendiri.");
      }
    }
    if (table === "absen" && op === "insert") {
      // Kunci presensi ke akun sesi yang sedang login (bukan user_id sembarang).
      if (subId) safe.user_id = subId;
      safe.verified = true;
    }
    if (table === "absen" && op === "delete") {
      // Batasi penghapusan hanya baris milik sendiri; tolak filter massal (matchAny/neq).
      if (!subId) return forbidden("Sesi peserta tidak valid untuk membatalkan presensi.");
      const match = (body.match || {}) as Record<string, string | number>;
      match.user_id = subId;
      body.match = match;
      delete body.matchAny;
      delete body.neq;
      delete body.ilike;
    }
    if (table === "quizzes_user" && (op === "insert" || op === "upsert")) {
      if (subId) {
        safe.user_id = subId;
        safe.user_role = "peserta";
      }
    }
  }

  // ---- Eksekusi lewat service_role. ----
  try {
    const admin = requireSupabaseAdmin();
    const selectOpt = body.select || false;

    const buildQuery = (payload: PayloadOrRows) => {
      const rowList = isPayloadArray(payload) ? payload : [payload];
      let q: any;
      if (op === "insert") {
        q = admin.from(table).insert(rowList);
        if (selectOpt === "single") q = q.select().single();
        else if (selectOpt === "rows") q = q.select();
      } else if (op === "upsert") {
        q = admin.from(table).upsert(rowList);
        if (selectOpt === "single") q = q.select().single();
        else if (selectOpt === "rows") q = q.select();
      } else if (op === "update") {
        q = admin.from(table).update(payload as Payload);
        for (const [k, v] of Object.entries(body.match || {})) q = q.eq(k, v);
        for (const [k, v] of Object.entries(body.ilike || {})) q = q.ilike(k, sanitizeFilterValue(v));
        for (const [k, v] of Object.entries(body.neq || {})) q = q.neq(k, v);
        for (const group of body.matchAny || []) q = q.or(
          Object.entries(group).map(([k, v]) => `${k}.eq.${sanitizeFilterValue(v)}`).join(",")
        );
      } else {
        q = admin.from(table).delete();
        for (const [k, v] of Object.entries(body.match || {})) q = q.eq(k, v);
        for (const [k, v] of Object.entries(body.neq || {})) q = q.neq(k, v);
        for (const group of body.matchAny || []) q = q.or(
          Object.entries(group).map(([k, v]) => `${k}.eq.${sanitizeFilterValue(v)}`).join(",")
        );
      }
      return q;
    };

    let res = await buildQuery(safe);
    // Kolom password_hash mungkin belum diterapkan di database live (user menerapkan SQL manual):
    // coba sekali lagi tanpa kolom tersebut agar operasi lain tetap berjalan normal.
    if (res.error && table === "users" && op !== "delete" && isColumnMissing(res.error)) {
      const withoutHash = (p: Payload) => {
        const c = { ...p };
        delete c.password_hash;
        return c;
      };
      const stripped: PayloadOrRows = isPayloadArray(safe) ? safe.map(withoutHash) : withoutHash(safe);
      res = await buildQuery(stripped);
    }
    // Jangan pernah membocorkan hash kata sandi ke browser.
    if (table === "users" && res.data) {
      const resRows = Array.isArray(res.data) ? res.data : [res.data];
      for (const r of resRows) delete (r as Record<string, unknown>).password_hash;
    }
    return NextResponse.json({ data: res.data, error: res.error });
  } catch (err: any) {
    console.error(`Gateway mutasi ${table}.${op} error:`, err?.message || err);
    return NextResponse.json(
      { data: null, error: { code: "500", message: err?.message || "Gagal menjalankan operasi database." } },
      { status: 500 }
    );
  }
}