import { createClient } from "@supabase/supabase-js";
import MentorCard, { type Mentor } from "@/components/MentorCard";

export const revalidate = 0;

type SP = Promise<Record<string, string | string[] | undefined>>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || "";

  let query = supabase
    .from("mentors")
    .select("id,slug,display_name,headline,rate,tags,location,years_exp,photo_url")
    .order("created_at", { ascending: false });

  if (q) {
    // simple name/headline search
    query = query.or(`display_name.ilike.%${q}%,headline.ilike.%${q}%`);
  }

  const { data } = await query;
  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">All mentors</h1>
      {q && <p className="mt-2 text-sm opacity-70">Search: {q}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <MentorCard key={m.id} m={m} />
        ))}
        {mentors.length === 0 && (
          <div className="rounded-2xl border p-6 text-center opacity-70">No mentors found.</div>
        )}
      </div>
    </main>
  );
}
