import { createClient } from "@supabase/supabase-js";
import MentorCard, { Mentor } from "@/components/MentorCard";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

export default async function MentorsPage(props: { searchParams?: SearchParams }) {
  // Normalize Next.js 14/15 shape (object or Promise)
  const sp =
    props.searchParams &&
    typeof (props.searchParams as any).then === "function"
      ? await (props.searchParams as Promise<Record<string, string | string[] | undefined>>)
      : ((props.searchParams as Record<string, string | string[] | undefined>) || {});

  const rawQ = Array.isArray(sp?.q) ? sp.q[0] : sp?.q;
  const q = (rawQ ?? "").toString().trim();

  let query = supabase
    .from("mentors")
    .select("id,slug,display_name,headline,rate,tags,location,years_exp")
    .order("created_at", { ascending: false });

  // Basic keyword search
  if (q) {
    query = query.or(
      `display_name.ilike.%${q}%,headline.ilike.%${q}%,location.ilike.%${q}%`
    );
  }

  const { data } = await query;
  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Mentors</h1>

      <form action="/mentors" method="get" className="mt-4 max-w-xl">
        <div className="flex overflow-hidden rounded-2xl border">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search mentors…"
            className="flex-1 bg-black px-4 py-3 text-white outline-none"
          />
          <button className="px-5 py-3 border-l hover:shadow">Search</button>
        </div>
      </form>

      {mentors.length === 0 ? (
        <div className="mt-8 rounded-2xl border p-6 opacity-70">No mentors found.</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <MentorCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </main>
  );
}
