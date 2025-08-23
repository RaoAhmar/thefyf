import { createClient } from "@supabase/supabase-js";
import MentorCard, { Mentor } from "@/components/MentorCard";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function MentorsPage() {
  const { data, error } = await supabase
    .from("mentors")
    .select(
      "id,slug,display_name,headline,rate,tags,location,years_exp"
    )
    .order("created_at", { ascending: false });

  if (error) console.error(error);
  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Browse Mentors</h1>
      <p className="mt-2 opacity-70">Hand-picked experts you can book today.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mentors.map((m) => (
          <MentorCard key={m.id} m={m} />
        ))}
      </div>
    </main>
  );
}
