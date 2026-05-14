import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth-server";

export default async function Home() {
  const session = await getSession();
  if (session.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white px-8 py-12 shadow-sm sm:px-10 sm:py-14">
          <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem] sm:leading-tight">
            Welcome
          </h1>

          <p className="mt-4 text-center text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
            school record management system slsu-hc
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login?flow=signin"
              className="inline-flex w-full min-w-[10rem] items-center justify-center rounded-lg border border-transparent bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:w-auto"
            >
              Sign in
            </Link>
            <Link
              href="/login?flow=login"
              className="inline-flex w-full min-w-[10rem] items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:w-auto"
            >
              Log in
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} school record management system slsu-hc
        </p>
      </div>
    </div>
  );
}
