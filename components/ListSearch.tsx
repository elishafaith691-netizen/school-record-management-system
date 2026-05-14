"use client";

export function ListSearch({
  id,
  value,
  onChange,
  placeholder = "Search",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4 max-w-md">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        Search
      </label>
      <input
        id={id}
        type="search"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
