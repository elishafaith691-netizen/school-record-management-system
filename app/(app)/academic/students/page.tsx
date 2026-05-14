"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Program = { id: string; code: string; name: string };

type Student = {
  id: string;
  email: string;
  name: string;
  student_number: string | null;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  created_at: string;
};

export default function AcademicStudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [q, setQ] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newProgramId, setNewProgramId] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editProgramId, setEditProgramId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  async function loadStudents(query = q, selectedProgram = programFilter) {
    const qs = new URLSearchParams();
    if (query.trim()) qs.set("q", query.trim());
    if (selectedProgram) qs.set("programId", selectedProgram);
    const res = await fetch(`/api/academy/students?${qs.toString()}`);
    const data = (await res.json()) as { students?: Student[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load students");
      return;
    }
    setStudents(data.students ?? []);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/academy/programs");
      const data = (await res.json()) as { programs?: Program[] };
      if (!cancelled && res.ok) setPrograms((data.programs ?? []) as Program[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (programFilter) qs.set("programId", programFilter);
      const res = await fetch(`/api/academy/students?${qs.toString()}`);
      const data = (await res.json()) as { students?: Student[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load students");
        return;
      }
      setStudents(data.students ?? []);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, programFilter]);

  function openAdd() {
    setAddOpen(true);
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewNumber("");
    setNewProgramId(programs[0]?.id ?? "");
  }

  function openEdit(s: Student) {
    setEditing(s);
    setEditName(s.name);
    setEditEmail(s.email);
    setEditNumber(s.student_number ?? "");
    setEditProgramId(s.program_id ?? "");
    setEditPassword("");
  }

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/academy/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim(),
        studentNumber: newNumber.trim() || null,
        programId: newProgramId || null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create student");
      return;
    }
    setAddOpen(false);
    await loadStudents();
  }

  async function saveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const body: Record<string, unknown> = {
      name: editName.trim(),
      email: editEmail.trim(),
      studentNumber: editNumber.trim() || null,
      programId: editProgramId || null,
    };
    if (editPassword) body.password = editPassword;
    const res = await fetch(`/api/academy/students/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update");
      return;
    }
    setEditing(null);
    await loadStudents();
  }

  async function removeStudent(id: string, label: string) {
    if (!confirm(`Delete student ${label}? This cannot be undone if they have no blocking records.`))
      return;
    setError(null);
    const res = await fetch(`/api/academy/students/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await loadStudents();
  }

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
    <div className="space-y-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <BackButton />
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add student
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search and filter the roster. Assign an academic program where applicable.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search name, email, ID, or program…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-56"
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          aria-label="Filter by program"
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Student #</th>
              <th className="px-3 py-2">Program</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2 text-slate-700">{s.email}</td>
                <td className="px-3 py-2">{s.student_number ?? "—"}</td>
                <td className="px-3 py-2">
                  {s.program_code ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {s.program_code}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="mr-2 text-blue-700 hover:underline"
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void removeStudent(s.id, s.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-slate-600">No students match your filters.</p>
      ) : null}

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
            role="dialog"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Add student</h2>
            <form onSubmit={(e) => void createStudent(e)} className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Initial password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Student number (optional)"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newProgramId}
                onChange={(e) => setNewProgramId(e.target.value)}
                aria-label="Program"
              >
                <option value="">No program assigned</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="app-btn-primary flex-1 py-2 text-sm">
                  Create
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
            role="dialog"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Edit student</h2>
            <form onSubmit={(e) => void saveStudent(e)} className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Student number"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={editProgramId}
                onChange={(e) => setEditProgramId(e.target.value)}
              >
                <option value="">No program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="New password (optional)"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                autoComplete="new-password"
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="app-btn-primary flex-1 py-2 text-sm">
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  onClick={() => setEditing(null)}
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
