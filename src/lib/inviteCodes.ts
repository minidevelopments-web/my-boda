import crypto from "crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
export function normalizeInviteCode(s: string): string {
  return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
