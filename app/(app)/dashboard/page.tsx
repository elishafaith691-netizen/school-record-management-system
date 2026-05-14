import Link from "next/link";
import type { Role } from "@/lib/roles";
import { getSession } from "@/lib/auth-server";
import { getDb } from "@/lib/db";

type DashboardAction = { href: string; label: string; roles: Role[] };

const actions: DashboardAction[] = [
  {
    href: "/records",
    label: "View student records",
    roles: ["student", "teacher", "admin", "registrar"],
  },
  { href: "/grades", label: "Open grade history", roles: ["student", "teacher", "admin"] },
  { href: "/grades/submit", label: "Submit grades", roles: ["teacher"] },
  { href: "/courses", label: "Manage courses", roles: ["admin"] },
  {
    href: "/enrollment",
    label: "Enroll students",
    roles: ["admin", "registrar"],
  },
  { href: "/reports", label: "Generate reports", roles: ["admin", "registrar"] },
  { href: "/users", label: "Maintain user accounts", roles: ["admin"] },
  { href: "/transcripts", label: "Process transcripts", roles: ["admin", "registrar"] },
];

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const role = session.user?.role as Role;
  const visibleActions = role ? actions.filter((a) => a.roles.includes(role)) : [];

  const db = getDb();

  const [{ count: studentCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'student'`)
    .all() as { count: number }[];
  const [{ count: courseCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM courses`)
    .all() as { count: number }[];
  const [{ count: enrollmentCount }] = db
    .prepare(`SELECT COUNT(*) AS count FROM enrollments`)
    .all() as { count: number }[];
  const [{ avg: avgScore }] = db
    .prepare(`SELECT AVG(score) AS avg FROM grades`)
    .all() as { avg: number | null }[];

  let primaryStats: { title: string; value: string; hint?: string }[] = [
    { title: "Students", value: String(studentCount) },
    { title: "Courses", value: String(courseCount) },
    { title: "Enrollments", value: String(enrollmentCount) },
    {
      title: "Average score",
      value: avgScore == null ? "—" : avgScore.toFixed(1),
      hint: "Across all recorded grades",
    },
  ];

  if (role === "student" && session.user?.id) {
    const [{ count: myEnrollments }] = db
      .prepare(`SELECT COUNT(*) AS count FROM enrollments WHERE student_id = ?`)
      .all(session.user.id) as { count: number }[];
    const [{ count: myGrades }] = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM grades g JOIN enrollments e ON e.id = g.enrollment_id
         WHERE e.student_id = ?`,
      )
      .all(session.user.id) as { count: number }[];
    const [{ avg: myAvg }] = db
      .prepare(
        `SELECT AVG(g.score) AS avg
         FROM grades g JOIN enrollments e ON e.id = g.enrollment_id
         WHERE e.student_id = ?`,
      )
      .all(session.user.id) as { avg: number | null }[];
    primaryStats = [
      { title: "Your enrollments", value: String(myEnrollments) },
      { title: "Your grades", value: String(myGrades) },
      { title: "Your average", value: myAvg == null ? "—" : myAvg.toFixed(1) },
      { title: "Next step", value: "Records", hint: "Open Student records to review" },
    ];
  }

  if (role === "teacher" && session.user?.id) {
    const [{ count: myCourses }] = db
      .prepare(`SELECT COUNT(*) AS count FROM courses WHERE teacher_id = ?`)
      .all(session.user.id) as { count: number }[];
    const [{ count: myEnrollments }] = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         WHERE c.teacher_id = ?`,
      )
      .all(session.user.id) as { count: number }[];
    const [{ count: myGrades }] = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM grades g
         JOIN enrollments e ON e.id = g.enrollment_id
         JOIN courses c ON c.id = e.course_id
         WHERE c.teacher_id = ?`,
      )
      .all(session.user.id) as { count: number }[];
    primaryStats = [
      { title: "Your courses", value: String(myCourses) },
      { title: "Your enrollments", value: String(myEnrollments) },
      { title: "Grades recorded", value: String(myGrades) },
      { title: "Next step", value: "Submit", hint: "Post grades for your roster" },
    ];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Signed in as{" "}
          <span className="font-semibold capitalize">
            {role}
          </span>
        </div>
      </div>

      <section aria-label="Dashboard statistics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {primaryStats.map((s) => (
            <StatCard key={s.title} title={s.title} value={s.value} hint={s.hint} />
          ))}
        </div>
      </section>

      <section className="app-panel p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quick actions
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visibleActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                {a.label}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Open {a.href} to continue your workflow.
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
