import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const cards = await db.homeCard.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ cards });
}

const createSchema = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  title: z.string().min(2).max(100),
  section: z.enum(["test", "resources", "premium"]).default("test"),
  imageUrl: z.string().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  route: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { key, title, section, imageUrl, sortOrder, isActive, route } = parsed.data;
  try {
    const card = await db.homeCard.create({
      data: {
        key, title, section,
        imageUrl: imageUrl || null,
        sortOrder, isActive,
        route: route || null,
      },
    });
    await audit({ actorId: user.id, action: "create_home_card", entity: "HomeCard", entityId: card.id });
    return NextResponse.json({ card });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A card with this key already exists" }, { status: 409 });
    }
    throw e;
  }
}
