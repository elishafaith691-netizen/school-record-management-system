import type Database from "better-sqlite3";
import {
  ACADEMIC_PROGRAM_CATALOG,
  MAX_SUBJECTS_PER_PROGRAM,
} from "@/lib/curriculum-catalog";

export function ensureAcademySchema(instance: Database.Database): void {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(program_id, code)
    );

    CREATE TABLE IF NOT EXISTS instructors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      employee_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_subjects_program ON subjects(program_id);
  `);

  const userCols = instance
    .prepare(`PRAGMA table_info(users)`)
    .all() as { name: string }[];
  if (!userCols.some((c) => c.name === "program_id")) {
    instance.exec(
      `ALTER TABLE users ADD COLUMN program_id TEXT REFERENCES programs(id)`,
    );
  }
  instance.exec(
    `CREATE INDEX IF NOT EXISTS idx_users_program ON users(program_id)`,
  );
}

/** Inserts the five canonical programs and four subjects each when the programs table is empty. */
export function bootstrapAcademicCatalogIfEmpty(instance: Database.Database): void {
  const { count } = instance
    .prepare(`SELECT COUNT(*) AS count FROM programs`)
    .get() as { count: number };
  if (count > 0) return;

  const insertProg = instance.prepare(
    `INSERT INTO programs (id, code, name, description) VALUES (?, ?, ?, ?)`,
  );
  const insertSub = instance.prepare(
    `INSERT INTO subjects (id, program_id, code, title, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );

  const tx = instance.transaction(() => {
    for (const p of ACADEMIC_PROGRAM_CATALOG) {
      const pid = `prog-${p.code.toLowerCase()}`;
      insertProg.run(pid, p.code, p.name, p.description);
      if (p.subjects.length !== MAX_SUBJECTS_PER_PROGRAM) {
        throw new Error(
          `Catalog program ${p.code} must have exactly ${MAX_SUBJECTS_PER_PROGRAM} subjects`,
        );
      }
      p.subjects.forEach((s, i) => {
        const sid = `sub-${p.code.toLowerCase()}-${i}`;
        insertSub.run(sid, pid, s.code, s.title, i);
      });
    }
  });
  tx();
}
