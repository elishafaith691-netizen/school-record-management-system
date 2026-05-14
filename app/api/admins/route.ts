import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { createUserAccount } from "@/lib/user-accounts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const actor = await requireUser();
  if (!actor || actor.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Name, email, and password required" },
      { status: 400 },
    );
  }

  try {
    const user = await createUserAccount({
      db: getDb(),
      email,
      password,
      name,
      role: "admin",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 },
    );
  }
}
