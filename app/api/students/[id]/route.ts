import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { canViewStudent } from "@/lib/access";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studentId } = await ctx.params;
  const db = getDb();

  const student = db
    .prepare(
      `SELECT id, name, email, student_number, role, created_at FROM users WHERE id = ?`,
    )
    .get(studentId) as
    | {
        id: string;
        name: string;
        email: string;
        student_number: string | null;
        role: string;
        created_at: string;
      }
    | undefined;

  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !canViewStudent(db, user.role as Role, user.id, studentId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = db
    .prepare(
      `SELECT e.id AS enrollment_id, c.id AS course_id, c.code, c.title, c.term,
              COALESCE(e.assigned_teacher_id, c.teacher_id) AS assigned_teacher_id,
              t.name AS assigned_teacher_name,
              e.enrolled_at
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN users t ON t.id = COALESCE(e.assigned_teacher_id, c.teacher_id)
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
    )
    .all(studentId) as {
    enrollment_id: string;
    course_id: string;
    code: string;
    title: string;
    term: string;
    assigned_teacher_id: string;
    assigned_teacher_name: string | null;
    enrolled_at: string;
  }[];

  const grades = db
    .prepare(
      `SELECT g.id, g.enrollment_id, g.score, g.letter_grade, g.term, g.notes, g.created_at,
              c.code AS course_code, c.title AS course_title
       FROM grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY g.created_at DESC`,
    )
    .all(studentId) as {
    id: string;
    enrollment_id: string;
    score: number;
    letter_grade: string | null;
    term: string;
    notes: string | null;
    created_at: string;
    course_code: string;
    course_title: string;
  }[];

  return NextResponse.json({
    student,
    enrollments,
    grades,
  });
}
