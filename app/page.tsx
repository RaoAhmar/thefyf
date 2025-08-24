import { createClient } from "@supabase/supabase-js";
import MentorCard, { type Mentor } from "@/components/MentorCard";
import Link from "next/link";

export const revalidate = 0; // live while testing; switch back to 60 later if you want

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data } = await supabase
    .from("mentors")
    .select("id,slug,display_name,headline,rate,tags,location,years_exp,photo_url")
    .order("created_at", { ascending: false })
    .limit(6);

  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-bold">Find your fit, faster.</h1>
        <p className="mt-3 opacity-70">
          Book mentors for career, data, product and more.
        </p>

        {/* SEARCH BAR (restored) */}
        <form
          action="/mentors"
          method="get"
          className="mx-auto mt-6 flex max-w-xl items-center gap-2"
        >
          <label htmlFor="q" className="sr-only">
            Search mentors
          </label>
          <input
            id="q"
            name="q"
            type="text"
            placeholder="Search mentors by name, skill, tag…"
            className="w-full rounded-full border bg-transparent px-4 py-2 outline-none placeholder:opacity-60"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-full border px-4 py-2 transition hover:shadow"
          >
            Search
          </button>
        </form>
      </section>

      {/* Mentors preview (max 6) */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mentors</h2>
          <Link href="/mentors" className="text-sm underline opacity-80">
            View all
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <MentorCard key={m.id} m={m} />
          ))}
          {mentors.length === 0 && (
            <div className="rounded-2xl border p-6 text-center opacity-70">
              No mentors yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
