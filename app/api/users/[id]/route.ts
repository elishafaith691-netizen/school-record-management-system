import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  student_number: string | null;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: {
    name?: string;
    email?: string;
    role?: string;
    studentNumber?: string | null;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id, email, name, role, student_number FROM users WHERE id = ?`,
    )
    .get(id) as UserRow | undefined;
  if (!existing) {
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

  const newRole =
    body.role !== undefined ? body.role.trim() : existing.role;
  if (body.role !== undefined) {
    if (!isRole(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (existing.role !== "admin" && newRole === "admin") {
      return NextResponse.json(
        { error: "Use the Add admin feature to create administrator accounts" },
        { status: 400 },
      );
    }
    updates.push("role = ?");
    vals.push(newRole);
  }

  const effectiveRole = body.role !== undefined ? newRole : existing.role;

  if (body.role !== undefined && effectiveRole !== "student") {
    updates.push("student_number = ?");
    vals.push(null);
  } else if (body.studentNumber !== undefined) {
    if (effectiveRole !== "student") {
      return NextResponse.json(
        { error: "studentNumber only for student role" },
        { status: 400 },
      );
    }
    updates.push("student_number = ?");
    vals.push(
      body.studentNumber == null || body.studentNumber === ""
        ? null
        : String(body.studentNumber).trim(),
    );
  }

  if (body.password !== undefined && body.password !== "") {
    updates.push("password_hash = ?");
    vals.push(await bcrypt.hash(body.password, 10));
  }

  if (!updates.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    db.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    ).run(...vals, id);
  } catch {
    return NextResponse.json(
      { error: "Email or student number already in use" },
      { status: 409 },
    );
  }

  const updated = db
    .prepare(
      `SELECT id, email, name, role, student_number, created_at FROM users WHERE id = ?`,
    )
    .get(id);
  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireUser();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const res = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    if (!res.changes) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot delete this user while related records exist (e.g. grades or courses). Remove or reassign them first.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
