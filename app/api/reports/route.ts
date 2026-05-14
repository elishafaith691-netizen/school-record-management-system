import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

/** Generate Reports (UML «include» View Student Records): aggregates over student data. */
export async function GET() {
  const user = await requireUser();
  if (!user || !roleAllowed(user.role as Role, ["admin", "registrar"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();

  const [{ count: studentCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'student'`)
    .all() as { count: number }[];

  const [{ count: courseCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM courses`)
    .all() as { count: number }[];

  const [{ count: enrollmentCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM enrollments`)
    .all() as { count: number }[];

  const [{ count: gradeCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM grades`)
    .all() as { count: number }[];

  const [{ avg: overallAvg }] = db
    .prepare(`SELECT AVG(score) AS avg FROM grades`)
    .all() as { avg: number | null }[];

  const students = db
    .prepare(
      `SELECT u.id, u.name, u.student_number,
              COUNT(DISTINCT e.id) AS enrollment_count,
              COUNT(g.id) AS grade_count,
              AVG(g.score) AS avg_score
       FROM users u
       LEFT JOIN enrollments e ON e.student_id = u.id
       LEFT JOIN grades g ON g.enrollment_id = e.id
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY u.name`,
    )
    .all() as {
    id: string;
    name: string;
    student_number: string | null;
    enrollment_count: number;
    grade_count: number;
    avg_score: number | null;
  }[];

  return NextResponse.json({
    summary: {
      students: studentCount,
      courses: courseCount,
      enrollments: enrollmentCount,
      grades: gradeCount,
      averageScore: overallAvg,
    },
    students,
  });
}
