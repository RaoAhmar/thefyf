import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import MentorCard, { Mentor } from "@/components/MentorCard";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data } = await supabase
    .from("mentors")
    .select("id,slug,display_name,headline,rate,tags,location,years_exp")
    .order("created_at", { ascending: false });

  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">Find your fit, faster.</h1>
        <p className="mt-4 text-lg opacity-80">
          Book mentors for career, data, product and more.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/mentors" className="rounded-full border px-5 py-2 text-base transition hover:shadow">
            Browse mentors
          </Link>
          <Link href="/apply" className="rounded-full border px-5 py-2 text-base transition hover:shadow">
            Become a mentor
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {mentors.length ? `Mentors (${mentors.length})` : "Mentors"}
          </h2>
          <Link href="/mentors" className="text-sm underline opacity-80">
            View all
          </Link>
        </div>

        {mentors.length === 0 ? (
          <div className="mt-6 rounded-2xl border p-6 text-center opacity-70">
            No mentors yet — check back soon.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m) => (
              <MentorCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
