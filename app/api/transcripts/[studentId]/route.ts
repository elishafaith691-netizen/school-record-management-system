import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import { canViewStudent } from "@/lib/access";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

/** Process Transcripts — extends View Student Records; registrar-facing. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ studentId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roleAllowed(user.role as Role, ["registrar", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await ctx.params;
  const db = getDb();

  if (!canViewStudent(db, user.role as Role, user.id, studentId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const student = db
    .prepare(
      `SELECT id, name, email, student_number, created_at FROM users
       WHERE id = ? AND role = 'student'`,
    )
    .get(studentId) as
    | {
        id: string;
        name: string;
        email: string;
        student_number: string | null;
        created_at: string;
      }
    | undefined;

  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = db
    .prepare(
      `SELECT c.code, c.title, c.term, g.score, g.letter_grade, g.created_at AS recorded_at
       FROM grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY g.created_at ASC`,
    )
    .all(studentId) as {
    code: string;
    title: string;
    term: string;
    score: number;
    letter_grade: string | null;
    recorded_at: string;
  }[];

  const [{ gpa }] = db
    .prepare(
      `SELECT AVG(g.score) AS gpa
       FROM grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       WHERE e.student_id = ?`,
    )
    .all(studentId) as { gpa: number | null }[];

  return NextResponse.json({
    issuedAt: new Date().toISOString(),
    student,
    entries: items,
    cumulativeAverage: gpa,
  });
}
