import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/quiz_category_meta.json";

export interface QuizCategoryMeta {
  title?: string;
  topic?: string;
  shortTitle?: string;
  description?: string;
}

let metaCache: { [key: string]: QuizCategoryMeta } | null = null;

async function loadCategoryMeta(): Promise<{ [key: string]: QuizCategoryMeta }> {
  if (metaCache) return metaCache;

  if (!isSupabaseConfigured()) {
    metaCache = {};
    return metaCache;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PATH);

    if (error || !data) {
      metaCache = {};
      return metaCache;
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    metaCache = parsed && typeof parsed === "object" ? parsed : {};
    return metaCache;
  } catch (err) {
    console.warn("[quiz-category-meta] Failed to load from Supabase Storage:", err);
    metaCache = {};
    return metaCache;
  }
}

async function saveCategoryMeta(meta: { [key: string]: QuizCategoryMeta }): Promise<boolean> {
  metaCache = meta;
  if (!isSupabaseConfigured()) return true;

  try {
    const jsonStr = JSON.stringify(meta, null, 2);
    const buffer = Buffer.from(jsonStr, "utf-8");

    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_PATH, buffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      console.error("[quiz-category-meta] Save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[quiz-category-meta] Save error:", err);
    return false;
  }
}

export async function GET() {
  try {
    const meta = await loadCategoryMeta();
    return NextResponse.json({ success: true, meta });
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
    const current = await loadCategoryMeta();

    const updated: { [key: string]: QuizCategoryMeta } = { ...current };

    const isSafeCategoryKey = (k: string) =>
      typeof k === "string" &&
      k.trim().length > 0 &&
      k.trim().length <= 100 &&
      /^[a-zA-Z0-9\s\-._&+()/'\"\\]*$/.test(k.trim());

    const sanitizeField = (v: unknown, max = 300): string => {
      if (typeof v !== "string") return "";
      return v.trim().slice(0, max);
    };

    if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
      for (const [key, raw] of Object.entries(body.meta)) {
        const cleanKey = key.trim();
        if (!isSafeCategoryKey(cleanKey)) continue;
        const entry = (raw || {}) as Record<string, unknown>;
        if (typeof entry !== "object") continue;
        const next: QuizCategoryMeta = {};
        const title = sanitizeField(entry.title, 160);
        const topic = sanitizeField(entry.topic, 160);
        const shortTitle = sanitizeField(entry.shortTitle, 60);
        const description = sanitizeField(entry.description, 600);
        if (title) next.title = title;
        if (topic) next.topic = topic;
        if (shortTitle) next.shortTitle = shortTitle;
        if (description) next.description = description;
        if (Object.keys(next).length > 0) {
          updated[cleanKey] = next;
        } else {
          delete updated[cleanKey];
        }
      }
    } else if (body.categoryKey && isSafeCategoryKey(body.categoryKey)) {
      const entry = (body.data || {}) as Record<string, unknown>;
      const next: QuizCategoryMeta = {};
      const title = sanitizeField(entry.title, 160);
      const topic = sanitizeField(entry.topic, 160);
      const shortTitle = sanitizeField(entry.shortTitle, 60);
      const description = sanitizeField(entry.description, 600);
      if (title) next.title = title;
      if (topic) next.topic = topic;
      if (shortTitle) next.shortTitle = shortTitle;
      if (description) next.description = description;
      if (Object.keys(next).length > 0) {
        updated[body.categoryKey.trim()] = next;
      } else {
        delete updated[body.categoryKey.trim()];
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Payload tidak valid. Format meta/categoryKey tidak sesuai." },
        { status: 400 }
      );
    }

    const ok = await saveCategoryMeta(updated);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to persist quiz category meta to cloud" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, meta: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}