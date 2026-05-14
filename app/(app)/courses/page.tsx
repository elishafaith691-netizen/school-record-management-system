"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ListSearch } from "@/components/ListSearch";
import { COURSE_PROGRAMS, isCourseProgram } from "@/lib/course-programs";

type Course = {
  id: string;
  code: string;
  title: string;
  term: string;
  program: string;
  teacher_id: string;
  teacher_name: string;
};

type Teacher = { id: string; name: string; email: string };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [term, setTerm] = useState("Fall 2026");
  const [program, setProgram] = useState<(typeof COURSE_PROGRAMS)[number]>("BSIT");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [cRes, tRes] = await Promise.all([
      fetch("/api/courses"),
      fetch("/api/teachers"),
    ]);
    const cJson = (await cRes.json()) as { courses?: Course[]; error?: string };
    const tJson = (await tRes.json()) as { teachers?: Teacher[]; error?: string };
    if (!cRes.ok) {
      setError(cJson.error ?? "Failed to load courses");
      return;
    }
    if (!tRes.ok) {
      setError(tJson.error ?? "Failed to load teachers");
      return;
    }
    setCourses(cJson.courses ?? []);
    const tlist = tJson.teachers ?? [];
    setTeachers(tlist);
    if (tlist[0] && !teacherId) setTeacherId(tlist[0].id);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  async function addCourse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        title: title.trim(),
        teacherId,
        term: term.trim(),
        program,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create");
      return;
    }
    setCode("");
    setTitle("");
    await refresh();
  }

  async function patchProgram(courseId: string, program: string) {
    setError(null);
    const res = await fetch(`/api/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update program");
      return;
    }
    await refresh();
  }

  async function removeCourse(id: string) {
    if (!confirm("Delete this course? Enrollments and grades will be removed.")) return;
    setError(null);
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await refresh();
  }

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!courses || !q) return courses ?? [];
    return courses.filter((c) =>
      [c.code, c.title, c.program, c.term, c.teacher_name].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [courses, search]);

  if (error && !courses) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!courses || !teachers) {
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
      <h1 className="text-2xl font-semibold text-slate-900">Courses</h1>

      <form
        onSubmit={(e) => void addCourse(e)}
        className="mt-6 grid max-w-xl gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-slate-900">New course</h2>
        </div>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Code (e.g. BIO-101)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={program}
          onChange={(e) =>
            setProgram(e.target.value as (typeof COURSE_PROGRAMS)[number])
          }
          aria-label="Program"
        >
          {COURSE_PROGRAMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Add course
          </button>
        </div>
      </form>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <ListSearch
        id="course-search"
        value={search}
        onChange={setSearch}
        placeholder="Search by code, title, program, term, or teacher"
      />

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2">Term</th>
              <th className="px-3 py-2">Teacher</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{c.code}</td>
                <td className="px-3 py-2">{c.title}</td>
                <td className="px-3 py-2">
                  <select
                    className="max-w-[7rem] rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    value={isCourseProgram(c.program) ? c.program : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) void patchProgram(c.id, v);
                    }}
                    aria-label={`Program for ${c.code}`}
                  >
                    <option value="" disabled>
                      —
                    </option>
                    {COURSE_PROGRAMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{c.term || "—"}</td>
                <td className="px-3 py-2">{c.teacher_name}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void removeCourse(c.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
