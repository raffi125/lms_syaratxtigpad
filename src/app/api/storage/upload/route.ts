import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
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
