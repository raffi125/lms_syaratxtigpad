import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const getNormalizedSupabaseUrl = (url: string) => {
  if (!url) return "https://placeholder.supabase.co";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Extract project ref if postgresql:// connection string was provided
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }
  return "https://placeholder.supabase.co";
};

const supabaseUrl = getNormalizedSupabaseUrl(rawUrl);

export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

// Client resmi untuk browser (menggunakan Anon Key yang diizinkan untuk client-side)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || "placeholder-anon-key"
);

// Admin client: Hanya aktif di sisi Server (Node.js/API Route)
// Di browser (typeof window !== "undefined"), SELALU gunakan supabase (Anon client)
// untuk mencegah error fatal: "Forbidden use of secret API key in browser"
const isServer = typeof window === "undefined";
const serverSecretKey = isServer
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "")
  : "";

export const supabaseAdmin = (isServer && serverSecretKey)
  ? createClient(supabaseUrl, serverSecretKey, { auth: { persistSession: false } })
  : supabase;
