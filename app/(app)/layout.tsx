import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import type { Role } from "@/lib/roles";
import { isRole } from "@/lib/roles";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session.user || !isRole(session.user.role)) {
    redirect("/login");
  }

  const user = {
    ...session.user,
    role: session.user.role as Role,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
