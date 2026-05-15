import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import { canViewStudent, teacherOwnsEnrollment } from "@/lib/access";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const studentIdParam = url.searchParams.get("studentId");
  const db = getDb();

  let studentFilter: string | null = null;
  if (user.role === "student") {
    studentFilter = user.id;
  } else if (studentIdParam) {
    if (
      !canViewStudent(db, user.role as Role, user.id, studentIdParam)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    studentFilter = studentIdParam;
  } else if (user.role === "teacher") {
    const rows = db
      .prepare(
        `SELECT g.id, g.enrollment_id, g.score, g.letter_grade, g.term, g.notes, g.created_at,
                e.student_id, u.name AS student_name, c.code AS course_code, c.title AS course_title
         FROM grades g
         JOIN enrollments e ON e.id = g.enrollment_id
         JOIN users u ON u.id = e.student_id
         JOIN courses c ON c.id = e.course_id
         WHERE COALESCE(e.assigned_teacher_id, c.teacher_id) = ?
         ORDER BY g.created_at DESC`,
      )
      .all(user.id);
    return NextResponse.json({ grades: rows });
  } else if (roleAllowed(user.role as Role, ["admin", "registrar"])) {
    const rows = db
      .prepare(
        `SELECT g.id, g.enrollment_id, g.score, g.letter_grade, g.term, g.notes, g.created_at,
                e.student_id, u.name AS student_name, c.code AS course_code, c.title AS course_title
         FROM grades g
         JOIN enrollments e ON e.id = g.enrollment_id
         JOIN users u ON u.id = e.student_id
         JOIN courses c ON c.id = e.course_id
         ORDER BY g.created_at DESC`,
      )
      .all();
    return NextResponse.json({ grades: rows });
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = db
    .prepare(
      `SELECT g.id, g.enrollment_id, g.score, g.letter_grade, g.term, g.notes, g.created_at,
              e.student_id, u.name AS student_name, c.code AS course_code, c.title AS course_title
       FROM grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY g.created_at DESC`,
    )
    .all(studentFilter!);
  return NextResponse.json({ grades: rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    enrollmentId?: string;
    score?: number;
    letterGrade?: string | null;
    term?: string;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const enrollmentId = body.enrollmentId?.trim();
  const score = body.score;
  if (!enrollmentId || typeof score !== "number" || Number.isNaN(score)) {
    return NextResponse.json(
      { error: "enrollmentId and numeric score required" },
      { status: 400 },
    );
  }

  const db = getDb();
  if (!teacherOwnsEnrollment(db, user.id, enrollmentId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const term = (body.term ?? "").trim();
  const letterGrade = body.letterGrade?.trim() || null;
  const notes = body.notes?.trim() || null;
  const id = randomUUID();

  db.prepare(
    `INSERT INTO grades (id, enrollment_id, score, letter_grade, term, submitted_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    enrollmentId,
    score,
    letterGrade,
    term || "",
    user.id,
    notes,
  );

  const row = db
    .prepare(`SELECT * FROM grades WHERE id = ?`)
    .get(id) as Record<string, unknown>;
  return NextResponse.json({ grade: row });
}
