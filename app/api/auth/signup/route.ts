import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { sessionOptions } from "@/lib/session";
import type { AppSessionData } from "@/lib/auth-server";
import {
  createUserAccount,
  isCreatableAccountRole,
} from "@/lib/user-accounts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    studentNumber?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";
  const role = body.role?.trim().toLowerCase() ?? "";
  const studentNumber = body.studentNumber?.trim() || null;

  if (!email || !password || !name || !isCreatableAccountRole(role)) {
    return NextResponse.json(
      {
        error:
          "Name, email, password, and a student, teacher, or registrar role are required",
      },
      { status: 400 },
    );
  }

  if (role !== "student" && studentNumber) {
    return NextResponse.json(
      { error: "studentNumber only for student role" },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const user = await createUserAccount({
      db,
      email,
      password,
      name,
      role,
      studentNumber,
    });

    const session = await getIronSession<AppSessionData>(
      await cookies(),
      sessionOptions,
    );
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    };
    await session.save();

    return NextResponse.json({ user: session.user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Email or student number already in use" },
      { status: 409 },
    );
  }
}
