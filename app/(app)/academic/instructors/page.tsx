"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";

type Instructor = {
  instructor_id: string;
  user_id: string;
  employee_id: string | null;
  email: string;
  name: string;
  created_at: string;
};

export default function AcademicInstructorsPage() {
  const [rows, setRows] = useState<Instructor[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmp, setNewEmp] = useState("");
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmp, setEditEmp] = useState("");
  const [editPassword, setEditPassword] = useState("");

  async function load(query = q) {
    const res = await fetch(`/api/academy/instructors?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { instructors?: Instructor[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      return;
    }
    setRows(data.instructors ?? []);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/academy/instructors?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { instructors?: Instructor[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setRows(data.instructors ?? []);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  async function createIns(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/academy/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim(),
        employeeId: newEmp.trim() || null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create instructor");
      return;
    }
    setAddOpen(false);
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewEmp("");
    await load();
  }

  async function saveIns(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const body: Record<string, unknown> = {
      name: editName.trim(),
      email: editEmail.trim(),
      employeeId: editEmp.trim() || null,
    };
    if (editPassword) body.password = editPassword;
    const res = await fetch(`/api/academy/instructors/${editing.instructor_id}`, {
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
    await load();
  }

  async function removeIns(id: string, label: string) {
    if (!confirm(`Remove instructor ${label}? Their login will be deleted unless they still teach sections.`))
      return;
    setError(null);
    const res = await fetch(`/api/academy/instructors/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await load();
  }

  if (error && !rows) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!rows) {
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
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add instructor
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Instructors</h1>
        <p className="mt-1 text-sm text-slate-600">
          Instructor accounts can be assigned to course sections elsewhere in the system.
        </p>
      </div>

      <input
        className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Search name, email, or employee ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Employee ID</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.instructor_id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.employee_id ?? "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="mr-2 text-blue-700 hover:underline"
                    onClick={() => {
                      setEditing(r);
                      setEditName(r.name);
                      setEditEmail(r.email);
                      setEditEmp(r.employee_id ?? "");
                      setEditPassword("");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => void removeIns(r.instructor_id, r.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">No instructors match your search.</p>
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
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Add instructor</h2>
            <form onSubmit={(e) => void createIns(e)} className="mt-4 space-y-3">
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
              />
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Employee ID (optional)"
                value={newEmp}
                onChange={(e) => setNewEmp(e.target.value)}
              />
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
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Edit instructor</h2>
            <form onSubmit={(e) => void saveIns(e)} className="mt-4 space-y-3">
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
                placeholder="Employee ID"
                value={editEmp}
                onChange={(e) => setEditEmp(e.target.value)}
              />
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="New password (optional)"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
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
