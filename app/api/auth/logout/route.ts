import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import type { AppSessionData } from "@/lib/auth-server";

export async function POST() {
  const session = await getIronSession<AppSessionData>(
    await cookies(),
    sessionOptions,
  );
  session.destroy();
  return NextResponse.json({ ok: true });
}
