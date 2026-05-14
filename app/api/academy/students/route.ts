import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";
import { canManageAcademy } from "@/lib/academy-access";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const programId = (searchParams.get("programId") ?? "").trim();

  const db = getDb();
  let sql = `
    SELECT u.id, u.email, u.name, u.role, u.student_number, u.program_id, u.created_at,
           p.code AS program_code, p.name AS program_name
    FROM users u
    LEFT JOIN programs p ON p.id = u.program_id
    WHERE u.role = 'student'
  `;
  const params: unknown[] = [];
  if (programId) {
    sql += ` AND u.program_id = ?`;
    params.push(programId);
  }
  sql += ` ORDER BY u.name`;
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  const filtered = q
    ? rows.filter((r) => {
        const blob = [
          r.name,
          r.email,
          r.student_number,
          r.program_code,
          r.program_name,
        ]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ");
        return blob.includes(q);
      })
    : rows;

  return NextResponse.json({ students: filtered });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  let body: {
    email?: string;
    password?: string;
    name?: string;
    studentNumber?: string | null;
    programId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();
  const studentNumber = body.studentNumber?.trim() || null;
  const programId =
    body.programId == null || body.programId === ""
      ? null
      : String(body.programId).trim();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "email, password, and name required" },
      { status: 400 },
    );
  }

  const db = getDb();
  if (programId) {
    const ok = db.prepare(`SELECT id FROM programs WHERE id = ?`).get(programId);
    if (!ok) {
      return NextResponse.json({ error: "Invalid programId" }, { status: 400 });
    }
  }

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);
  try {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, student_number, program_id)
       VALUES (?, ?, ?, ?, 'student', ?, ?)`,
    ).run(id, email, password_hash, name, studentNumber, programId);
  } catch {
    return NextResponse.json(
      { error: "Email or student number already in use" },
      { status: 409 },
    );
  }

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.student_number, u.program_id, u.created_at,
              p.code AS program_code, p.name AS program_name
       FROM users u
       LEFT JOIN programs p ON p.id = u.program_id
       WHERE u.id = ?`,
    )
    .get(id);
  return NextResponse.json({ student: row });
}
