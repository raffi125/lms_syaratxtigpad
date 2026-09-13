import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/session";
import type { SupportTicket } from "@/types";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/tickets.json";

// Nilai valid SINKRON dengan tipe SupportTicket (src/types/index.ts)
const VALID_CATEGORIES = new Set(["akun", "video_pdf", "zoom", "kuis", "sertifikat", "bug_teknis", "lainnya"]);
const VALID_PRIORITIES = new Set(["rendah", "sedang", "mendesak"]);
const VALID_STATUSES = new Set(["Menunggu Peninjauan", "Diproses Tim IT", "Terselesaikan"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DESTINATION = {
  team: "Tim IT SYARAT x TIGPAD",
  email: "it-support@kolab.id",
  sla: "Maks. 1x24 Jam Kerja",
};

// Seed display-only, hanya untuk jalur fallback (DB tidak dikonfigurasi / tabel belum dibuat)
const INITIAL_DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: "TKT-IT-2026-1001",
    name: "Sistem Helpdesk IT",
    email: "it-support@kolab.id",
    category: "bug_teknis",
    priority: "sedang",
    subject: "Portal Antrean Tiket IT Aktif",
    description: "Sistem tiket terhubung langsung ke antrean helpdesk teknis Tim IT SYARAT x TIGPAD.",
    status: "Terselesaikan",
    createdAt: "Hari ini • Sistem",
  },
];

interface DbTicketRow {
  id: string;
  name: string;
  email: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  created_at: string | null;
}

const isTableMissing = (error: any): boolean =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        (typeof error.message === "string" &&
          (error.message.includes("does not exist") || error.message.includes("in the schema cache"))))
  );

function rowToTicket(row: DbTicketRow): SupportTicket {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    category: (VALID_CATEGORIES.has(row.category) ? row.category : "lainnya") as SupportTicket["category"],
    priority: (VALID_PRIORITIES.has(row.priority) ? row.priority : "sedang") as SupportTicket["priority"],
    subject: row.subject,
    description: row.description,
    status: (VALID_STATUSES.has(row.status) ? row.status : "Menunggu Peninjauan") as SupportTicket["status"],
    createdAt: row.created_at || "Hari ini",
  };
}

// ---- Fallback: Supabase Storage (dipakai saat tabel belum dibuat / DB tidak dikonfigurasi) ----

async function loadFromStorage(): Promise<{ tickets: SupportTicket[]; fromFile: boolean }> {
  if (!isSupabaseConfigured()) return { tickets: [...INITIAL_DEFAULT_TICKETS], fromFile: false };

  try {
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).download(STORAGE_PATH);
    if (error || !data) return { tickets: [...INITIAL_DEFAULT_TICKETS], fromFile: false };

    const parsed = JSON.parse(await data.text());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { tickets: parsed, fromFile: true };
    }
    return { tickets: [...INITIAL_DEFAULT_TICKETS], fromFile: false };
  } catch (err) {
    console.warn("[tickets] Failed to load from Supabase Storage:", err);
    return { tickets: [...INITIAL_DEFAULT_TICKETS], fromFile: false };
  }
}

async function saveToStorage(list: SupportTicket[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(
      STORAGE_PATH,
      Buffer.from(JSON.stringify(list, null, 2), "utf-8"),
      { contentType: "application/json", upsert: true }
    );
    if (error) {
      console.error("[tickets] Save to Supabase Storage error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[tickets] Save to Supabase Storage error:", err);
    return false;
  }
}

// ---- Sumber utama: tabel support_tickets (DB-first) ----

async function loadTicketsFromDb(): Promise<SupportTicket[] | null> {
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select("*")
    .order("created_at_ts", { ascending: false });

  if (error) {
    if (isTableMissing(error)) return null;
    throw new Error(error.message || "Gagal membaca tabel support_tickets.");
  }
  return ((data || []) as DbTicketRow[]).map(rowToTicket);
}

async function migrateStorageToDb(list: SupportTicket[]): Promise<void> {
  // Migrasi satu kali: salin storage → DB. File storage TIDAK dihapus ("jangan hapus itu").
  const rows = list.map((t, i) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    category: t.category,
    priority: t.priority,
    subject: t.subject,
    description: t.description,
    status: t.status,
    created_at: t.createdAt,
    created_at_ts: new Date(Date.now() - i * 60000).toISOString(),
  }));
  const { error } = await supabaseAdmin.from("support_tickets").upsert(rows);
  if (error) throw new Error(error.message || "Gagal migrasi tiket ke tabel support_tickets.");
}

async function loadTickets(): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured()) {
    const storage = await loadFromStorage();
    return storage.tickets;
  }

  const fromDb = await loadTicketsFromDb();
  if (fromDb === null) {
    // Tabel belum dibuat → fallback ke storage (perilaku lama tetap tersedia)
    const storage = await loadFromStorage();
    return storage.tickets;
  }

  if (fromDb.length > 0) return fromDb;

  // Tabel ada tapi kosong → migrasi satu kali dari storage (hanya data asli file, bukan seed)
  const storage = await loadFromStorage();
  if (storage.fromFile && storage.tickets.length > 0) {
    await migrateStorageToDb(storage.tickets);
    return (await loadTicketsFromDb()) ?? [];
  }
  return [];
}

// ---- Handler ----

