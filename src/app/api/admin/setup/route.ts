/**
 * POST /api/admin/setup
 * Creates all database tables and seeds initial data.
 * Uses Supabase REST API to run SQL (avoids Prisma schema push issues).
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { secret?: string };
  const adminPassword = process.env.ADMIN_PASSWORD || "DreamKorea@2026";

  if (body.secret !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || "";

  try {
    // Use Supabase RPC to run SQL and create tables
    // We'll use Prisma's raw SQL via db.$executeRawUnsafe
    const { db } = await import("@/lib/db");

    // Try to create tables using raw SQL (Prisma will handle the connection)
    // First, check if tables exist
    let tablesExist = false;
    try {
      await db.user.count();
      tablesExist = true;
      results.push("Tables already exist");
    } catch {
      results.push("Tables don't exist, creating...");
    }

    if (!tablesExist) {
      // Use Supabase REST API to execute SQL
      const sql = `
        CREATE TABLE IF NOT EXISTS "User" (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          phone TEXT UNIQUE,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'STUDENT',
          "avatarUrl" TEXT,
          "isVerified" BOOLEAN NOT NULL DEFAULT false,
          "isBanned" BOOLEAN NOT NULL DEFAULT false,
          "passwordHash" TEXT,
          username TEXT UNIQUE,
          "signupMethod" TEXT,
          "createdBy" TEXT,
          "lastActiveAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Session" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          ip TEXT,
          "userAgent" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "OtpCode" (
          id TEXT PRIMARY KEY,
          contact TEXT NOT NULL,
          code TEXT NOT NULL,
          purpose TEXT NOT NULL DEFAULT 'login',
          attempts INTEGER NOT NULL DEFAULT 0,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          consumed BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "SecureLoginToken" (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          "createdBy" TEXT,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "lastUsedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "Subject" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          "iconUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "Chapter" (
          id TEXT PRIMARY KEY,
          "subjectId" TEXT NOT NULL,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          "order" INTEGER NOT NULL DEFAULT 0,
          "authorId" TEXT,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          UNIQUE("subjectId", "slug")
        );
        CREATE TABLE IF NOT EXISTS "Lesson" (
          id TEXT PRIMARY KEY,
          "chapterId" TEXT NOT NULL,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'TEXT',
          content TEXT NOT NULL,
          "videoUrl" TEXT,
          attachments TEXT,
          "durationMin" INTEGER NOT NULL DEFAULT 10,
          "order" INTEGER NOT NULL DEFAULT 0,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          UNIQUE("chapterId", "slug")
        );
        CREATE TABLE IF NOT EXISTS "Question" (
          id TEXT PRIMARY KEY,
          "chapterId" TEXT,
          type TEXT NOT NULL,
          difficulty TEXT NOT NULL DEFAULT 'MEDIUM',
          stem TEXT NOT NULL,
          options TEXT,
          "correctAnswer" TEXT,
          explanation TEXT,
          tags TEXT,
          "imageUrl" TEXT,
          "audioUrl" TEXT,
          "audioLoop" INTEGER NOT NULL DEFAULT 0,
          "audioLoopDelay" INTEGER NOT NULL DEFAULT 0,
          "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
          "sourceFile" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Test" (
          id TEXT PRIMARY KEY,
          "chapterId" TEXT,
          title TEXT NOT NULL,
          description TEXT,
          "durationMin" INTEGER NOT NULL DEFAULT 30,
          "isExam" BOOLEAN NOT NULL DEFAULT false,
          "examType" TEXT NOT NULL DEFAULT 'REGULAR',
          "passScore" INTEGER NOT NULL DEFAULT 40,
          "startAt" TIMESTAMP(3),
          "endAt" TIMESTAMP(3),
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
          "showResultImmediately" BOOLEAN NOT NULL DEFAULT true,
          "maxAttempts" INTEGER NOT NULL DEFAULT 1,
          "createdBy" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "TestItem" (
          id TEXT PRIMARY KEY,
          "testId" TEXT NOT NULL,
          "questionId" TEXT NOT NULL,
          points INTEGER NOT NULL DEFAULT 1,
          "order" INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS "Submission" (
          id TEXT PRIMARY KEY,
          "testId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          answers TEXT NOT NULL,
          score INTEGER,
          "maxScore" INTEGER,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "submittedAt" TIMESTAMP(3),
          graded BOOLEAN NOT NULL DEFAULT false,
          UNIQUE("testId", "userId")
        );
        CREATE TABLE IF NOT EXISTS "Book" (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          author TEXT,
          "coverUrl" TEXT,
          "pdfUrl" TEXT,
          "fileSizeKb" INTEGER,
          "pageCount" INTEGER,
          category TEXT,
          level TEXT,
          tags TEXT,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          downloads INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "VideoLesson" (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          "youtubeUrl" TEXT NOT NULL,
          "youtubeId" TEXT NOT NULL,
          "thumbnailUrl" TEXT,
          "durationMin" INTEGER NOT NULL DEFAULT 10,
          level TEXT,
          category TEXT,
          "chapterId" TEXT,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          views INTEGER NOT NULL DEFAULT 0,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "AudioLesson" (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          "audioUrl" TEXT NOT NULL,
          "durationSec" INTEGER NOT NULL,
          transcript TEXT,
          translation TEXT,
          level TEXT,
          category TEXT,
          tags TEXT,
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          plays INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "HomeCard" (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          section TEXT NOT NULL DEFAULT 'test',
          "imageUrl" TEXT,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          route TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "Batch" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT,
          "teacherId" TEXT,
          "startDate" TIMESTAMP(3),
          "endDate" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "BatchStudent" (
          id TEXT PRIMARY KEY,
          "batchId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("batchId", "userId")
        );
        CREATE TABLE IF NOT EXISTS "LiveRoom" (
          id TEXT PRIMARY KEY,
          "roomCode" TEXT NOT NULL UNIQUE,
          "hostId" TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          subject TEXT,
          "audioOnly" BOOLEAN NOT NULL DEFAULT true,
          "maxStudents" INTEGER NOT NULL DEFAULT 50,
          "isLive" BOOLEAN NOT NULL DEFAULT false,
          "startedAt" TIMESTAMP(3),
          "endedAt" TIMESTAMP(3),
          "recordingUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "LiveRoomAttendee" (
          id TEXT PRIMARY KEY,
          "roomId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          role TEXT NOT NULL,
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "leftAt" TIMESTAMP(3),
          "handRaised" BOOLEAN NOT NULL DEFAULT false,
          "micEnabled" BOOLEAN NOT NULL DEFAULT false,
          UNIQUE("roomId", "userId")
        );
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          id TEXT PRIMARY KEY,
          "actorId" TEXT,
          action TEXT NOT NULL,
          entity TEXT NOT NULL,
          "entityId" TEXT,
          metadata TEXT,
          ip TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "UserStat" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE,
          "totalExamsTaken" INTEGER NOT NULL DEFAULT 0,
          "totalCorrectAnswers" INTEGER NOT NULL DEFAULT 0,
          "totalQuestionsAnswered" INTEGER NOT NULL DEFAULT 0,
          "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "studyStreakDays" INTEGER NOT NULL DEFAULT 0,
          "lastStudyDate" TIMESTAMP(3),
          "totalTimeSpentMin" INTEGER NOT NULL DEFAULT 0,
          "booksRead" INTEGER NOT NULL DEFAULT 0,
          "audioLessonsCompleted" INTEGER NOT NULL DEFAULT 0,
          "badgesEarned" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "DeviceToken" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          platform TEXT NOT NULL,
          token TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          UNIQUE("userId", "platform", "token")
        );
        CREATE TABLE IF NOT EXISTS "BookProgress" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "bookId" TEXT NOT NULL,
          "currentPage" INTEGER NOT NULL DEFAULT 1,
          percent INTEGER NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT false,
          "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "bookId")
        );
        CREATE TABLE IF NOT EXISTS "AudioLessonProgress" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "audioLessonId" TEXT NOT NULL,
          "listenedSec" INTEGER NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT false,
          "lastListenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "audioLessonId")
        );
        CREATE TABLE IF NOT EXISTS "VideoLessonProgress" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "videoLessonId" TEXT NOT NULL,
          "watchedSec" INTEGER NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT false,
          "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "videoLessonId")
        );
        CREATE TABLE IF NOT EXISTS "LessonProgress" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "lessonId" TEXT NOT NULL,
          percent INTEGER NOT NULL DEFAULT 0,
          completed BOOLEAN NOT NULL DEFAULT false,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          UNIQUE("userId", "lessonId")
        );
        CREATE TABLE IF NOT EXISTS "QAQuestion" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "lessonId" TEXT,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          tags TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS "QAAnswer" (
          id TEXT PRIMARY KEY,
          "questionId" TEXT NOT NULL,
          "authorId" TEXT NOT NULL,
          body TEXT NOT NULL,
          "isAccepted" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "Enrollment" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL,
          "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "subjectId")
        );
        CREATE TABLE IF NOT EXISTS "LiveClass" (
          id TEXT PRIMARY KEY,
          "teacherId" TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          subject TEXT,
          "scheduledAt" TIMESTAMP(3) NOT NULL,
          "durationMin" INTEGER NOT NULL DEFAULT 60,
          "roomCode" TEXT NOT NULL UNIQUE,
          "isLive" BOOLEAN NOT NULL DEFAULT false,
          "endedAt" TIMESTAMP(3),
          "recordingUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "LiveAttendance" (
          id TEXT PRIMARY KEY,
          "classId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "leftAt" TIMESTAMP(3),
          UNIQUE("classId", "userId")
        );
        CREATE TABLE IF NOT EXISTS "BookChapter" (
          id TEXT PRIMARY KEY,
          "bookId" TEXT NOT NULL,
          title TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "startPage" INTEGER NOT NULL,
          "endPage" INTEGER NOT NULL,
          "audioUrl" TEXT
        );
        CREATE TABLE IF NOT EXISTS "BatchExam" (
          id TEXT PRIMARY KEY,
          "batchId" TEXT NOT NULL,
          "testId" TEXT NOT NULL,
          "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "dueAt" TIMESTAMP(3),
          UNIQUE("batchId", "testId")
        );
        CREATE TABLE IF NOT EXISTS "LiveRoomMessage" (
          id TEXT PRIMARY KEY,
          "roomId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "userName" TEXT NOT NULL,
          body TEXT NOT NULL,
          "isSystem" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS "ExamSettings" (
          id TEXT PRIMARY KEY,
          "testId" TEXT NOT NULL UNIQUE,
          "showTimer" BOOLEAN NOT NULL DEFAULT true,
          "allowPause" BOOLEAN NOT NULL DEFAULT false,
          "allowReview" BOOLEAN NOT NULL DEFAULT true,
          "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
          "passingScore" INTEGER NOT NULL DEFAULT 40,
          "maxAttempts" INTEGER NOT NULL DEFAULT 1,
          "negativeMarking" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "scheduleStartAt" TIMESTAMP(3),
          "scheduleEndAt" TIMESTAMP(3),
          "proctoringEnabled" BOOLEAN NOT NULL DEFAULT false
        );
      `;

      // Use Supabase REST API to run the SQL
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (!res.ok) {
        // If RPC doesn't exist, try using Prisma's raw query
        try {
          // Split SQL into individual statements
          const statements = sql.split(';').filter(s => s.trim().length > 0);
          for (const stmt of statements) {
            try {
              await db.$executeRawUnsafe(stmt + ';');
            } catch (e) {
              // Ignore "already exists" errors
              if (!String(e).includes('already exists')) {
                results.push(`SQL error: ${String(e).substring(0, 100)}`);
              }
            }
          }
          results.push("Tables created via Prisma raw SQL");
        } catch (e: any) {
          results.push(`Raw SQL failed: ${e.message?.substring(0, 100)}`);
        }
      } else {
        results.push("Tables created via Supabase RPC");
      }
    }

    // Now seed data
    try {
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

      results.push("Setup complete!");
    } catch (e: any) {
      results.push(`Seed error: ${e.message?.substring(0, 100)}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, results }, { status: 500 });
  }
}
