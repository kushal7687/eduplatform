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
  try {
    const questions = await db.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const out = questions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: q.correctAnswer,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }));
    return NextResponse.json({ questions: out });
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.substring(0, 200) }, { status: 500 });
  }
}

const questionSchema = z.object({
  chapterId: z.string().optional(),
  type: z.string(),
  difficulty: z.string().default("MEDIUM"),
  stem: z.string().min(3).max(5000),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  audioLoop: z.number().int().default(0),
  audioLoopDelay: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const q = await db.question.create({
      data: {
        chapterId: d.chapterId || null,
        type: d.type as any,
        difficulty: d.difficulty as any,
        stem: d.stem,
        options: d.options ? JSON.stringify(d.options) : null,
        correctAnswer: d.correctAnswer || null,
        explanation: d.explanation || null,
        tags: d.tags ? JSON.stringify(d.tags) : null,
        imageUrl: d.imageUrl || null,
        audioUrl: d.audioUrl || null,
        audioLoop: d.audioLoop || 0,
        audioLoopDelay: d.audioLoopDelay || 0,
      },
    });
    await audit({ actorId: user.id, action: "create_question", entity: "Question", entityId: q.id, metadata: JSON.stringify({ type: d.type }) });
    return NextResponse.json({ question: { ...q, options: d.options, tags: d.tags || [] } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.substring(0, 200) }, { status: 500 });
  }
}
