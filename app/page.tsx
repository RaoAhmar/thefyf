import { createClient } from '@supabase/supabase-js';
import MentorCard, { Mentor } from '@/components/MentorCard';

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data } = await supabase
    .from('mentors')
    .select('id,slug,display_name,headline,rate,tags,location,years_exp')
    .limit(6);

  const mentors = (data ?? []) as Mentor[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold">Find your fit, faster.</h1>
        <p className="mt-3 opacity-70">Book mentors for career, data, product and more.</p>
        <div className="mt-6">
          <a href="/mentors" className="rounded-full border px-4 py-2 transition hover:shadow-md">Browse mentors</a>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured mentors</h2>
          <a className="text-sm underline opacity-80" href="/mentors">View all</a>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map(m => <MentorCard key={m.id} m={m} />)}
        </div>
      </section>
    </main>
  );
}
