"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ListSearch } from "@/components/ListSearch";
import {
  COURSE_PROGRAMS,
  type CourseProgram,
} from "@/lib/course-programs";
import type { Role } from "@/lib/roles";

type Student = { id: string; name: string; email: string };
type Course = {
  id: string;
  code: string;
  title: string;
  term: string;
  program: string;
};

export function EnrollStudentsClient({ viewerRole }: { viewerRole: Role }) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [programFilter, setProgramFilter] = useState<CourseProgram>("BSIT");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/courses"),
      ]);
      const sJson = (await sRes.json()) as {
        students?: { id: string; name: string; email: string }[];
        error?: string;
      };
      const cJson = (await cRes.json()) as { courses?: Course[]; error?: string };
      if (cancelled) return;
      if (!sRes.ok) {
        setError(sJson.error ?? "Failed to load students");
        return;
      }
      if (!cRes.ok) {
        setError(cJson.error ?? "Failed to load courses");
        return;
      }
      const sl = sJson.students ?? [];
      const cl = (cJson.courses ?? []) as Course[];
      setStudents(sl);
      setCourses(cl);
      if (sl[0]) setStudentId(sl[0].id);
      const prog =
        COURSE_PROGRAMS.find((p) => cl.some((c) => c.program === p)) ?? "BSIT";
      setProgramFilter(prog);
      setCourseId(cl.find((c) => c.program === prog)?.id ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshStudentList(selectId?: string) {
    const sRes = await fetch("/api/students");
    const sJson = (await sRes.json()) as {
      students?: Student[];
      error?: string;
    };
    if (!sRes.ok) {
      setError(sJson.error ?? "Failed to load students");
      return;
    }
    const sl = sJson.students ?? [];
    setStudents(sl);
    if (selectId && sl.some((s) => s.id === selectId)) {
      setStudentId(selectId);
    } else if (sl[0]) {
      setStudentId(sl[0].id);
    }
  }

  function openAddStudent() {
    setAddOpen(true);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewStudentNumber("");
    setAddError(null);
  }

  function closeAddStudent() {
    setAddOpen(false);
    setAddError(null);
  }

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddPending(true);
    try {
      const body: Record<string, unknown> = {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: "student",
      };
      if (newStudentNumber.trim()) {
        body.studentNumber = newStudentNumber.trim();
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { user?: { id: string }; error?: string };
      if (!res.ok) {
        setAddError(data.error ?? "Could not add student");
        return;
      }
      const newId = data.user?.id;
      closeAddStudent();
      await refreshStudentList(newId);
      setMessage(newId ? "Student added. Choose a program and enroll." : "Student added.");
    } finally {
      setAddPending(false);
    }
  }

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!courseId) {
      setError("No course for this program. Add a course with this program under Courses.");
      return;
    }
    const res = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, courseId }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Enrollment failed");
      return;
    }
    setMessage("Student enrolled.");
  }

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!students || !q) return students ?? [];
    return students.filter((student) =>
      [student.name, student.email].some((value) =>
        value.toLowerCase().includes(q),
      ),
    );
  }, [studentSearch, students]);

  if (error && (!students || !courses)) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!students || !courses) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <BackButton />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Enroll students</h1>
      <form
        onSubmit={(e) => void enroll(e)}
        className="mt-6 max-w-lg space-y-4 rounded-xl border border-slate-200 p-4"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="stu">
              Student
            </label>
            {viewerRole === "admin" ? (
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                onClick={openAddStudent}
              >
                Add student
              </button>
            ) : null}
          </div>
          <ListSearch
            id="enroll-student-search"
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder="Search by student name or email"
          />
          <select
            id="stu"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="prog">
            Program
          </label>
          <select
            id="prog"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={programFilter}
            onChange={(e) => {
              const p = e.target.value as CourseProgram;
              setProgramFilter(p);
              setCourseId(courses.find((c) => c.program === p)?.id ?? "");
            }}
          >
            {COURSE_PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          disabled={!studentId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enroll
        </button>
      </form>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddStudent();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
            role="dialog"
            aria-labelledby="add-student-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="add-student-title" className="text-lg font-semibold text-slate-900">
              Add student to enroll
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Creates a student account so you can enroll them in a course.
            </p>
            <form onSubmit={(e) => void createStudent(e)} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="add-name">
                  Full name
                </label>
                <input
                  id="add-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="add-email">
                  Email
                </label>
                <input
                  id="add-email"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-slate-600"
                  htmlFor="add-password"
                >
                  Initial password
                </label>
                <input
                  id="add-password"
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-slate-600"
                  htmlFor="add-student-number"
                >
                  Student number <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="add-student-number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newStudentNumber}
                  onChange={(e) => setNewStudentNumber(e.target.value)}
                />
              </div>
              {addError ? <p className="text-sm text-red-600">{addError}</p> : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {addPending ? "Adding..." : "Add student"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={closeAddStudent}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
