import { NextResponse } from "next/server";
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
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id } = await ctx.params;
  let body: { code?: string; title?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(id) as
    | { program_id: string; code: string; title: string; sort_order: number }
    | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const vals: unknown[] = [];
  if (body.code !== undefined) {
    const code = body.code.trim();
    if (!code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    fields.push("code = ?");
    vals.push(code);
  }
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    fields.push("title = ?");
    vals.push(title);
  }
  if (body.sortOrder !== undefined) {
    const so = Math.floor(Number(body.sortOrder));
    if (!Number.isFinite(so)) {
      return NextResponse.json({ error: "Invalid sortOrder" }, { status: 400 });
    }
    fields.push("sort_order = ?");
    vals.push(so);
  }
  if (!fields.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    db.prepare(`UPDATE subjects SET ${fields.join(", ")} WHERE id = ?`).run(
      ...vals,
      id,
    );
  } catch {
    return NextResponse.json({ error: "Code conflict in program" }, { status: 409 });
  }

  const subject = db.prepare(`SELECT * FROM subjects WHERE id = ?`).get(id);
  return NextResponse.json({ subject });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id } = await ctx.params;
  const db = getDb();
  const res = db.prepare(`DELETE FROM subjects WHERE id = ?`).run(id);
  if (!res.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
