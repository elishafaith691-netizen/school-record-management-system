"use client";

import { useEffect, useState } from "react";
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

export default function AcademicProgramsPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load(query = q) {
    const res = await fetch(`/api/academy/programs?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { programs?: Program[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load programs");
      return;
    }
    setPrograms(data.programs ?? []);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/academy/programs?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { programs?: Program[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Failed to load programs");
        return;
      }
      setPrograms(data.programs ?? []);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  async function addProgram(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/academy/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create program");
      return;
    }
    setCode("");
    setName("");
    setDescription("");
    await load();
  }

  async function removeProgram(id: string, label: string) {
    if (!confirm(`Delete program ${label}? All core subjects in this program will be removed.`))
      return;
    setError(null);
    const res = await fetch(`/api/academy/programs/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not delete");
      return;
    }
    await load();
  }

  if (error && !programs) {
    return (
      <div>
        <div className="mb-3">
          <BackButton />
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!programs) {
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
    <div className="space-y-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <BackButton />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Degree programs</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Each program lists exactly {MAX_SUBJECTS_PER_PROGRAM} core subjects in the curriculum.
          Open a program to view or edit subjects.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase text-slate-500" htmlFor="search">
            Search
          </label>
          <input
            id="search"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Filter by code or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <form
        onSubmit={(e) => void addProgram(e)}
        className="grid max-w-2xl gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Add program</h2>
        </div>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Code (e.g. BSIS)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Full program name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create program
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {programs.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  {p.code}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{p.name}</h3>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {p.subject_count}/{MAX_SUBJECTS_PER_PROGRAM} subjects
              </span>
            </div>
            {p.description ? (
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Link
                href={`/academic/programs/${p.id}`}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Curriculum
              </Link>
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() => void removeProgram(p.id, p.code)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-slate-600">No programs match your search.</p>
      ) : null}
    </div>
  );
}
