import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import {
  ACADEMIC_PROGRAM_CATALOG,
  MAX_SUBJECTS_PER_PROGRAM,
} from "../lib/curriculum-catalog";

const root = process.cwd();
const dir = path.join(root, "data");
const file = path.join(dir, "school.db");

if (fs.existsSync(file)) {
  fs.unlinkSync(file);
}
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(file);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student','teacher','admin','registrar')),
    student_number TEXT UNIQUE,
    program_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE programs (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(program_id, code)
  );

  CREATE TABLE instructors (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    term TEXT NOT NULL DEFAULT '',
    program TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(code, term)
  );

  CREATE TABLE enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, course_id)
  );

  CREATE TABLE grades (
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

const password = bcrypt.hashSync("password123", 10);

const progBsit = "prog-bsit";

const insertProg = db.prepare(
  `INSERT INTO programs (id, code, name, description) VALUES (?, ?, ?, ?)`,
);
const insertSub = db.prepare(
  `INSERT INTO subjects (id, program_id, code, title, sort_order) VALUES (?, ?, ?, ?, ?)`,
);

for (const p of ACADEMIC_PROGRAM_CATALOG) {
  const pid = `prog-${p.code.toLowerCase()}`;
  insertProg.run(pid, p.code, p.name, p.description);
  if (p.subjects.length !== MAX_SUBJECTS_PER_PROGRAM) {
    throw new Error(`Seed: ${p.code} must have ${MAX_SUBJECTS_PER_PROGRAM} subjects`);
  }
  p.subjects.forEach((s, i) => {
    insertSub.run(`sub-${p.code.toLowerCase()}-${i}`, pid, s.code, s.title, i);
  });
}

const users = [
  {
    id: "u-student-1",
    email: "student@school.edu",
    name: "Alex Student",
    role: "student",
    student_number: "STU-1001",
    program_id: progBsit,
  },
  {
    id: "u-student-2",
    email: "jamie@school.edu",
    name: "Jamie Lee",
    role: "student",
    student_number: "STU-1002",
    program_id: "prog-bsed",
  },
  {
    id: "u-teacher-1",
    email: "teacher@school.edu",
    name: "Taylor Teacher",
    role: "teacher",
    student_number: null,
    program_id: null,
  },
  {
    id: "u-admin-1",
    email: "admin@school.edu",
    name: "Avery Admin",
    role: "admin",
    student_number: null,
    program_id: null,
  },
  {
    id: "u-staff-1",
    email: "registrar@school.edu",
    name: "Sam Staff",
    role: "registrar",
    student_number: null,
    program_id: null,
  },
] as const;

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, name, role, student_number, program_id)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
for (const u of users) {
  insertUser.run(
    u.id,
    u.email,
    password,
    u.name,
    u.role,
    u.student_number,
    u.program_id,
  );
}

db.prepare(
  `INSERT INTO instructors (id, user_id, employee_id) VALUES (?, ?, ?)`,
).run("ins-teacher-1", "u-teacher-1", "EMP-9001");

db.prepare(
  `INSERT INTO courses (id, code, title, teacher_id, term, program) VALUES (?, ?, ?, ?, ?, ?)`,
).run(
  "c-demo-1",
  "DEMO-101",
  "Sample course section (BSIT)",
  "u-teacher-1",
  "Fall 2026",
  "BSIT",
);
db.prepare(
  `INSERT INTO courses (id, code, title, teacher_id, term, program) VALUES (?, ?, ?, ?, ?, ?)`,
).run(
  "c-demo-2",
  "DEMO-102",
  "Sample course section (BSED)",
  "u-teacher-1",
  "Fall 2026",
  "BSED",
);

const en1 = "e-1";
const en2 = "e-2";
const en3 = "e-3";
db.prepare(
  `INSERT INTO enrollments (id, student_id, course_id, assigned_teacher_id)
   VALUES (?, ?, ?, ?)`,
).run(en1, "u-student-1", "c-demo-1", "u-teacher-1");
db.prepare(
  `INSERT INTO enrollments (id, student_id, course_id, assigned_teacher_id)
   VALUES (?, ?, ?, ?)`,
).run(en2, "u-student-1", "c-demo-2", "u-teacher-1");
db.prepare(
  `INSERT INTO enrollments (id, student_id, course_id, assigned_teacher_id)
   VALUES (?, ?, ?, ?)`,
).run(en3, "u-student-2", "c-demo-1", "u-teacher-1");

db.prepare(
  `INSERT INTO grades (id, enrollment_id, score, letter_grade, term, submitted_by, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
).run(
  "g-1",
  en1,
  88,
  "B+",
  "Fall 2026",
  "u-teacher-1",
  "Strong exam performance",
);

db.close();
console.log("Seeded database at", file);
console.log("Demo logins (password for all: password123):");
console.log("  student@school.edu");
console.log("  teacher@school.edu");
console.log("  registrar@school.edu");
console.log("  admin@school.edu");
