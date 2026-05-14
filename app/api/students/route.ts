import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser, roleAllowed } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  type Row = {
    id: string;
    name: string;
    email: string;
    student_number: string | null;
  };

  let rows: Row[];

  if (user.role === "student") {
    rows = db
      .prepare(
        `SELECT id, name, email, student_number FROM users
         WHERE id = ? AND role = 'student'`,
      )
      .all(user.id) as Row[];
  } else if (user.role === "teacher") {
    rows = db
      .prepare(
        `SELECT DISTINCT u.id, u.name, u.email, u.student_number
         FROM users u
         JOIN enrollments e ON e.student_id = u.id
         JOIN courses c ON c.id = e.course_id
         WHERE u.role = 'student' AND c.teacher_id = ?
         ORDER BY u.name`,
      )
      .all(user.id) as Row[];
  } else if (roleAllowed(user.role as Role, ["admin", "registrar"])) {
    rows = db
      .prepare(
        `SELECT id, name, email, student_number FROM users
         WHERE role = 'student' ORDER BY name`,
      )
      .all() as Row[];
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ students: rows });
}
