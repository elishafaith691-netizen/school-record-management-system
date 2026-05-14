import type { Role } from "@/lib/roles";

/** Admin or staff (registrar) may manage academic catalog and roster APIs. */
export function canManageAcademy(role: Role): boolean {
  return role === "admin" || role === "registrar";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}
