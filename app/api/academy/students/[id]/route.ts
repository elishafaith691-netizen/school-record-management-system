import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";
import { canManageAcademy } from "@/lib/academy-access";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type UserRow = {
  id: string;
  role: string;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser();
  if (!actor || !canManageAcademy(actor.role as Role)) return forbidden();

  const { id } = await ctx.params;
  let body: {
    name?: string;
    email?: string;
    studentNumber?: string | null;
    programId?: string | null;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .prepare(`SELECT id, role FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
  if (!existing || existing.role !== "student") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const vals: unknown[] = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    updates.push("name = ?");
    vals.push(name);
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    updates.push("email = ?");
    vals.push(email);
  }
  if (body.studentNumber !== undefined) {
    updates.push("student_number = ?");
    vals.push(
      body.studentNumber == null || body.studentNumber === ""
        ? null
        : String(body.studentNumber).trim(),
    );
  }
  if (body.programId !== undefined) {
    const pid =
      body.programId == null || body.programId === ""
        ? null
        : String(body.programId).trim();
    if (pid) {
      const ok = db.prepare(`SELECT id FROM programs WHERE id = ?`).get(pid);
      if (!ok) {
        return NextResponse.json({ error: "Invalid programId" }, { status: 400 });
      }
    }
    updates.push("program_id = ?");
    vals.push(pid);
  }
  if (body.password !== undefined && body.password !== "") {
    updates.push("password_hash = ?");
    vals.push(await bcrypt.hash(body.password, 10));
  }

  if (!updates.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...vals,
      id,
    );
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

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser();
  if (!actor || !canManageAcademy(actor.role as Role)) return forbidden();

  const { id } = await ctx.params;
  if (id === actor.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .prepare(`SELECT id, role FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
  if (!existing || existing.role !== "student") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const res = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    if (!res.changes) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot delete student while related enrollments or grades exist. Remove them first.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
