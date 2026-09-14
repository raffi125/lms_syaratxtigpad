import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/score_locks.json";

let locksCache: { [key: string]: boolean } | null = null;

// true = nilai boleh dilihat peserta (terbuka), false/none = nilai ditutup mentor
async function loadScoreLocks(): Promise<{ [key: string]: boolean }> {
  if (locksCache) return locksCache;

  if (!isSupabaseConfigured()) {
    locksCache = {};
    return locksCache;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PATH);

    if (error || !data) {
      locksCache = {};
      return locksCache;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    locksCache = parsed && typeof parsed === "object" ? parsed : {};
    return locksCache;
  } catch (err) {
    console.warn("[score-locks] Failed to load from Supabase Storage:", err);
    locksCache = {};
    return locksCache;
  }
}

async function saveScoreLocks(locks: { [key: string]: boolean }): Promise<boolean> {
  locksCache = locks;
  if (!isSupabaseConfigured()) return true;

  try {
    const jsonStr = JSON.stringify(locks, null, 2);
    const buffer = Buffer.from(jsonStr, "utf-8");

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PATH, buffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      console.error("[score-locks] Save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[score-locks] Save error:", err);
    return false;
  }
}

export async function GET() {
  try {
    const locks = await loadScoreLocks();
    return NextResponse.json({ success: true, locks });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await loadScoreLocks();

    let updated: { [key: string]: boolean } = { ...current };

    const isValidCategoryKey = (k: string) =>
      typeof k === "string" &&
      k.trim().length > 0 &&
      k.trim().length <= 100 &&
      /^[a-zA-Z0-9\s\-._&+()/'\"\\]*$/.test(k.trim());

    if (body.locks && typeof body.locks === "object" && !Array.isArray(body.locks)) {
      for (const [key, val] of Object.entries(body.locks)) {
        const cleanKey = String(key).trim();
        if (isValidCategoryKey(cleanKey) && typeof val === "boolean") {
          updated[cleanKey] = val;
        }
      }
    } else if (body.categoryKey && typeof body.locked === "boolean" && isValidCategoryKey(body.categoryKey)) {
      updated[body.categoryKey.trim()] = body.locked;
    } else {
      return NextResponse.json(
        { success: false, error: "Payload tidak valid. Format categoryKey/locks tidak sesuai." },
        { status: 400 }
      );
    }

    const ok = await saveScoreLocks(updated);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to persist score visibility to cloud" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, locks: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}