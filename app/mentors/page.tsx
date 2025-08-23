import { createClient } from "@supabase/supabase-js";
import MentorCard, { Mentor } from "@/components/MentorCard";
import SearchHero from "@/components/SearchHero";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Next.js 15: searchParams is a Promise
type SearchParams = Promise<{ q?: string | string[] | undefined }>;

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const qRaw = params?.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;

  let query = supabase
    .from("mentors")
    .select("id,slug,display_name,headline,rate,tags,location,years_exp")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const s = `%${q.trim()}%`;
    query = query.or(
      `display_name.ilike.${s},headline.ilike.${s},location.ilike.${s}`
    );
  }

  const { data, error } = await query;
  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">Mentors</h1>
      <p className="mt-2 opacity-70">
        {q ? (
          <>
            Showing results for{" "}
            <span className="font-mono">&quot;{q}&quot;</span>
          </>
        ) : (
          <>Browse all mentors.</>
        )}
      </p>

      <div className="mt-6">
        <SearchHero />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border p-4 text-red-400">
          Failed to load mentors. Please try again.
        </div>
      )}

      {!error && (
        <>
          <div className="mt-6 text-sm opacity-70">
            {mentors.length} result{mentors.length === 1 ? "" : "s"}
            {q ? " found" : ""}
          </div>

          {mentors.length === 0 ? (
            <div className="mt-6 rounded-2xl border p-6 text-center opacity-70">
              No mentors match your search.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mentors.map((m) => (
                <MentorCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
