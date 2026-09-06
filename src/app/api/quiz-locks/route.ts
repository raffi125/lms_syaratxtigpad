import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/quiz_locks.json";

const DEFAULT_QUIZ_LOCKS: { [key: string]: boolean } = {
  "Pertemuan 1": false,
  "Pertemuan 2": true,
  "Pertemuan 3": true,
  "Pertemuan 4": true,
  "Pertemuan 5": true,
  "Pertemuan 6": true,
};

let locksCache: { [key: string]: boolean } | null = null;

async function loadQuizLocks(): Promise<{ [key: string]: boolean }> {
  if (locksCache) return locksCache;

  if (!isSupabaseConfigured()) {
    locksCache = { ...DEFAULT_QUIZ_LOCKS };
    return locksCache;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PATH);

    if (error || !data) {
      locksCache = { ...DEFAULT_QUIZ_LOCKS };
      return locksCache;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    locksCache = parsed && typeof parsed === "object" ? parsed : { ...DEFAULT_QUIZ_LOCKS };
    return locksCache;
  } catch (err) {
    console.warn("[quiz-locks] Failed to load from Supabase Storage:", err);
    locksCache = { ...DEFAULT_QUIZ_LOCKS };
    return locksCache;
  }
}

async function saveQuizLocks(locks: { [key: string]: boolean }): Promise<boolean> {
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
      console.error("[quiz-locks] Save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[quiz-locks] Save error:", err);
    return false;
  }
}

export async function GET() {
  try {
    const locks = await loadQuizLocks();
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
    const current = await loadQuizLocks();

    let updated: { [key: string]: boolean } = { ...current };

    if (body.locks && typeof body.locks === "object") {
      updated = { ...current, ...body.locks };
    } else if (body.categoryKey && typeof body.locked === "boolean") {
      updated[body.categoryKey] = body.locked;
    }

    const ok = await saveQuizLocks(updated);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to persist quiz locks to cloud" },
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
