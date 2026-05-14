import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { Role } from "@/lib/roles";
import { canManageAcademy } from "@/lib/academy-access";
import { MAX_SUBJECTS_PER_PROGRAM } from "@/lib/curriculum-catalog";

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

  const { id: programId } = await ctx.params;
  const db = getDb();
  const program = db.prepare(`SELECT id FROM programs WHERE id = ?`).get(programId);
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }
  const subjects = db
    .prepare(
      `SELECT id, program_id, code, title, sort_order, created_at
       FROM subjects WHERE program_id = ? ORDER BY sort_order, code`,
    )
    .all(programId);
  return NextResponse.json({ subjects });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  const { id: programId } = await ctx.params;
  let body: { code?: string; title?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  const title = body.title?.trim();
  if (!code || !title) {
    return NextResponse.json(
      { error: "code and title required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const prog = db.prepare(`SELECT id FROM programs WHERE id = ?`).get(programId);
  if (!prog) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const [{ count }] = db
    .prepare(`SELECT COUNT(*) AS count FROM subjects WHERE program_id = ?`)
    .all(programId) as { count: number }[];
  if (count >= MAX_SUBJECTS_PER_PROGRAM) {
    return NextResponse.json(
      {
        error: `Each program may have at most ${MAX_SUBJECTS_PER_PROGRAM} core subjects`,
      },
      { status: 400 },
    );
  }

  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : count;

  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO subjects (id, program_id, code, title, sort_order) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, programId, code, title, sortOrder);
  } catch {
    return NextResponse.json(
      { error: "Subject code must be unique within the program" },
      { status: 409 },
    );
  }

  const subject = db
    .prepare(`SELECT * FROM subjects WHERE id = ?`)
    .get(id);
  return NextResponse.json({ subject });
}
