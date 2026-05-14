import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { sessionOptions } from "@/lib/session";
import type { AppSessionData } from "@/lib/auth-server";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, email, name, role, password_hash
       FROM users
       WHERE lower(trim(email)) = ?`,
    )
    .get(email) as
    | {
        id: string;
        email: string;
        name: string;
        role: string;
        password_hash: string;
      }
    | undefined;

  const roleNorm =
    typeof user?.role === "string" ? user.role.trim().toLowerCase() : "";
  if (!user || !isRole(roleNorm)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getIronSession<AppSessionData>(
    await cookies(),
    sessionOptions,
  );
  session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: roleNorm,
  };
  await session.save();

  return NextResponse.json({ user: session.user });
}
