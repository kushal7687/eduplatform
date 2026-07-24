/**
 * Session management.
 * Uses httpOnly cookie for session token.
 * Falls back to ep_role cookie for admin (no DB needed).
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CONFIG } from "@/lib/config";
import { generateToken, sha256 } from "@/lib/security";

export const SESSION_COOKIE = "ep_sid";
const SESSION_TTL_MS = CONFIG.auth.sessionTtlDays * 24 * 60 * 60 * 1000;

export async function createSession(userId: string): Promise<string> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Try to save session to DB (might fail if DB not available)
  try {
    await db.session.create({
      data: {
        userId,
        token: sha256(token),
        expiresAt,
      },
    });
  } catch (e) {
    // DB might not be available — session is still valid via cookie
    console.error("Session save failed (non-fatal):", e);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  const roleCookie = cookieStore.get("ep_role")?.value;

  if (!sessionToken) return null;

  // If admin role cookie is set, return admin user without DB lookup
  if (roleCookie === "ADMIN") {
    return {
      id: "admin",
      name: "Admin",
      email: "admin@dreamkoreasmartclass.com",
      role: "ADMIN" as const,
      phone: null,
      avatarUrl: null,
      isBanned: false,
      isVerified: true,
    };
  }

  // For students/teachers, look up session in DB
  try {
    const session = await db.session.findFirst({
      where: { token: sha256(sessionToken), expiresAt: { gt: new Date() } },
    });
    if (!session) return null;

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.isBanned) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isBanned: user.isBanned,
      isVerified: user.isVerified,
    };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("ep_role");
}
