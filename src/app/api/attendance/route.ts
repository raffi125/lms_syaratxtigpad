import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: Ambil seluruh rekapan presensi dari Supabase
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, logs: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("attendance_logs")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.warn("[api/attendance] GET error:", error.message);
      return NextResponse.json({ success: false, error: error.message, logs: [] }, { status: 500 });
    }

    const logs = (data || []).map((row: any) => {
      let proofUrl = row.proof_url || "";
      let method = row.method || "";
      if (!proofUrl && method && method.includes("[PROOF:")) {
        const match = method.match(/\[PROOF:(.*?)\]/);
        if (match) {
          proofUrl = match[1];
          method = method.replace(/\[PROOF:.*?\]/, "").trim();
        }
      }
      return {
        ...row,
        method,
        proof_url: proofUrl,
        proofUrl: proofUrl,
      };
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error("[api/attendance] GET exception:", err);
    return NextResponse.json({ success: false, error: err?.message, logs: [] }, { status: 500 });
  }
}

// POST: Submit presensi peserta beserta upload bukti screenshot Zoom
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Database Supabase belum terkonfigurasi." },
      { status: 500 }
    );
  }

  try {
    let name = "";
    let userIdCode = "";
    let institution = "";
    let sessionId: number | undefined;
    let presenceCode = "";
    let time = "";
    let proofUrl = "";
    let userId: number | undefined;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = (formData.get("name") as string) || "Peserta";
      userIdCode = (formData.get("user_id_code") as string) || (formData.get("npm") as string) || "";
      institution = (formData.get("institution") as string) || "";
      const rawSessionId = formData.get("session_id");
      if (rawSessionId) sessionId = Number(rawSessionId);
      presenceCode = (formData.get("presence_code") as string) || "";
      time = (formData.get("time") as string) || "";
      const rawUserId = formData.get("user_id");
      if (rawUserId) userId = Number(rawUserId);

      // Tangani file bukti screenshot jika dikirimkan
      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = file.name && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
          const fileName = `attendance/zoom_${sessionId || "sesi"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from("image")
            .upload(fileName, buffer, {
              contentType: file.type || "image/jpeg",
              upsert: true,
            });

          if (!uploadErr) {
            const { data: publicUrlData } = supabaseAdmin.storage.from("image").getPublicUrl(fileName);
            if (publicUrlData && publicUrlData.publicUrl) {
              proofUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn("[api/attendance] Storage upload error:", uploadErr.message);
          }
        } catch (uploadEx) {
          console.error("[api/attendance] File buffer upload exception:", uploadEx);
        }
      }

      // Fallback proof_url jika dikirim sebagai text URL atau base64
      if (!proofUrl) {
        const textProof = formData.get("proof_url") as string;
        if (textProof) proofUrl = textProof;
      }
    } else {
      // JSON body
      const body = await req.json();
      name = body.name || "Peserta";
      userIdCode = body.user_id_code || body.npm || "";
      institution = body.institution || "";
      if (body.session_id) sessionId = Number(body.session_id);
      presenceCode = body.presence_code || "";
      time = body.time || "";
      if (body.user_id) userId = Number(body.user_id);
      proofUrl = body.proof_url || body.proofUrl || "";
    }

    // Format waktu default jika kosong
    if (!time) {
      const now = new Date();
      time = `Hari ini • ${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")} WIB`;
    }

    // Susun metode dan sematkan bukti
    let cleanMethod = proofUrl ? "Kode Sesi & SS Zoom" : "Kode Sesi";
    let storedMethod = cleanMethod;
    if (proofUrl && !storedMethod.includes("[PROOF:")) {
      storedMethod = `${storedMethod} [PROOF:${proofUrl}]`;
    }

    const basePayload: any = {
      name,
      institution,
      time,
      method: storedMethod,
      verified: true,
    };
    if (userIdCode) {
      basePayload.user_id_code = userIdCode;
    }

    const fullPayload: any = { ...basePayload };
    if (typeof userId === "number" && userId > 0 && userId < 2000000000) {
      fullPayload.user_id = userId;
    }
    if (typeof sessionId === "number" && sessionId > 0) {
      fullPayload.session_id = sessionId;
    }

    // Insert ke database Supabase
    let { data, error } = await supabaseAdmin.from("attendance_logs").insert([fullPayload]).select();

    // Penanganan fallback bila terkena error Foreign Key (23503)
    if (error && (error.code === "23503" || error.message.includes("foreign key"))) {
      console.warn("[api/attendance] FK violation detected, retrying without FK constraints:", error.message);
      const retry1 = { ...basePayload };
      if (fullPayload.session_id) retry1.session_id = fullPayload.session_id;
      let res = await supabaseAdmin.from("attendance_logs").insert([retry1]).select();
      if (res.error && (res.error.code === "23503" || res.error.message.includes("foreign key"))) {
        res = await supabaseAdmin.from("attendance_logs").insert([basePayload]).select();
      }
      data = res.data;
      error = res.error;
    }

    if (error || !data || data.length === 0) {
      console.error("[api/attendance] Insert failed:", error?.message);
      return NextResponse.json(
        { success: false, error: error?.message || "Gagal menyimpan rekapan presensi ke database." },
        { status: 500 }
      );
    }

    const insertedRow = data[0];
    const finalLog = {
      id: insertedRow.id,
      name: insertedRow.name,
      user_id: insertedRow.user_id_code || userIdCode,
      npm: insertedRow.user_id_code || userIdCode,
      institution: insertedRow.institution,
      time: insertedRow.time,
      method: cleanMethod,
      verified: insertedRow.verified,
      sessionId: insertedRow.session_id || sessionId,
      session_id: insertedRow.session_id || sessionId,
      proof_url: proofUrl,
      proofUrl: proofUrl,
    };

    return NextResponse.json({ success: true, log: finalLog });
  } catch (err: any) {
    console.error("[api/attendance] POST exception:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

// DELETE: Hapus log presensi oleh Admin / Mentor
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Database tidak terkonfigurasi." }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Parameter id wajib disertakan." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("attendance_logs").delete().eq("id", Number(id));
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
