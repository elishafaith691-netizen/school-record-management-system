import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import {
  createUserAccount,
  isCreatableAccountRole,
} from "@/lib/user-accounts";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const users = db
    .prepare(
      `SELECT id, email, name, role, student_number, created_at FROM users ORDER BY role, name`,
    )
    .all();
  return NextResponse.json({ users, currentUserId: user.id });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    studentNumber?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();
  const role = body.role?.trim().toLowerCase();
  const studentNumber = body.studentNumber?.trim() || null;

  if (!email || !password || !name || !role || !isCreatableAccountRole(role)) {
    return NextResponse.json(
      {
        error:
          "email, password, name, and a student, teacher, or registrar role required",
      },
      { status: 400 },
    );
  }

  if (role !== "student" && studentNumber) {
    return NextResponse.json(
      { error: "studentNumber only for student role" },
      { status: 400 },
    );
  }

  const db = getDb();

  try {
    const created = await createUserAccount({
      db,
      email,
      password,
      name,
      role,
      studentNumber,
    });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Email or student number already in use" },
      { status: 409 },
    );
  }
}
