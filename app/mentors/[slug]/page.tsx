import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Mentor } from "@/components/MentorCard";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MentorWithBio = Mentor & { bio: string | null; created_at?: string };

async function getMentor(slug: string) {
  const { data } = await supabase
    .from("mentors")
    .select(
      "id,slug,display_name,headline,bio,rate,tags,location,years_exp,created_at"
    )
    .eq("slug", slug)
    .single();
  return (data as MentorWithBio) ?? null;
}

export async function generateStaticParams() {
  const { data } = await supabase.from("mentors").select("slug");
  return (data ?? []).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = await getMentor(slug);
  return {
    title: m ? `${m.display_name} – Mentor` : "Mentor",
    description: m?.headline ?? "Mentor profile",
  };
}

export default async function MentorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = await getMentor(slug);
  if (!m) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/mentors" className="text-sm underline opacity-70">
        ← Back to mentors
      </Link>

      <header className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{m.display_name}</h1>
          {m.headline && <p className="mt-1 opacity-80">{m.headline}</p>}
          <div className="mt-3 text-sm opacity-70">
            {m.location || "Remote"} · {(m.years_exp ?? 0)} yrs experience
          </div>
        </div>
        {m.rate != null && (
          <div className="text-right">
            <div className="text-xl font-semibold">PKR {m.rate}/hr</div>
            <a
              href="#request"
              className="mt-2 inline-block rounded-full border px-4 py-2 transition hover:shadow"
            >
              Request session
            </a>
          </div>
        )}
      </header>

      {m.tags && m.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {m.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border px-2 py-0.5 text-xs opacity-80"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {m.bio && <div className="mt-8 whitespace-pre-line text-sm">{m.bio}</div>}

      <section id="request" className="mt-10 rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">Request Session</h2>
        <p className="mt-1 text-sm opacity-70">
          Simple request form will be wired in the next step.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border p-2" placeholder="Your name" />
          <input className="rounded-lg border p-2" placeholder="Email" />
          <input
            className="rounded-lg border p-2 md:col-span-2"
            placeholder="Preferred time (e.g., Sat 6–8pm PKT)"
          />
          <textarea
            className="rounded-lg border p-2 md:col-span-2"
            rows={4}
            placeholder="What do you want help with?"
          ></textarea>
        </div>
        <button
          disabled
          className="mt-4 rounded-full border px-4 py-2 opacity-60"
        >
          Submit (coming next)
        </button>
      </section>
    </main>
  );
}
