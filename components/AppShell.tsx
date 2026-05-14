import Link from "next/link";
import type { Role } from "@/lib/roles";
import { LogoutButton } from "@/components/LogoutButton";

const nav: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["student", "teacher", "admin", "registrar"] },
  { href: "/records", label: "Student records", roles: ["student", "teacher", "admin", "registrar"] },
  { href: "/grades", label: "Grade history", roles: ["student", "teacher", "admin"] },
  { href: "/grades/submit", label: "Submit grades", roles: ["teacher"] },
  { href: "/courses", label: "Courses", roles: ["admin"] },
  { href: "/enrollment", label: "Enroll students", roles: ["admin", "registrar"] },
  { href: "/reports", label: "Reports", roles: ["admin", "registrar"] },
  { href: "/users", label: "User accounts", roles: ["admin"] },
  { href: "/transcripts", label: "Transcripts", roles: ["registrar", "admin"] },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const links = nav.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-full flex-col text-slate-900">
      <header className="sticky top-0 z-20 border-b border-blue-100/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              School Record Management System
            </p>
            <p className="text-sm text-slate-600">
              {user.name}{" "}
              <span className="text-slate-400">·</span>{" "}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                {user.role}
              </span>
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <nav className="mb-6 flex flex-wrap gap-2 md:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
