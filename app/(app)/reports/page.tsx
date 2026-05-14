"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Report = {
  summary: {
    students: number;
    courses: number;
    enrollments: number;
    grades: number;
    averageScore: number | null;
  };
  students: {
    id: string;
    name: string;
    student_number: string | null;
    enrollment_count: number;
    grade_count: number;
    avg_score: number | null;
  }[];
};

export default function ReportsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/reports");
      const json = (await res.json()) as Report & { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Failed to load");
        return;
      }
      setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  if (!data) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div>
      <div className="mb-3">
        <BackButton />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Students</p>
          <p className="text-2xl font-semibold text-slate-900">{s.students}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Courses</p>
          <p className="text-2xl font-semibold text-slate-900">{s.courses}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Enrollments</p>
          <p className="text-2xl font-semibold text-slate-900">{s.enrollments}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Avg score</p>
          <p className="text-2xl font-semibold text-slate-900">
            {s.averageScore != null ? s.averageScore.toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Enrollments</th>
              <th className="px-3 py-2">Grades</th>
              <th className="px-3 py-2">Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-slate-600">
                  {row.student_number ?? "—"}
                </td>
                <td className="px-3 py-2">{row.enrollment_count}</td>
                <td className="px-3 py-2">{row.grade_count}</td>
                <td className="px-3 py-2">
                  {row.avg_score != null ? row.avg_score.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
