"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Detail = {
  student: {
    id: string;
    name: string;
    email: string;
    student_number: string | null;
    created_at: string;
  };
  enrollments: {
    enrollment_id: string;
    course_id: string;
    code: string;
    title: string;
    term: string;
    enrolled_at: string;
  }[];
  grades: {
    id: string;
    enrollment_id: string;
    score: number;
    letter_grade: string | null;
    term: string;
    notes: string | null;
    created_at: string;
    course_code: string;
    course_title: string;
  }[];
};

export default function RecordDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/students/${id}`);
      const json = (await res.json()) as Detail & { error?: string };
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
  }, [id]);

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

  return (
    <div>
      <div className="mb-3">
        <BackButton />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">
        {data.student.name}
      </h1>
      <p className="text-sm text-slate-600">
        {data.student.student_number ?? "No student number"} · {data.student.email}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Enrollments</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Term</th>
                <th className="px-3 py-2">Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {data.enrollments.map((e) => (
                <tr key={e.enrollment_id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {e.code} — {e.title}
                  </td>
                  <td className="px-3 py-2">{e.term || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{e.enrolled_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Grades</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Letter</th>
                <th className="px-3 py-2">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {data.grades.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {g.course_code} — {g.course_title}
                  </td>
                  <td className="px-3 py-2">{g.score}</td>
                  <td className="px-3 py-2">{g.letter_grade ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{g.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
