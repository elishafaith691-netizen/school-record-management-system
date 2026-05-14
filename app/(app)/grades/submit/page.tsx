"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Enr = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  course_code: string;
  course_title: string;
  term: string;
};

export default function SubmitGradesPage() {
  const [enrollments, setEnrollments] = useState<Enr[] | null>(null);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [score, setScore] = useState("");
  const [letterGrade, setLetterGrade] = useState("");
  const [term, setTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/teacher/enrollments");
      const data = (await res.json()) as { enrollments?: Enr[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      const list = data.enrollments ?? [];
      setEnrollments(list);
      if (list[0]) setEnrollmentId(list[0].enrollment_id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const num = Number(score);
    if (!enrollmentId || Number.isNaN(num)) {
      setError("Choose an enrollment and enter a numeric score.");
      return;
    }
    const res = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentId,
        score: num,
        letterGrade: letterGrade.trim() || null,
        term: term.trim(),
        notes: notes.trim() || null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not submit");
      return;
    }
    setMessage("Grade saved.");
    setScore("");
    setLetterGrade("");
    setNotes("");
  }

  if (error && !enrollments) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!enrollments) {
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
      <h1 className="text-2xl font-semibold text-slate-900">Submit grades</h1>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-6 max-w-lg space-y-4 rounded-xl border border-slate-200 p-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="enr">
            Enrollment
          </label>
          <select
            id="enr"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={enrollmentId}
            onChange={(e) => setEnrollmentId(e.target.value)}
          >
            {enrollments.map((e) => (
              <option key={e.enrollment_id} value={e.enrollment_id}>
                {e.student_name} — {e.course_code} ({e.term || "term n/a"})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="score">
            Score
          </label>
          <input
            id="score"
            type="number"
            step="0.1"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="letter">
            Letter grade (optional)
          </label>
          <input
            id="letter"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={letterGrade}
            onChange={(e) => setLetterGrade(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="term">
            Term label (optional)
          </label>
          <input
            id="term"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="notes">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit grade
        </button>
      </form>
    </div>
  );
}
