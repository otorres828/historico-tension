import { cookies } from "next/headers";
import crypto from "node:crypto";
import { findUserById } from "./db";
const COOKIE = "tensiocare_session";
const secret =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me");
function signature(payload: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}
export async function createSession(userId: number) {
  if (!secret) throw new Error("AUTH_SECRET debe configurarse en producción.");
  const payload = Buffer.from(
    JSON.stringify({ userId, expires: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400,
    path: "/",
  });
}
export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
export async function getCurrentUser() {
  if (!secret) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  const expected = payload ? signature(payload) : "";
  if (
    !payload ||
    !sig ||
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId: number;
      expires: number;
    };
    if (value.expires < Date.now()) return null;
    const user = await findUserById(value.userId);
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  } catch {
    return null;
  }
}
