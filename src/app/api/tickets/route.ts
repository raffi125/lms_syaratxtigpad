import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { SupportTicket } from "@/types";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/tickets.json";

// In-memory cache with fallback seed
let ticketsCache: SupportTicket[] | null = null;

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

async function loadTickets(): Promise<SupportTicket[]> {
  if (ticketsCache) return ticketsCache;

  if (!isSupabaseConfigured()) {
    ticketsCache = [...INITIAL_DEFAULT_TICKETS];
    return ticketsCache;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PATH);

    if (error || !data) {
      ticketsCache = [...INITIAL_DEFAULT_TICKETS];
      return ticketsCache;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    ticketsCache = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_DEFAULT_TICKETS];
    return ticketsCache;
  } catch (err) {
    console.warn("[tickets] Failed to load from Supabase Storage:", err);
    ticketsCache = [...INITIAL_DEFAULT_TICKETS];
    return ticketsCache;
  }
}

async function saveTickets(list: SupportTicket[]): Promise<boolean> {
  ticketsCache = list;
  if (!isSupabaseConfigured()) return true;

  try {
    const jsonStr = JSON.stringify(list, null, 2);
    const buffer = Buffer.from(jsonStr, "utf-8");

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PATH, buffer, {
        contentType: "application/json",
        upsert: true,
      });

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

export async function GET() {
  try {
    const tickets = await loadTickets();
    return NextResponse.json({
      success: true,
      data: tickets,
      total: tickets.length,
      destination: {
        team: "Tim IT SYARAT x TIGPAD",
        email: "it-support@kolab.id",
        sla: "Maks. 1x24 Jam Kerja",
      },
    });
  } catch (error: any) {
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
      return NextResponse.json(
        { success: false, message: "Semua kolom wajib diisi!" },
        { status: 400 }
      );
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-IT-2026-${randomCode}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newTicket: SupportTicket = {
      id: ticketId,
      name: String(name).trim(),
      email: String(email).trim(),
      category: category || "bug_teknis",
      priority: priority || "sedang",
      subject: String(subject).trim(),
      description: String(description).trim(),
      status: "Menunggu Peninjauan",
      createdAt: `${formattedDate} WIB`,
    };

    const currentList = await loadTickets();
    const updated = [newTicket, ...currentList.filter((t) => t.id !== newTicket.id)];
    await saveTickets(updated);

    console.log(`[IT HELPDESK] Tiket Diterima: ${newTicket.id} | Pelapor: ${newTicket.name} (${newTicket.email}) | Kategori: ${newTicket.category} | Subjek: "${newTicket.subject}"`);

    return NextResponse.json({
      success: true,
      message: "Tiket berhasil dikirim ke antrean Tim IT!",
      ticket: newTicket,
      destination: {
        team: "Tim IT SYARAT x TIGPAD",
        email: "it-support@kolab.id",
      },
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
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Parameter id dan status wajib disertakan!" },
        { status: 400 }
      );
    }

    const currentList = await loadTickets();
    let found = false;
    const updated = currentList.map((t) => {
      if (t.id === id) {
        found = true;
        return { ...t, status };
      }
      return t;
    });

    if (!found) {
      return NextResponse.json(
        { success: false, message: `Tiket dengan ID ${id} tidak ditemukan.` },
        { status: 404 }
      );
    }

    await saveTickets(updated);

    return NextResponse.json({
      success: true,
      message: `Status tiket ${id} berhasil diperbarui menjadi "${status}".`,
      ticket: updated.find((t) => t.id === id),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui status tiket." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Parameter id wajib disertakan untuk menghapus tiket!" },
        { status: 400 }
      );
    }

    const currentList = await loadTickets();
    const updated = currentList.filter((t) => t.id !== id);
    await saveTickets(updated);

    return NextResponse.json({
      success: true,
      message: `Tiket ${id} berhasil dihapus dari sistem.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus tiket." },
      { status: 500 }
    );
  }
}
