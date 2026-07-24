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
}

const questionSchema = z.object({
  chapterId: z.string().optional(),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "ONE_WORD", "SHORT_ANSWER", "LONG_ANSWER", "FILL_BLANK", "MATCHING"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
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
  const body = await req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { chapterId, type, difficulty, stem, options, correctAnswer, explanation, tags, imageUrl, audioUrl, audioLoop, audioLoopDelay } = parsed.data;
  const q = await db.question.create({
    data: {
      chapterId: chapterId || null,
      type, difficulty, stem,
      options: options ? JSON.stringify(options) : null,
      correctAnswer: correctAnswer || null,
      explanation: explanation || null,
      tags: tags ? JSON.stringify(tags) : null,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      audioLoop: audioLoop || 0,
      audioLoopDelay: audioLoopDelay || 0,
    },
  });
  await audit({ actorId: user.id, action: "create_question", entity: "Question", entityId: q.id, metadata: { type } });
  return NextResponse.json({ question: { ...q, options, tags: tags || [] } });
}
