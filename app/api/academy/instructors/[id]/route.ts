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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser();
  if (!actor || !canManageAcademy(actor.role as Role)) return forbidden();

  const { id: instructorId } = await ctx.params;
  let body: {
    name?: string;
    email?: string;
    employeeId?: string | null;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.id, i.user_id FROM instructors i WHERE i.id = ?`,
    )
    .get(instructorId) as { id: string; user_id: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userUpdates: string[] = [];
  const userVals: unknown[] = [];
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    userUpdates.push("name = ?");
    userVals.push(name);
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    userUpdates.push("email = ?");
    userVals.push(email);
  }
  if (body.password !== undefined && body.password !== "") {
    userUpdates.push("password_hash = ?");
    userVals.push(await bcrypt.hash(body.password, 10));
  }

  const instUpdates: string[] = [];
  const instVals: unknown[] = [];
  if (body.employeeId !== undefined) {
    instUpdates.push("employee_id = ?");
    instVals.push(
      body.employeeId == null || body.employeeId === ""
        ? null
        : String(body.employeeId).trim(),
    );
  }

  if (!userUpdates.length && !instUpdates.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    const tx = db.transaction(() => {
      if (userUpdates.length) {
        db.prepare(
          `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`,
        ).run(...userVals, row.user_id);
      }
      if (instUpdates.length) {
        db.prepare(
          `UPDATE instructors SET ${instUpdates.join(", ")} WHERE id = ?`,
        ).run(...instVals, instructorId);
      }
    });
    tx();
  } catch {
    return NextResponse.json(
      { error: "Email or employee ID conflict" },
      { status: 409 },
    );
  }

  const out = db
    .prepare(
      `SELECT i.id AS instructor_id, i.user_id, i.employee_id, i.created_at,
              u.email, u.name, u.role
       FROM instructors i
       JOIN users u ON u.id = i.user_id
       WHERE i.id = ?`,
    )
    .get(instructorId);
  return NextResponse.json({ instructor: out });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireUser();
  if (!actor || !canManageAcademy(actor.role as Role)) return forbidden();

  const { id: instructorId } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.user_id FROM instructors i WHERE i.id = ?`,
    )
    .get(instructorId) as { user_id: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ n }] = db
    .prepare(`SELECT COUNT(*) AS n FROM courses WHERE teacher_id = ?`)
    .all(row.user_id) as { n: number }[];
  if (n > 0) {
    return NextResponse.json(
      {
        error:
          "Instructor still assigned to course sections. Reassign or delete those courses first.",
      },
      { status: 409 },
    );
  }

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM instructors WHERE id = ?`).run(instructorId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(row.user_id);
  });
  try {
    tx();
  } catch {
    return NextResponse.json(
      { error: "Cannot delete instructor due to related records" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
