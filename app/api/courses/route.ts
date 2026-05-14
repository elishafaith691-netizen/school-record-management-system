import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import { isCourseProgram } from "@/lib/course-programs";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  if (roleAllowed(user.role as Role, ["admin", "registrar"])) {
    const courses = db
      .prepare(
        `SELECT c.*, u.name AS teacher_name
         FROM courses c
         JOIN users u ON u.id = c.teacher_id
         ORDER BY c.term DESC, c.code`,
      )
      .all();
    return NextResponse.json({ courses });
  }

  if (user.role === "teacher") {
    const courses = db
      .prepare(
        `SELECT c.*, u.name AS teacher_name
         FROM courses c
         JOIN users u ON u.id = c.teacher_id
         WHERE c.teacher_id = ?
         ORDER BY c.term DESC, c.code`,
      )
      .all(user.id);
    return NextResponse.json({ courses });
  }

  if (user.role === "student") {
    const courses = db
      .prepare(
        `SELECT c.*, u.name AS teacher_name
         FROM courses c
         JOIN users u ON u.id = c.teacher_id
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.student_id = ?
         ORDER BY c.term DESC, c.code`,
      )
      .all(user.id);
    return NextResponse.json({ courses });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    code?: string;
    title?: string;
    teacherId?: string;
    term?: string;
    program?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  const title = body.title?.trim();
  const teacherId = body.teacherId?.trim();
  const term = (body.term ?? "").trim();
  const program = (body.program ?? "").trim();
  if (!code || !title || !teacherId || !program) {
    return NextResponse.json(
      { error: "code, title, teacherId, and program required" },
      { status: 400 },
    );
  }
  if (!isCourseProgram(program)) {
    return NextResponse.json({ error: "Invalid program" }, { status: 400 });
  }

  const db = getDb();
  const teacher = db
    .prepare(`SELECT id FROM users WHERE id = ? AND role = 'teacher'`)
    .get(teacherId) as { id: string } | undefined;
  if (!teacher) {
    return NextResponse.json({ error: "Invalid teacher" }, { status: 400 });
  }

  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO courses (id, code, title, teacher_id, term, program) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, code, title, teacherId, term, program);
  } catch {
    return NextResponse.json(
      { error: "Course code must be unique for the term" },
      { status: 409 },
    );
  }

  const course = db
    .prepare(
      `SELECT c.*, u.name AS teacher_name FROM courses c
       JOIN users u ON u.id = c.teacher_id WHERE c.id = ?`,
    )
    .get(id);
  return NextResponse.json({ course });
}
