/**
 * POST /api/admin/setup
 * Creates all database tables and seeds initial data.
 * Run this once after deploying to Vercel.
 * Body: { secret: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { secret?: string };
  const adminPassword = process.env.ADMIN_PASSWORD || "DreamKorea@2026";

  if (body.secret !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    const userCount = await db.user.count();
    results.push(`DB connected. Users: ${userCount}`);

    // Seed tokens
    const adminToken = "dreamkorea-admin-2026";
    const teacherToken = "dreamkorea-teacher-2026";
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const ea = await db.secureLoginToken.findUnique({ where: { token: adminToken } });
    if (!ea) {
      await db.secureLoginToken.create({ data: { role: "ADMIN", token: adminToken, expiresAt } });
      results.push("Admin token created");
    }

    const et = await db.secureLoginToken.findUnique({ where: { token: teacherToken } });
    if (!et) {
      await db.secureLoginToken.create({ data: { role: "TEACHER", token: teacherToken, expiresAt } });
      results.push("Teacher token created");
    }

    // Seed home cards
    const cc = await db.homeCard.count();
    if (cc === 0) {
      const cards = [
        { key: "ubt_test", title: "UBT TEST", section: "test", sortOrder: 0, route: "tests" },
        { key: "free_exam", title: "Free Exam", section: "test", sortOrder: 1, route: "tests" },
        { key: "batch", title: "Batch", section: "test", sortOrder: 2, route: "tests" },
        { key: "results", title: "Results", section: "test", sortOrder: 3, route: "profile" },
        { key: "all_books", title: "ALL BOOKS", section: "resources", sortOrder: 0, route: "books" },
        { key: "question_bank", title: "QUESTION BANK", section: "resources", sortOrder: 1, route: "learn" },
        { key: "course_video", title: "COURSE VIDEO", section: "resources", sortOrder: 2, route: "videos" },
        { key: "audio_lessons", title: "AUDIO LESSONS", section: "resources", sortOrder: 3, route: "learn" },
        { key: "classroom", title: "CLASSROOM", section: "premium", sortOrder: 0, route: "live" },
        { key: "live_class", title: "LIVE CLASS", section: "premium", sortOrder: 1, route: "live" },
        { key: "recorded_video", title: "RECORDED VIDEO", section: "premium", sortOrder: 2, route: "videos" },
        { key: "class_result", title: "CLASS RESULT", section: "premium", sortOrder: 3, route: "profile" },
      ];
      for (const c of cards) await db.homeCard.create({ data: c });
      results.push(`Created ${cards.length} home cards`);
    }

    // Seed sample test
    const tc = await db.test.count();
    if (tc === 0) {
      const q = await db.question.create({
        data: {
          type: "SINGLE_CHOICE", difficulty: "EASY",
          stem: "What does '안녕하세요' mean?",
          options: JSON.stringify(["Goodbye", "Hello", "Thank you", "Sorry"]),
          correctAnswer: JSON.stringify("Hello"),
          explanation: "안녕하세요 is the standard Korean greeting.",
        },
      });
      await db.test.create({
        data: {
          title: "Korean Greetings Quiz",
          description: "Test your knowledge of Korean greetings.",
          durationMin: 5, isExam: true, examType: "REGULAR",
          passScore: 50, isPublished: true, isActive: true,
          items: { create: [{ questionId: q.id, points: 1, order: 0 }] },
        },
      });
      results.push("Created sample test");
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, results }, { status: 500 });
  }
}
