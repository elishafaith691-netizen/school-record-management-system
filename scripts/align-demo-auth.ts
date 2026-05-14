import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

/** Keeps existing data but ensures demo emails + password123 match the app docs. */
const DEMO_PASSWORD = "password123";

const DEMO_USERS: {
  id: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "admin" | "registrar";
  studentNumber: string | null;
  programId?: string | null;
}[] = [
  {
    id: "u-student-1",
    email: "student@school.edu",
    name: "Alex Student",
    role: "student",
    studentNumber: "STU-1001",
    programId: "prog-bsit",
  },
  {
    id: "u-teacher-1",
    email: "teacher@school.edu",
    name: "Taylor Teacher",
    role: "teacher",
    studentNumber: null,
  },
  {
    id: "u-admin-1",
    email: "admin@school.edu",
    name: "Avery Admin",
    role: "admin",
    studentNumber: null,
  },
  {
    id: "u-staff-1",
    email: "registrar@school.edu",
    name: "Sam Staff",
    role: "registrar",
    studentNumber: null,
  },
];

const root = process.cwd();
const file = path.join(root, "data", "school.db");

if (!fs.existsSync(file)) {
  console.error("No database at data/school.db. Run: npm run seed");
  process.exit(1);
}

const db = new Database(file);
const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const userColumns = db
  .prepare(`PRAGMA table_info(users)`)
  .all() as { name: string }[];
const hasProgramId = userColumns.some((c) => c.name === "program_id");

const hasRegistrar = db
  .prepare(`SELECT 1 AS ok FROM users WHERE lower(trim(email)) = 'registrar@school.edu'`)
  .get() as { ok: number } | undefined;
const staffRow = db
  .prepare(`SELECT id FROM users WHERE lower(trim(email)) = 'staff@school.edu'`)
  .get() as { id: string } | undefined;

if (!hasRegistrar && staffRow) {
  db.prepare(`UPDATE users SET email = ?, password_hash = ? WHERE id = ?`).run(
    "registrar@school.edu",
    hash,
    staffRow.id,
  );
  console.log("Updated legacy staff@school.edu to registrar@school.edu");
}

function clearConflictingIdentity(
  id: string,
  email: string,
  studentNumber: string | null,
) {
  db.prepare(
    `UPDATE users
     SET email = email || '.old'
     WHERE id <> ? AND lower(trim(email)) = ?`,
  ).run(id, email);

  if (studentNumber) {
    db.prepare(
      `UPDATE users
       SET student_number = NULL
       WHERE id <> ? AND student_number = ?`,
    ).run(id, studentNumber);
  }
}

function ensureDemoUser(user: (typeof DEMO_USERS)[number]) {
  clearConflictingIdentity(user.id, user.email, user.studentNumber);

  const existing = db
    .prepare(`SELECT id FROM users WHERE id = ?`)
    .get(user.id) as { id: string } | undefined;

  if (existing) {
    const sql = hasProgramId
      ? `UPDATE users
         SET email = ?, password_hash = ?, name = ?, role = ?, student_number = ?, program_id = ?
         WHERE id = ?`
      : `UPDATE users
         SET email = ?, password_hash = ?, name = ?, role = ?, student_number = ?
         WHERE id = ?`;
    const args = hasProgramId
      ? [
          user.email,
          hash,
          user.name,
          user.role,
          user.studentNumber,
          user.programId ?? null,
          user.id,
        ]
      : [user.email, hash, user.name, user.role, user.studentNumber, user.id];
    db.prepare(sql).run(...args);
    console.log(`Updated demo user: ${user.email}`);
    return;
  }

  const sql = hasProgramId
    ? `INSERT INTO users (id, email, password_hash, name, role, student_number, program_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    : `INSERT INTO users (id, email, password_hash, name, role, student_number)
       VALUES (?, ?, ?, ?, ?, ?)`;
  const args = hasProgramId
    ? [
        user.id,
        user.email,
        hash,
        user.name,
        user.role,
        user.studentNumber,
        user.programId ?? null,
      ]
    : [user.id, user.email, hash, user.name, user.role, user.studentNumber];
  db.prepare(sql).run(...args);
  console.log(`Created demo user: ${user.email}`);
}

for (const user of DEMO_USERS) {
  ensureDemoUser(user);
}

db.prepare(
  `INSERT INTO instructors (id, user_id, employee_id)
   VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     user_id = excluded.user_id,
     employee_id = excluded.employee_id`,
).run("ins-teacher-1", "u-teacher-1", "EMP-9001");

db.prepare(
  `INSERT INTO courses (id, code, title, teacher_id, term, program)
   VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     code = excluded.code,
     title = excluded.title,
     teacher_id = excluded.teacher_id,
     term = excluded.term,
     program = excluded.program`,
).run(
  "c-demo-1",
  "DEMO-101",
  "Sample course section (BSIT)",
  "u-teacher-1",
  "Fall 2026",
  "BSIT",
);

db.prepare(
  `INSERT INTO enrollments (id, student_id, course_id)
   VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     student_id = excluded.student_id,
     course_id = excluded.course_id`,
).run("e-1", "u-student-1", "c-demo-1");

db.prepare(
  `INSERT INTO grades (id, enrollment_id, score, letter_grade, term, submitted_by, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     enrollment_id = excluded.enrollment_id,
     score = excluded.score,
     letter_grade = excluded.letter_grade,
     term = excluded.term,
     submitted_by = excluded.submitted_by,
     notes = excluded.notes`,
).run(
  "g-1",
  "e-1",
  88,
  "B+",
  "Fall 2026",
  "u-teacher-1",
  "Strong exam performance",
);

db.close();

console.log(
  "\nDone. Sign in with student / teacher / admin / registrar @school.edu; password:",
  DEMO_PASSWORD,
);
