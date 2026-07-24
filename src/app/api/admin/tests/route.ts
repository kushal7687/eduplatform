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
  const tests = await db.test.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ tests });
}

const testSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().default(""),
  durationMin: z.number().int().min(1).max(600).default(30),
  isExam: z.boolean().default(false),
  examType: z.string().default("REGULAR"),
  passScore: z.number().int().min(0).max(100).default(40),
  negativeMarking: z.number().default(0),
  shuffleQuestions: z.boolean().default(false),
  showResultImmediately: z.boolean().default(true),
  maxAttempts: z.number().int().min(0).default(1),
  isPublished: z.boolean().default(true),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;
  const test = await db.test.create({
    data: {
      title: d.title,
      description: d.description,
      durationMin: d.durationMin,
      isExam: d.isExam,
      examType: d.examType,
      passScore: d.passScore,
      negativeMarking: d.negativeMarking,
      shuffleQuestions: d.shuffleQuestions,
      showResultImmediately: d.showResultImmediately,
      maxAttempts: d.maxAttempts,
      isPublished: d.isPublished,
      isActive: true,
      startAt: d.startAt ? new Date(d.startAt) : null,
      endAt: d.endAt ? new Date(d.endAt) : null,
      createdBy: user.id,
    },
  });
  await audit({ actorId: user.id, action: "create_test", entity: "Test", entityId: test.id });
  return NextResponse.json({ test });
}
