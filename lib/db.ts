import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  bootstrapAcademicCatalogIfEmpty,
  ensureAcademySchema,
} from "@/lib/db-academy-bootstrap";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "school.db");
  const instance = new Database(file);
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student','teacher','admin','registrar')),
      student_number TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term TEXT NOT NULL DEFAULT '',
      program TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(code, term)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assigned_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
      score REAL NOT NULL,
      letter_grade TEXT,
      term TEXT NOT NULL DEFAULT '',
      submitted_by TEXT NOT NULL REFERENCES users(id),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const courseColumns = instance
    .prepare(`PRAGMA table_info(courses)`)
    .all() as { name: string }[];
  if (!courseColumns.some((c) => c.name === "program")) {
    instance.exec(
      `ALTER TABLE courses ADD COLUMN program TEXT NOT NULL DEFAULT ''`,
    );
  }

  const enrollmentColumns = instance
    .prepare(`PRAGMA table_info(enrollments)`)
    .all() as { name: string }[];
  if (!enrollmentColumns.some((c) => c.name === "assigned_teacher_id")) {
    instance.exec(
      `ALTER TABLE enrollments ADD COLUMN assigned_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL`,
    );
    instance.exec(
      `UPDATE enrollments
       SET assigned_teacher_id = (
         SELECT teacher_id FROM courses WHERE courses.id = enrollments.course_id
       )
       WHERE assigned_teacher_id IS NULL`,
    );
  }

  ensureAcademySchema(instance);
  bootstrapAcademicCatalogIfEmpty(instance);

  db = instance;
  return instance;
}
