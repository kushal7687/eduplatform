import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("ep_sid")?.value;
  const roleCookie = cookieStore.get("ep_role")?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null });
  }

  // If admin role cookie is set, return admin user without DB lookup
  if (roleCookie === "ADMIN") {
    return NextResponse.json({
      user: {
        id: "admin",
        name: "Admin",
        email: "admin@dreamkoreasmartclass.com",
        role: "ADMIN",
        phone: null,
        avatarUrl: null,
      },
    });
  }

  // For students/teachers, look up session in DB
  try {
    const { sha256 } = await import("@/lib/security");
    const session = await db.session.findFirst({
      where: { token: sha256(sessionToken), expiresAt: { gt: new Date() } },
    });
    if (!session) return NextResponse.json({ user: null });

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
