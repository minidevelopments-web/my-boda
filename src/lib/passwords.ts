import bcrypt from "bcryptjs";
export async function hashPassword(pw: string): Promise<string> { return bcrypt.hash(pw, 12); }
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(pw, hash); } catch { return false; }
}
