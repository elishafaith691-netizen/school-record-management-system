export type Role = "student" | "teacher" | "admin" | "registrar";

export const ROLES: Role[] = ["student", "teacher", "admin", "registrar"];

export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}
