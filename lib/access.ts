import type { Database } from "better-sqlite3";
import type { Role } from "@/lib/roles";

export function canViewStudent(
  db: Database,
  viewerRole: Role,
  viewerId: string,
  targetStudentId: string,
): boolean {
  if (viewerRole === "admin" || viewerRole === "registrar") return true;
  if (viewerRole === "student") return viewerId === targetStudentId;
  if (viewerRole === "teacher") {
    const row = db
      .prepare(
        `SELECT 1 AS ok FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = ? AND c.teacher_id = ?
         LIMIT 1`,
      )
      .get(targetStudentId, viewerId) as { ok: number } | undefined;
    return !!row;
  }
  return false;
}

export function teacherOwnsEnrollment(
  db: Database,
  teacherId: string,
  enrollmentId: string,
): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = ? AND c.teacher_id = ?
       LIMIT 1`,
    )
    .get(enrollmentId, teacherId) as { ok: number } | undefined;
  return !!row;
}
