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

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.id AS instructor_id, i.user_id, i.employee_id, i.created_at,
              u.email, u.name, u.role
       FROM instructors i
       JOIN users u ON u.id = i.user_id
       ORDER BY u.name`,
    )
    .all() as Record<string, unknown>[];

  const filtered = q
    ? rows.filter((r) => {
        const blob = [
          r.name,
          r.email,
          r.employee_id,
        ]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ");
        return blob.includes(q);
      })
    : rows;

  return NextResponse.json({ instructors: filtered });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  let body: {
    email?: string;
    password?: string;
    name?: string;
    employeeId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();
  const employeeId =
    body.employeeId == null || body.employeeId === ""
      ? null
      : String(body.employeeId).trim();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "email, password, and name required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const userId = randomUUID();
  const instructorId = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, student_number, program_id)
       VALUES (?, ?, ?, ?, 'teacher', NULL, NULL)`,
    ).run(userId, email, password_hash, name);
    db.prepare(
      `INSERT INTO instructors (id, user_id, employee_id) VALUES (?, ?, ?)`,
    ).run(instructorId, userId, employeeId);
  });

  try {
    tx();
  } catch {
    return NextResponse.json(
      { error: "Email or employee ID already in use" },
      { status: 409 },
    );
  }

  const row = db
    .prepare(
      `SELECT i.id AS instructor_id, i.user_id, i.employee_id, i.created_at,
              u.email, u.name, u.role
       FROM instructors i
       JOIN users u ON u.id = i.user_id
       WHERE i.id = ?`,
    )
    .get(instructorId);
  return NextResponse.json({ instructor: row });
}
