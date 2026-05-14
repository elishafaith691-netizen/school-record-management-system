"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { MAX_SUBJECTS_PER_PROGRAM } from "@/lib/curriculum-catalog";

type Program = {
  id: string;
  code: string;
  name: string;
  description: string;
  subject_count: number;
};

type Subject = {
  id: string;
  program_id: string;
  code: string;
  title: string;
  sort_order: number;
  created_at: string;
};

export default function ProgramCurriculumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [program, setProgram] = useState<Program | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [progCode, setProgCode] = useState("");
  const [progName, setProgName] = useState("");
  const [progDesc, setProgDesc] = useState("");

  async function load() {
    const res = await fetch(`/api/academy/programs/${id}`);
    const data = (await res.json()) as {
      program?: Program;
      subjects?: Subject[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setProgram(null);
      setSubjects(null);
      return;
    }
    const p = data.program ?? null;
    setProgram(p);
    setSubjects(data.subjects ?? []);
    if (p) {
      setProgCode(p.code);
      setProgName(p.name);
      setProgDesc(p.description ?? "");
    }
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/academy/programs/${id}`);
      const data = (await res.json()) as {
        program?: Program;
        subjects?: Subject[];
        error?: string;
      };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        setProgram(null);
        setSubjects(null);
        return;
      }
      const p = data.program ?? null;
      setProgram(p);
      setSubjects(data.subjects ?? []);
      if (p) {
        setProgCode(p.code);
        setProgName(p.name);
        setProgDesc(p.description ?? "");
      }
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subjects || subjects.length >= MAX_SUBJECTS_PER_PROGRAM) return;
    setError(null);
    const res = await fetch(`/api/academy/programs/${id}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), title: title.trim() }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not add subject");
      return;
    }
    setCode("");
    setTitle("");
    await load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const res = await fetch(`/api/academy/subjects/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editCode.trim(), title: editTitle.trim() }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update");
      return;
    }
    setEditing(null);
    await load();
  }

  async function saveProgramMeta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/academy/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: progCode.trim(),
        name: progName.trim(),
        description: progDesc.trim(),
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not update program");
      return;
    }
    await load();
  }

  async function removeSubject(sid: string) {
    if (!confirm("Remove this core subject from the program?")) return;
    setError(null);
    const res = await fetch(`/api/academy/subjects/${sid}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await load();
  }

  if (error && !program) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/academic/programs" className="mt-4 inline-block text-sm text-blue-700 hover:underline">
          Back to programs
        </Link>
      </div>
    );
  }

  if (!program || !subjects) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  const canAdd = subjects.length < MAX_SUBJECTS_PER_PROGRAM;

  return (
    <div className="space-y-8">
      <div className="mb-3">
        <BackButton />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{program.code}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{program.name}</h1>
          {program.description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{program.description}</p>
          ) : null}
        </div>
        <Link
          href="/academic/programs"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          All programs
        </Link>
      </div>

      <form
        onSubmit={(e) => void saveProgramMeta(e)}
        className="grid max-w-2xl gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Program details</h2>
        </div>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={progCode}
          onChange={(e) => setProgCode(e.target.value)}
          aria-label="Program code"
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={progName}
          onChange={(e) => setProgName(e.target.value)}
          aria-label="Program name"
        />
        <textarea
          className="md:col-span-2 min-h-[72px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={progDesc}
          onChange={(e) => setProgDesc(e.target.value)}
          placeholder="Description"
          aria-label="Program description"
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Save program
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Core curriculum ({subjects.length} of {MAX_SUBJECTS_PER_PROGRAM})
        </h2>
        <ol className="mt-4 space-y-3">
          {subjects.map((s, idx) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">{s.code}</p>
                  <p className="font-medium text-slate-900">{s.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    setEditing(s);
                    setEditCode(s.code);
                    setEditTitle(s.title);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline"
                  onClick={() => void removeSubject(s.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>

        {canAdd ? (
          <form
            onSubmit={(e) => void addSubject(e)}
            className="mt-6 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3"
          >
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Subject code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <input
              className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Subject title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add core subject
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-600">
            This program already has the maximum of {MAX_SUBJECTS_PER_PROGRAM} core subjects.
            Remove one to add another.
          </p>
        )}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
            aria-labelledby="edit-subject-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="edit-subject-title" className="text-lg font-semibold text-slate-900">
              Edit subject
            </h2>
            <form onSubmit={(e) => void saveEdit(e)} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600" htmlFor="ec">
                  Code
                </label>
                <input
                  id="ec"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600" htmlFor="et">
                  Title
                </label>
                <input
                  id="et"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
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
