"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignInFlow = searchParams.get("flow") === "signin";
  const heading = isSignInFlow ? "Create account" : "Log in";
  const submitLabel = isSignInFlow ? "Sign in" : "Log in";
  const pendingLabel = isSignInFlow ? "Signing in..." : "Logging in...";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "registrar">(
    "student",
  );
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = isSignInFlow
        ? {
            email,
            password,
            name: name.trim(),
            role,
            studentNumber:
              role === "student" ? studentNumber.trim() || null : null,
          }
        : { email, password };

      const res = await fetch(
        isSignInFlow ? "/api/auth/signup" : "/api/auth/login",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const raw = await res.text();
      let data: { error?: string } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string };
        } catch {
          data = {};
        }
      }
      if (!res.ok) {
        setError(
          data.error ??
            (res.status >= 500
              ? "Server error. If you just upgraded Node.js, run: npm rebuild better-sqlite3"
              : isSignInFlow
                ? "Sign in failed"
                : "Login failed"),
        );
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-blue-100/40">
        <h1 className="text-2xl font-semibold text-slate-900">{heading}</h1>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          {isSignInFlow ? (
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignInFlow ? "new-password" : "current-password"}
              className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {isSignInFlow ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="role">
                  Account type
                </label>
                <select
                  id="role"
                  className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "student" | "teacher" | "registrar")
                  }
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="registrar">Registrar</option>
                </select>
              </div>
              {role === "student" ? (
                <div>
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="student-number"
                  >
                    Student number
                  </label>
                  <input
                    id="student-number"
                    type="text"
                    className="mt-1 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    required
                  />
                </div>
              ) : null}
            </>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="app-btn-primary w-full py-2.5"
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-blue-100/40">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <div className="mt-6 h-48 animate-pulse rounded-xl bg-slate-100" aria-hidden />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
