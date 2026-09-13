import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const ALLOWED_BUCKETS = new Set(["serti", "image", "modul"]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "mp4",
]);

// Maximum file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function isPathSafe(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") return false;
  // Disallow directory traversal or root paths
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\")) {
    return false;
  }
  // Protect internal system directories and configurations
  const normalized = filePath.toLowerCase().trim();
  if (normalized.startsWith("system/") || normalized === "system") {
    return false;
  }
  // Allow only alphanumeric characters, underscores, hyphens, dots, and slashes
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(filePath);
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Supabase belum terkonfigurasi." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "image";
    const filePath = formData.get("filePath") as string;

    if (!file || !filePath) {
      return NextResponse.json(
        { success: false, error: "Parameter file dan filePath wajib diisi." },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { success: false, error: `Bucket '${bucket}' tidak diizinkan.` },
        { status: 400 }
      );
    }

    if (!isPathSafe(filePath)) {
      return NextResponse.json(
        { success: false, error: "Jalur berkas (filePath) tidak valid atau dilarang." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas maksimal 15MB." },
        { status: 400 }
      );
    }

    // Validate MIME type & file extension
    const mimeType = (file.type || "").toLowerCase();
    const ext = filePath.includes(".") ? filePath.split(".").pop()?.toLowerCase() || "" : "";

    const isMimeValid = ALLOWED_MIME_TYPES.has(mimeType);
    const isExtValid = ALLOWED_EXTENSIONS.has(ext);

    if (!isMimeValid && !isExtValid) {
      return NextResponse.json(
        { success: false, error: "Format berkas tidak didukung. Gunakan gambar (JPG, PNG, WebP), PDF, atau Video MP4." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = isMimeValid ? mimeType : (ext === "pdf" ? "application/pdf" : ext === "mp4" ? "video/mp4" : "image/jpeg");

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadErr) {
      console.warn(`[api/storage/upload] Upload error:`, uploadErr.message);
      return NextResponse.json(
        { success: false, error: uploadErr.message },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData?.publicUrl || "",
      path: filePath,
      bucket,
    });
  } catch (err: any) {
    console.error(`[api/storage/upload] Exception:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Supabase belum terkonfigurasi." },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket") || "image";
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Parameter path wajib diisi." },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { success: false, error: `Bucket '${bucket}' tidak diizinkan.` },
        { status: 400 }
      );
    }

    if (!isPathSafe(path)) {
      return NextResponse.json(
        { success: false, error: "Jalur berkas tidak valid atau dilindungi." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "File berhasil dihapus dari storage." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
