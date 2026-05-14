import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";
import { canManageAcademy } from "@/lib/academy-access";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();

  const [{ programs }] = db
    .prepare(`SELECT COUNT(*) AS programs FROM programs`)
    .all() as { programs: number }[];
  const [{ subjects }] = db
    .prepare(`SELECT COUNT(*) AS subjects FROM subjects`)
    .all() as { subjects: number }[];
  const [{ instructors }] = db
    .prepare(`SELECT COUNT(*) AS instructors FROM instructors`)
    .all() as { instructors: number }[];
  const [{ students }] = db
    .prepare(`SELECT COUNT(*) AS students FROM users WHERE role = 'student'`)
    .all() as { students: number }[];
  const [{ enrollments }] = db
    .prepare(`SELECT COUNT(*) AS enrollments FROM enrollments`)
    .all() as { enrollments: number }[];
  const [{ courseOfferings }] = db
    .prepare(`SELECT COUNT(*) AS courseOfferings FROM courses`)
    .all() as { courseOfferings: number }[];

  const byProgram = db
    .prepare(
      `SELECT p.code, p.name,
              (SELECT COUNT(*) FROM subjects s WHERE s.program_id = p.id) AS subject_count,
              (SELECT COUNT(*) FROM users u WHERE u.program_id = p.id AND u.role = 'student') AS student_count
       FROM programs p
       ORDER BY p.code`,
    )
    .all();

  return NextResponse.json({
    programs,
    subjects,
    instructors,
    students,
    enrollments,
    courseOfferings,
    byProgram,
  });
}
