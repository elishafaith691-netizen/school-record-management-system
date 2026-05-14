"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ListSearch } from "@/components/ListSearch";
import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

const ACCOUNT_ROLES: Exclude<Role, "admin">[] = [
  "student",
  "teacher",
  "registrar",
];

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  student_number: string | null;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Exclude<Role, "admin">>("student");
  const [studentNumber, setStudentNumber] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPending, setAdminPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("student");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPending, setEditPending] = useState(false);

  async function load() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as {
      users?: UserRow[];
      currentUserId?: string;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      return;
    }
    setUsers(data.users ?? []);
    setCurrentUserId(data.currentUserId ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role as Role);
    setEditStudentNumber(u.student_number ?? "");
    setEditPassword("");
    setError(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditPassword("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setEditPending(true);
    const body: Record<string, unknown> = {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
    };
    if (editRole === "student") {
      body.studentNumber = editStudentNumber.trim() || null;
    }
    if (editPassword.trim()) {
      body.password = editPassword;
    }
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update user");
        return;
      }
      closeEdit();
      await load();
    } finally {
      setEditPending(false);
    }
  }

  async function removeUser(u: UserRow) {
    if (u.id === currentUserId) return;
    if (!confirm(`Delete account for ${u.name} (${u.email})? This cannot be undone.`)) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete user");
      return;
    }
    setError(null);
    await load();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = {
      email: email.trim(),
      password,
      name: name.trim(),
      role,
    };
    if (role === "student" && studentNumber.trim()) {
      body.studentNumber = studentNumber.trim();
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create user");
      return;
    }
    setEmail("");
    setPassword("");
    setName("");
    setStudentNumber("");
    await load();
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdminPending(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword,
          name: adminName.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create admin");
        return;
      }
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
      await load();
    } finally {
      setAdminPending(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!users || !q) return users ?? [];
    return users.filter((u) =>
      [u.name, u.email, u.role, u.student_number ?? "", u.created_at].some(
        (value) => value.toLowerCase().includes(q),
      ),
    );
  }, [search, users]);

  if (error && !users) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  if (!users) {
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
      <h1 className="text-2xl font-semibold text-slate-900">User accounts</h1>

      {error && !editing ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(e) => void createUser(e)}
          className="grid gap-3 rounded-xl border border-slate-200 p-4"
        >
          <h2 className="text-sm font-medium text-slate-900">
            Create student, teacher, or registrar
          </h2>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as Exclude<Role, "admin">)
              }
            >
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {role === "student" ? (
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Student number (optional)"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
              />
            ) : null}
          </div>
          <button
            type="submit"
            className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Create account
          </button>
        </form>

        <form
          onSubmit={(e) => void createAdmin(e)}
          className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4"
        >
          <h2 className="text-sm font-medium text-slate-900">Add admin</h2>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Full name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="email"
            placeholder="Email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="password"
            placeholder="Temporary password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={adminPending}
            className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {adminPending ? "Adding..." : "Add admin"}
          </button>
        </form>
      </div>

      <ListSearch
        id="user-account-search"
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, role, or student number"
      />

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Student #</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
                <td className="px-3 py-2">{u.student_number ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={u.id === currentUserId}
                      title={
                        u.id === currentUserId
                          ? "You cannot delete your own account"
                          : undefined
                      }
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void removeUser(u)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
            role="dialog"
            aria-labelledby="edit-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-user-title" className="text-lg font-semibold text-slate-900">
              Edit user
            </h2>
            <form onSubmit={(e) => void saveEdit(e)} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="edit-name">
                  Full name
                </label>
                <input
                  id="edit-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="edit-email">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="edit-role">
                  Role
                </label>
                <select
                  id="edit-role"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {editRole === "student" ? (
                <div>
                  <label
                    className="block text-xs font-medium text-slate-600"
                    htmlFor="edit-student-number"
                  >
                    Student number
                  </label>
                  <input
                    id="edit-student-number"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                    value={editStudentNumber}
                    onChange={(e) => setEditStudentNumber(e.target.value)}
                  />
                </div>
              ) : null}
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor="edit-password">
                  New password
                </label>
                <input
                  id="edit-password"
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Leave blank to keep current"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {editPending ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={closeEdit}
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
