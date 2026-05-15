import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roleAllowed(user.role as Role, ["admin", "registrar"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.id, e.student_id, u.name AS student_name, u.email AS student_email,
              e.course_id, c.code AS course_code, c.title AS course_title,
              COALESCE(e.assigned_teacher_id, c.teacher_id) AS assigned_teacher_id,
              t.name AS assigned_teacher_name, t.email AS assigned_teacher_email,
              e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN users t ON t.id = COALESCE(e.assigned_teacher_id, c.teacher_id)
       ORDER BY e.enrolled_at DESC`,
    )
    .all();
  return NextResponse.json({ enrollments: rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || !roleAllowed(user.role as Role, ["admin", "registrar"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { studentId?: string; courseId?: string; teacherId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const studentId = body.studentId?.trim();
  const courseId = body.courseId?.trim();
  const requestedTeacherId = body.teacherId?.trim();
  if (!studentId || !courseId) {
    return NextResponse.json(
      { error: "studentId and courseId required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const student = db
    .prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`)
    .get(studentId) as { id: string } | undefined;
  if (!student) {
    return NextResponse.json({ error: "Invalid student" }, { status: 400 });
  }

  const course = db
    .prepare(`SELECT id, teacher_id FROM courses WHERE id = ?`)
    .get(courseId) as { id: string; teacher_id: string } | undefined;
  if (!course) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }

  const teacherId = requestedTeacherId || course.teacher_id;
  const teacher = db
    .prepare(`SELECT id FROM users WHERE id = ? AND role = 'teacher'`)
    .get(teacherId) as { id: string } | undefined;
  if (!teacher) {
    return NextResponse.json({ error: "Invalid teacher" }, { status: 400 });
  }

  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO enrollments (id, student_id, course_id, assigned_teacher_id)
       VALUES (?, ?, ?, ?)`,
    ).run(id, studentId, courseId, teacherId);
  } catch {
    return NextResponse.json(
      { error: "Student already enrolled in this course" },
      { status: 409 },
    );
  }

  const row = db
    .prepare(
      `SELECT e.id, e.student_id, u.name AS student_name,
              e.course_id, c.code AS course_code, c.title AS course_title,
              COALESCE(e.assigned_teacher_id, c.teacher_id) AS assigned_teacher_id,
              t.name AS assigned_teacher_name, t.email AS assigned_teacher_email,
              e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN users t ON t.id = COALESCE(e.assigned_teacher_id, c.teacher_id)
       WHERE e.id = ?`,
    )
    .get(id);
  return NextResponse.json({ enrollment: row });
}
