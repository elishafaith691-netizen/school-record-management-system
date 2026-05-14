"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ListSearch } from "@/components/ListSearch";

type Student = {
  id: string;
  name: string;
  email: string;
  student_number: string | null;
};

export default function RecordsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/students");
      const data = (await res.json()) as { students?: Student[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setStudents(data.students ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!students || !q) return students ?? [];
    return students.filter((s) =>
      [s.name, s.email, s.student_number ?? ""].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [search, students]);

  if (error) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!students) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <BackButton />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Student records</h1>
      <ListSearch
        id="student-record-search"
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or student number"
      />
      <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {filteredStudents.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-600">
            {search.trim() ? "No students match your search." : "No students visible."}
          </li>
        ) : (
          filteredStudents.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500">
                  {s.student_number ?? "—"} · {s.email}
                </p>
              </div>
              <Link
                href={`/records/${s.id}`}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
              >
                Open record
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