export async function GET() {
  try {
    const tickets = await loadTickets();
    return NextResponse.json({
      success: true,
      data: tickets,
      total: tickets.length,
      destination: DESTINATION,
    });
  } catch (error: any) {
    console.error("[API /api/tickets GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data tiket." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, category, priority, subject, description } = body;

    if (!name || !email || !subject || !description) {
      return NextResponse.json({ success: false, message: "Semua kolom wajib diisi!" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ success: false, message: "Format email tidak valid!" }, { status: 400 });
    }

    const cleanCategory = (VALID_CATEGORIES.has(category) ? category : "bug_teknis") as SupportTicket["category"];
    const cleanPriority = (VALID_PRIORITIES.has(priority) ? priority : "sedang") as SupportTicket["priority"];

    const now = new Date();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-IT-${now.getFullYear()}-${randomSuffix}${randomNum}`;

    const formattedDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newTicket: SupportTicket = {
      id: ticketId,
      name: String(name).trim().slice(0, 100),
      email: cleanEmail.slice(0, 120),
      category: cleanCategory,
      priority: cleanPriority,
      subject: String(subject).trim().slice(0, 200),
      description: String(description).trim().slice(0, 2000),
      status: "Menunggu Peninjauan",
      createdAt: `${formattedDate} WIB`,
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin.from("support_tickets").insert({
        id: newTicket.id,
        name: newTicket.name,
        email: newTicket.email,
        category: newTicket.category,
        priority: newTicket.priority,
        subject: newTicket.subject,
        description: newTicket.description,
        status: newTicket.status,
        created_at: newTicket.createdAt,
      });

      if (error && !isTableMissing(error)) {
        return NextResponse.json(
          { success: false, message: error.message || "Gagal menyimpan tiket ke database." },
          { status: 500 }
        );
      }
      if (!error) {
        console.log(`[IT HELPDESK] Tiket Diterima: ${newTicket.id} | Pelapor: ${newTicket.name} (${newTicket.email}) | Kategori: ${newTicket.category} | Subjek: "${newTicket.subject}"`);
        return NextResponse.json({
          success: true,
          message: "Tiket berhasil dikirim ke antrean Tim IT!",
          ticket: newTicket,
          destination: { team: DESTINATION.team, email: DESTINATION.email },
        });
      }
      // error = tabel belum ada → jatuh ke fallback storage di bawah
    }

    const storage = await loadFromStorage();
    await saveToStorage([newTicket, ...storage.tickets.filter((t) => t.id !== newTicket.id)]);

    console.log(`[IT HELPDESK] Tiket Diterima: ${newTicket.id} | Pelapor: ${newTicket.name} (${newTicket.email}) | Kategori: ${newTicket.category} | Subjek: "${newTicket.subject}"`);
    return NextResponse.json({
      success: true,
      message: "Tiket berhasil dikirim ke antrean Tim IT!",
      ticket: newTicket,
      destination: { team: DESTINATION.team, email: DESTINATION.email },
    });
  } catch (error: any) {
    console.error("[API /api/tickets POST Error]:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server saat memproses tiket." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session = null;
    if (token) {
      try {
        session = verifySession(token);
      } catch {
        session = null;
      }
    }
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Hanya Admin yang dapat memperbarui status tiket." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Parameter id dan status wajib disertakan!" },
        { status: 400 }
      );
    }
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, message: `Status '${status}' tidak valid.` }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (!error) {
        if (data) {
          return NextResponse.json({
            success: true,
            message: `Status tiket ${id} berhasil diperbarui menjadi "${status}".`,
            ticket: rowToTicket(data as DbTicketRow),
          });
        }
        return NextResponse.json({ success: false, message: `Tiket dengan ID ${id} tidak ditemukan.` }, { status: 404 });
      }
      if (!isTableMissing(error)) {
        return NextResponse.json(
          { success: false, message: error.message || "Gagal memperbarui status tiket." },
          { status: 500 }
        );
      }
      // tabel belum ada → fallback storage
    }

    const storage = await loadFromStorage();
    const found = storage.tickets.find((t) => t.id === id);
    if (!found) {
      return NextResponse.json({ success: false, message: `Tiket dengan ID ${id} tidak ditemukan.` }, { status: 404 });
    }
    await saveToStorage(storage.tickets.map((t) => (t.id === id ? { ...t, status } : t)));

    return NextResponse.json({
      success: true,
      message: `Status tiket ${id} berhasil diperbarui menjadi "${status}".`,
      ticket: { ...found, status },
    });
  } catch (error: any) {
    console.error("[API /api/tickets PATCH Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui status tiket." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session = null;
    if (token) {
      try {
        session = verifySession(token);
      } catch {
        session = null;
      }
    }
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Hanya Admin yang dapat menghapus tiket." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Parameter id wajib disertakan untuk menghapus tiket!" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin.from("support_tickets").delete().eq("id", id).select();

      if (!error) {
        if (data && data.length > 0) {
          return NextResponse.json({ success: true, message: `Tiket ${id} berhasil dihapus dari sistem.` });
        }
        return NextResponse.json({ success: false, message: `Tiket dengan ID ${id} tidak ditemukan.` }, { status: 404 });
      }
      if (!isTableMissing(error)) {
        return NextResponse.json(
          { success: false, message: error.message || "Gagal menghapus tiket." },
          { status: 500 }
        );
      }
      // tabel belum ada → fallback storage
    }

    const storage = await loadFromStorage();
    const found = storage.tickets.some((t) => t.id === id);
    if (!found) {
      return NextResponse.json({ success: false, message: `Tiket dengan ID ${id} tidak ditemukan.` }, { status: 404 });
    }
    await saveToStorage(storage.tickets.filter((t) => t.id !== id));

    return NextResponse.json({ success: true, message: `Tiket ${id} berhasil dihapus dari sistem.` });
  } catch (error: any) {
    console.error("[API /api/tickets DELETE Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus tiket." },
      { status: 500 }
    );
  }
}