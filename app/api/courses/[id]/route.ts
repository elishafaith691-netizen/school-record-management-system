import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { isCourseProgram } from "@/lib/course-programs";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: {
    code?: string;
    title?: string;
    teacherId?: string;
    term?: string;
    program?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM courses WHERE id = ?`)
    .get(id) as { id: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.teacherId) {
    const teacher = db
      .prepare(`SELECT id FROM users WHERE id = ? AND role = 'teacher'`)
      .get(body.teacherId.trim()) as { id: string } | undefined;
    if (!teacher) {
      return NextResponse.json({ error: "Invalid teacher" }, { status: 400 });
    }
  }

  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (body.code !== undefined) {
    fields.push("code = ?");
    values.push(body.code.trim());
  }
  if (body.title !== undefined) {
    fields.push("title = ?");
    values.push(body.title.trim());
  }
  if (body.teacherId !== undefined) {
    fields.push("teacher_id = ?");
    values.push(body.teacherId.trim());
  }
  if (body.term !== undefined) {
    fields.push("term = ?");
    values.push(body.term.trim());
  }
  if (body.program !== undefined) {
    const program = body.program.trim();
    if (!isCourseProgram(program)) {
      return NextResponse.json({ error: "Invalid program" }, { status: 400 });
    }
    fields.push("program = ?");
    values.push(program);
  }
  if (!fields.length) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    db.prepare(
      `UPDATE courses SET ${fields.join(", ")} WHERE id = ?`,
    ).run(...values, id);
  } catch {
    return NextResponse.json(
      { error: "Course code must be unique for the term" },
      { status: 409 },
    );
  }

  const course = db
    .prepare(
      `SELECT c.*, u.name AS teacher_name FROM courses c
       JOIN users u ON u.id = c.teacher_id WHERE c.id = ?`,
    )
    .get(id);
  return NextResponse.json({ course });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getDb();
  const res = db.prepare(`DELETE FROM courses WHERE id = ?`).run(id);
  if (!res.changes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
