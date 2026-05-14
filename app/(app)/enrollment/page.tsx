import { getSession } from "@/lib/auth-server";
import { isRole } from "@/lib/roles";
import type { Role } from "@/lib/roles";
import { EnrollStudentsClient } from "./EnrollStudentsClient";

export default async function EnrollmentPage() {
  const session = await getSession();
  const raw = session.user?.role;
  const viewerRole: Role = raw && isRole(raw) ? raw : "student";

  return <EnrollStudentsClient viewerRole={viewerRole} />;
}
