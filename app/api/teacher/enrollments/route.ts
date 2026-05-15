import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const enrollments = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.student_id, u.name AS student_name,
              c.id AS course_id, c.code AS course_code, c.title AS course_title, c.term
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = e.student_id
       WHERE COALESCE(e.assigned_teacher_id, c.teacher_id) = ?
       ORDER BY c.code, u.name`,
    )
    .all(user.id);
  return NextResponse.json({ enrollments });
}
