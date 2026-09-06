import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { QuizSubmission } from "@/types";

const STORAGE_BUCKET = "modul";
const STORAGE_PATH = "system/quiz_submissions.json";

// In-memory cache for speed during runtime
let submissionsCache: QuizSubmission[] | null = null;

async function loadSubmissions(): Promise<QuizSubmission[]> {
  if (submissionsCache) return submissionsCache;

  if (!isSupabaseConfigured()) {
    submissionsCache = [];
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_PATH);

    if (error || !data) {
      submissionsCache = [];
      return [];
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    submissionsCache = Array.isArray(parsed) ? parsed : [];
    return submissionsCache;
  } catch (err) {
    console.warn("[quiz-submissions] Failed to load from Supabase Storage:", err);
    submissionsCache = [];
    return [];
  }
}

async function saveSubmissions(list: QuizSubmission[]): Promise<boolean> {
  submissionsCache = list;
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
      console.error("[quiz-submissions] Save error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[quiz-submissions] Save error:", err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");

    const list = await loadSubmissions();

    if (userIdParam) {
      const uId = Number(userIdParam);
      const userSubmissions = list.filter((s) => s.userId === uId);
      return NextResponse.json({
        success: true,
        data: userSubmissions,
        total: userSubmissions.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: list,
      total: list.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to get submissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      userRole,
      score,
      earnedPoints,
      totalPossiblePoints,
      passed,
      answers,
    } = body;

    if (!userId || !userName || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, message: "Field userId, userName, dan answers wajib disertakan!" },
        { status: 400 }
      );
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newSubmission: QuizSubmission = {
      id: `SUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: Number(userId),
      userName: String(userName),
      userEmail: String(userEmail || ""),
      userRole: String(userRole || "peserta"),
      score: Number(score ?? 0),
      earnedPoints: Number(earnedPoints ?? 0),
      totalPossiblePoints: Number(totalPossiblePoints ?? 100),
      passed: Boolean(passed),
      submittedAt: `${formattedDate} WIB`,
      answers,
    };

    const currentList = await loadSubmissions();
    // Replace previous submission from this user or prepend at the top
    const filtered = currentList.filter((s) => s.userId !== newSubmission.userId);
    const updated = [newSubmission, ...filtered];

    await saveSubmissions(updated);

    return NextResponse.json({
      success: true,
      message: "Hasil jawaban kuis berhasil disimpan di database cloud!",
      submission: newSubmission,
    });
  } catch (error: any) {
    console.error("[API /api/quiz-submissions POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan jawaban kuis." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userIdParam = searchParams.get("userId");
    const all = searchParams.get("all");

    if (!id && !userIdParam && all !== "true") {
      return NextResponse.json(
        { success: false, message: "Parameter id, userId, atau all=true dibutuhkan untuk menghapus riwayat jawaban." },
        { status: 400 }
      );
    }

    const currentList = await loadSubmissions();
    let updated = currentList;

    if (all === "true") {
      updated = [];
    } else if (id) {
      updated = currentList.filter((s) => s.id !== id);
    } else if (userIdParam) {
      const uId = Number(userIdParam);
      updated = currentList.filter((s) => s.userId !== uId);
    }

    await saveSubmissions(updated);

    return NextResponse.json({
      success: true,
      message: "Riwayat jawaban kuis berhasil dihapus.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus riwayat jawaban." },
      { status: 500 }
    );
  }
}
