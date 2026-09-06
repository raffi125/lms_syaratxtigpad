import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

export interface UploadResult {
  url: string;
  path: string;
  bucket?: string;
  error?: string;
  isRemote?: boolean;
}

export type StorageTargetFolder =
  | "avatars"
  | "certificates"
  | "modules/videos"
  | "modules/pdfs"
  | "quizzes"
  | "serti"
  | "image"
  | "modul"
  | "attendance";

/**
 * Mapping kategori upload ke bucket resmi:
 * - serti : Berkas sertifikat (PDF / Gambar)
 * - image : Foto profil (avatars), kuis, dan bukti screenshot presensi Zoom (attendance)
 * - modul : Berkas materi pembelajaran (video MP4 / PDF bacaan)
 */
export const resolveStorageBucketAndPath = (
  folder: StorageTargetFolder,
  fileName: string
): { bucket: "serti" | "image" | "modul"; filePath: string } => {
  if (folder === "certificates" || folder === "serti") {
    return { bucket: "serti", filePath: fileName };
  }
  if (folder === "modules/videos") {
    return { bucket: "modul", filePath: `videos/${fileName}` };
  }
  if (folder === "modules/pdfs") {
    return { bucket: "modul", filePath: `pdfs/${fileName}` };
  }
  if (folder === "modul") {
    return { bucket: "modul", filePath: fileName };
  }
  if (folder === "avatars") {
    return { bucket: "image", filePath: `avatars/${fileName}` };
  }
  if (folder === "quizzes") {
    return { bucket: "image", filePath: `quizzes/${fileName}` };
  }
  if (folder === "attendance") {
    return { bucket: "image", filePath: `attendance/${fileName}` };
  }
  return { bucket: "image", filePath: fileName };
};

export const SupabaseStorageService = {
  /**
   * Upload berkas ke Sub-Bucket Supabase Storage:
   * - serti : Berkas sertifikat resmi PDF/gambar
   * - image : Foto profil peserta/mentor & foto gestur isyarat kuis
   * - modul : Materi modul (video tutorial & dokumen PDF)
   */
  async uploadFile(
    folder: StorageTargetFolder,
    file: File | Blob,
    customFileName?: string,
    overrideBucket?: "serti" | "image" | "modul"
  ): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      return { url: "", path: "", error: "Supabase belum terkonfigurasi.", isRemote: false };
    }

    const ext = file instanceof File && file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const timestamp = Date.now();
    const cleanName = customFileName
      ? customFileName.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `${timestamp}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const resolved = resolveStorageBucketAndPath(folder, cleanName);
    const targetBucket = overrideBucket || resolved.bucket;
    const filePath = resolved.filePath;

    try {
      const { error } = await supabaseAdmin.storage
        .from(targetBucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.warn(`Supabase Storage upload error pada '${targetBucket}/${filePath}':`, error.message);
        return {
          url: "",
          path: filePath,
          bucket: targetBucket,
          error: error.message,
          isRemote: false,
        };
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        path: filePath,
        bucket: targetBucket,
        isRemote: true,
      };
    } catch (err: any) {
      console.error("Storage upload exception:", err);
      return {
        url: "",
        path: filePath,
        bucket: targetBucket,
        error: err?.message || "Gagal mengunggah berkas ke Supabase Storage.",
        isRemote: false,
      };
    }
  },
};
