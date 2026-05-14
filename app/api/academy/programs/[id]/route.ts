import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";
import { canManageAcademy } from "@/lib/academy-access";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id } = await ctx.params;
  const db = getDb();
  const program = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM subjects s WHERE s.program_id = p.id) AS subject_count
       FROM programs p WHERE p.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const subjects = db
    .prepare(
      `SELECT id, program_id, code, title, sort_order, created_at
       FROM subjects WHERE program_id = ? ORDER BY sort_order, code`,
    )
    .all(id);
  return NextResponse.json({ program, subjects });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id } = await ctx.params;
  let body: { code?: string; name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM programs WHERE id = ?`).get(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const vals: unknown[] = [];
  if (body.code !== undefined) {
    const code = body.code.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    fields.push("code = ?");
    vals.push(code);
  }
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    fields.push("name = ?");
    vals.push(name);
  }
  if (body.description !== undefined) {
    fields.push("description = ?");
    vals.push(String(body.description).trim());
  }
  if (!fields.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }
  try {
    db.prepare(`UPDATE programs SET ${fields.join(", ")} WHERE id = ?`).run(
      ...vals,
      id,
    );
  } catch {
    return NextResponse.json({ error: "Code conflict" }, { status: 409 });
  }

  const program = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM subjects s WHERE s.program_id = p.id) AS subject_count
       FROM programs p WHERE p.id = ?`,
    )
    .get(id);
  return NextResponse.json({ program });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id } = await ctx.params;
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`UPDATE users SET program_id = NULL WHERE program_id = ?`).run(id);
    return db.prepare(`DELETE FROM programs WHERE id = ?`).run(id);
  });
  const res = tx();
  if (!res.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
