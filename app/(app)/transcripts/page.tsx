"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Student = { id: string; name: string; student_number: string | null };

type Transcript = {
  issuedAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    student_number: string | null;
    created_at: string;
  };
  entries: {
    code: string;
    title: string;
    term: string;
    score: number;
    letter_grade: string | null;
    recorded_at: string;
  }[];
  cumulativeAverage: number | null;
};

export default function TranscriptsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [data, setData] = useState<Transcript | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/students");
      const json = (await res.json()) as { students?: Student[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Failed to load students");
        return;
      }
      const list = json.students ?? [];
      setStudents(list);
      if (list[0]) setStudentId(list[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadTranscript(selectedStudentId = studentId) {
    if (!selectedStudentId) return;
    setError(null);
    setData(null);
    const res = await fetch(`/api/transcripts/${selectedStudentId}`);
    const json = (await res.json()) as Transcript & { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not load transcript");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      setData(null);
      const res = await fetch(`/api/transcripts/${studentId}`);
      const json = (await res.json()) as Transcript & { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error ?? "Could not load transcript");
        return;
      }
      setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (error && !students) {
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
      <h1 className="text-2xl font-semibold text-slate-900">Transcripts</h1>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="stu">
            Student
          </label>
          <select
            id="stu"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.student_number ?? s.id})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          onClick={() => void loadTranscript()}
        >
          Refresh
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {data ? (
        <div className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Student</p>
              <p className="text-lg font-semibold text-slate-900">{data.student.name}</p>
              <p className="text-sm text-slate-600">
                {data.student.student_number ?? "—"} · {data.student.email}
              </p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>Issued {new Date(data.issuedAt).toLocaleString()}</p>
              <p className="font-medium text-slate-900">
                Cumulative avg:{" "}
                {data.cumulativeAverage != null
                  ? data.cumulativeAverage.toFixed(2)
                  : "—"}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Letter</th>
                  <th className="px-3 py-2">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-600" colSpan={5}>
                      No graded courses yet.
                    </td>
                  </tr>
                ) : (
                  data.entries.map((e) => (
                    <tr key={`${e.code}-${e.recorded_at}`} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        {e.code} — {e.title}
                      </td>
                      <td className="px-3 py-2">{e.term || "—"}</td>
                      <td className="px-3 py-2">{e.score}</td>
                      <td className="px-3 py-2">{e.letter_grade ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{e.recorded_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
