// =============================================================================
// DB GATEWAY CLIENT — satu-satunya jalur mutasi database dari browser.
// Setiap operasi tulis dari supabaseService.ts harus lewat sini; server API
// (/api/db) yang memvalidasi sesi & peran lalu mengeksekusi via service_role.
// =============================================================================

export interface GatewayError {
  code?: string;
  message: string;
  details?: unknown;
  perms?: string;
}

export interface GatewayResult<T = unknown> {
  data: T | null;
  error: GatewayError | null;
}

export interface GatewayOptions {
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  payload?: Record<string, unknown> | Array<Record<string, unknown>>;
  match?: Record<string, string | number>;
  ilike?: Record<string, string>;
  matchAny?: Array<Record<string, string | number>>;
  neq?: Record<string, string | number>;
  select?: "single" | "rows" | false;
}

export async function dbGateway<T = unknown>(options: GatewayOptions): Promise<GatewayResult<T>> {
  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    const json = (await res.json().catch(() => null)) as GatewayResult<T> | null;
    if (json && typeof json === "object" && "error" in json) {
      return json;
    }
    return {
      data: null,
      error: { code: String(res.status || 500), message: "Respon gateway tidak valid." },
    };
  } catch (e: any) {
    return {
      data: null,
      error: { code: "500", message: e?.message || "Gagal terhubung ke gateway database." },
    };
  }
}