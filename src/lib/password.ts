// =============================================================================
// PASSWORD HASHING (scrypt - node:crypto, TANPA dependency tambahan)
// -----------------------------------------------------------------------------
// Format hash: scrypt$N$salt$hash
//  - N   : cost parameter scrypt (2^15 = 32768)
//  - salt: 16 byte acak hex
//  - hash: 64 byte derive hex
// Hanya dipakai di sisi SERVER (API routes). Klien TIDAK pernah menerima hash.
// =============================================================================
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  opts?: { N?: number; r?: number; p?: number; maxmem?: number }
) => Promise<Buffer>;

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
// 128 * N * r = 32MiB tepat di batas default OpenSSL (32MiB) → alokasi 2x lipat agar aman.
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = String(stored).split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const salt = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(n) || !salt || !expectedHex) return false;

    const derived = await scryptAsync(password, salt, KEY_LENGTH, {
      N: n,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    });
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}