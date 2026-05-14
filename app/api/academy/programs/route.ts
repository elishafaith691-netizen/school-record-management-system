import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
      `SELECT p.*,
              (SELECT COUNT(*) FROM subjects s WHERE s.program_id = p.id) AS subject_count
       FROM programs p
       ORDER BY p.code`,
    )
    .all() as Record<string, unknown>[];

  const filtered = q
    ? rows.filter((r) => {
        const code = String(r.code ?? "").toLowerCase();
        const name = String(r.name ?? "").toLowerCase();
        return code.includes(q) || name.includes(q);
      })
    : rows;

  return NextResponse.json({ programs: filtered });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || !canManageAcademy(user.role as Role)) return forbidden();

  let body: { code?: string; name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim();
  const description = (body.description ?? "").trim();
  if (!code || !name) {
    return NextResponse.json(
      { error: "code and name required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO programs (id, code, name, description) VALUES (?, ?, ?, ?)`,
    ).run(id, code, name, description);
  } catch {
    return NextResponse.json(
      { error: "Program code must be unique" },
      { status: 409 },
    );
  }

  const row = db
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM subjects s WHERE s.program_id = p.id) AS subject_count
       FROM programs p WHERE p.id = ?`,
    )
    .get(id);
  return NextResponse.json({ program: row });
}
