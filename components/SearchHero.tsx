"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchHero() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/mentors?q=${encodeURIComponent(query)}` : "/mentors");
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search mentors by name, skill, city, tag…"
        className="w-full rounded-xl border bg-black p-3 text-white outline-none transition focus:shadow"
        aria-label="Search mentors"
      />
      <button
        type="submit"
        className="rounded-xl border px-4 py-3 transition hover:shadow"
      >
        Search
      </button>
    </form>
  );
}
