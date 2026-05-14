import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import type { Role } from "@/lib/roles";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AppSessionData = {
  user?: SessionUser;
};

export async function getSession(): Promise<IronSession<AppSessionData>> {
  return getIronSession<AppSessionData>(await cookies(), sessionOptions);
}

export async function requireUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session.user) return null;
  return session.user;
}

export function roleAllowed(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
