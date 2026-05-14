import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const teachers = db
    .prepare(
      `SELECT id, name, email FROM users WHERE role = 'teacher' ORDER BY name`,
    )
    .all();
  return NextResponse.json({ teachers });
}
