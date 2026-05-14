import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { Database } from "better-sqlite3";
import type { Role } from "@/lib/roles";

export type CreatableAccountRole = Exclude<Role, "admin">;

export const CREATABLE_ACCOUNT_ROLES: CreatableAccountRole[] = [
  "student",
  "teacher",
  "registrar",
];

export type CreatedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  student_number: string | null;
  created_at: string;
};

export function isCreatableAccountRole(
  value: string,
): value is CreatableAccountRole {
  return (CREATABLE_ACCOUNT_ROLES as string[]).includes(value);
}

export async function createUserAccount({
  db,
  email,
  password,
  name,
  role,
  studentNumber,
}: {
  db: Database;
  email: string;
  password: string;
  name: string;
  role: Role;
  studentNumber?: string | null;
}): Promise<CreatedUser> {
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, student_number)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email, passwordHash, name, role, studentNumber ?? null);

  return db
    .prepare(
      `SELECT id, email, name, role, student_number, created_at
       FROM users
       WHERE id = ?`,
    )
    .get(id) as CreatedUser;
}
