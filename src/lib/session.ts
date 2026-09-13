// =============================================================================
// SESSION — Signed session token (HS256 JWT) untuk mutasi server-side.
// Server-only module. Jangan di-import dari komponen client.
// =============================================================================
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "kolab_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 hari

export interface SessionPayload {
  sub: string; // user id (DB row id) atau pseudonym untuk admin/mentor
  name: string;
  role: "admin" | "mentor" | "peserta";
  iat: number;
  exp: number;
}

export type SessionRole = SessionPayload["role"];

const SESSION_SECRET_ENV = "KOLAB_SESSION_SECRET";

function getSecret(): string {
  const secret = process.env[SESSION_SECRET_ENV] || "";
  if (!secret || secret.length < 32) {
    throw new Error(
      `${SESSION_SECRET_ENV} belum dikonfigurasi atau terlalu pendek (min. 32 karakter). ` +
        "Tambahkan ke .env.local / environment production agar sesi login aman."
    );
  }
  return secret;
}

const header = { alg: "HS256", typ: "JWT" };

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function signSession(role: SessionRole, sub: string, name: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub,
    name,
    role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  return `${data}.${sign(data, getSecret())}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;

    // Verifikasi tanda tangan dengan perbandingan timing-safe
    const expected = sign(`${h}.${p}`, secret);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(s);
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || !payload.role || !payload.sub) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}