// app/mentors/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---- Types
type ExpItem = { company?: string; role?: string; start?: string; end?: string };
type MentorRow = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  rate: number | null;
  tags: string[] | null;
  location: string | null;
  years_exp: number | null;
  photo_url: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  experience?: ExpItem[] | null;
};
type AppRow = {
  headline: string | null;
  bio: string | null;
  rate: number | null;
  tags: string[] | null;
  location: string | null;
  years_exp: number | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  experience: ExpItem[] | null;
};

// ---- Helpers
function moneyPKR(n?: number | null) {
  if (!n) return "PKR —/hr";
  try {
    return (
      new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        maximumFractionDigits: 0,
      }).format(n) + "/hr"
    );
  } catch {
    return `PKR ${n}/hr`;
  }
}

// ---- Page
export default async function MentorPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const ok = sp?.ok === "1";

  // 1) Base mentor row
  const { data: mentorData } = await supabase
    .from("mentors")
    .select(
      [
        "id",
        "user_id",
        "slug",
        "display_name",
        "headline",
        "bio",
        "rate",
        "tags",
        "location",
        "years_exp",
        "photo_url",
        "linkedin_url",
        "portfolio_url",
        "experience",
      ].join(",")
    )
    .eq("slug", slug)
    .maybeSingle();

  const mentor = (mentorData ?? null) as MentorRow | null;
  if (!mentor) return notFound();

  // 2) Latest approved application (as fallback for richer fields)
  const { data: appData } = await supabase
    .from("mentor_applications")
    .select(
      [
        "headline",
        "bio",
        "rate",
        "tags",
        "location",
        "years_exp",
        "linkedin_url",
        "portfolio_url",
        "experience",
      ].join(",")
    )
    .eq("user_id", mentor.user_id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);

  const app = (appData?.[0] ?? null) as AppRow | null;

  // 3) Merge (mentor field first, fall back to application)
  const merged = {
    ...mentor,
    headline: mentor.headline ?? app?.headline ?? null,
    bio: mentor.bio ?? app?.bio ?? null,
    rate: mentor.rate ?? app?.rate ?? null,
    tags: mentor.tags ?? app?.tags ?? null,
    location: mentor.location ?? app?.location ?? null,
    years_exp: mentor.years_exp ?? app?.years_exp ?? null,
    linkedin_url: mentor.linkedin_url ?? app?.linkedin_url ?? null,
    portfolio_url: mentor.portfolio_url ?? app?.portfolio_url ?? null,
    experience: mentor.experience ?? app?.experience ?? null,
  };

  const years =
    merged.years_exp && merged.years_exp > 0 ? `${merged.years_exp} yrs exp` : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {/* Back + price */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/mentors" className="opacity-80 hover:opacity-100">
          ← Back to mentors
        </Link>
        <div className="rounded-full border px-4 py-1 text-sm">
          {moneyPKR(merged.rate)}
        </div>
      </div>

      {/* ===== Mentor details ===== */}
      <section className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border">
          {merged.photo_url ? (
            <Image
              src={merged.photo_url}
              alt={merged.display_name}
              fill
              priority
              className="object-cover"
              // Remove this once your next.config allows your Supabase host:
              // unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold">
              {merged.display_name?.[0]?.toUpperCase() ?? "M"}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{merged.display_name}</h1>
          {merged.headline && (
            <div className="mt-1 text-lg opacity-90">{merged.headline}</div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 opacity-80">
            {merged.location && <span>{merged.location}</span>}
            {years && (
              <>
                <span>•</span>
                <span>{years}</span>
              </>
            )}
          </div>

          {!!merged.tags?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {merged.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-2 py-1 text-xs opacity-90"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Success note after submitting booking */}
      {ok && (
        <div className="mt-6 rounded-xl border px-4 py-3 text-sm">
          ✅ Your request was sent. The mentor will confirm by email.
        </div>
      )}

      {/* About */}
      {merged.bio && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-line opacity-90">{merged.bio}</p>
        </section>
      )}

      {/* Experience */}
      {!!merged.experience?.length && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Experience</h2>
          <ul className="mt-3 space-y-2">
            {merged.experience!.map((e, i) => (
              <li key={i} className="rounded-lg border px-3 py-2">
                <div className="font-medium">{e.role || "Role"}</div>
                <div className="text-sm opacity-80">
                  {e.company || "Company"}
                  {(e.start || e.end) && (
                    <>
                      {" "}
                      • {e.start || "—"} — {e.end || "present"}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Links */}
      {(merged.linkedin_url || merged.portfolio_url) && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Links</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {merged.linkedin_url && (
              <a
                href={merged.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-3 py-1 text-sm underline-offset-2 hover:underline"
              >
                LinkedIn
              </a>
            )}
            {merged.portfolio_url && (
              <a
                href={merged.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border px-3 py-1 text-sm underline-offset-2 hover:underline"
              >
                Portfolio
              </a>
            )}
          </div>
        </section>
      )}

      {/* ===== Booking form ===== */}
      <section className="mt-10 rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">Request Session</h2>
        <p className="mt-1 text-sm opacity-80">
          Submit a request; the mentor will confirm by email.
        </p>

        <form action="/api/session-requests" method="POST" className="mt-5 grid gap-3">
          <input type="hidden" name="mentor_slug" value={merged.slug} />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="requester_name"
              placeholder="Your name"
              autoComplete="name"
              required
              className="rounded border bg-transparent px-3 py-2"
            />
            <input
              type="email"
              name="requester_email"
              placeholder="Email"
              autoComplete="email"
              required
              className="rounded border bg-transparent px-3 py-2"
            />
          </div>

          <input
            name="preferred_time"
            placeholder="Preferred time (optional, e.g., Sat 6–8pm PKT)"
            className="rounded border bg-transparent px-3 py-2"
          />

          <textarea
            name="message"
            placeholder="What do you want help with?"
            className="min-h-[120px] rounded border bg-transparent px-3 py-2"
          />

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="rounded-full border px-4 py-2 transition hover:shadow"
            >
              Submit
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
