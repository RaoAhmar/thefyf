import Link from "next/link";

export type Mentor = {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  rate: number | null;
  tags: string[] | null;
  location: string | null;
  years_exp: number | null;
};

export default function MentorCard({ m }: { m: Mentor }) {
  return (
    <article className="rounded-2xl border p-4 transition hover:shadow">
      <header className="flex items-baseline justify-between gap-3">
        <Link
          href={`/mentors/${m.slug}`}
          className="text-lg font-semibold underline-offset-4 hover:underline"
        >
          {m.display_name}
        </Link>
        {m.rate != null && (
          <div className="shrink-0 text-sm opacity-80">PKR {m.rate}/hr</div>
        )}
      </header>

      {m.headline && (
        <p className="mt-1 text-sm opacity-80">{m.headline}</p>
      )}

      <div className="mt-2 text-xs opacity-70">
        {m.location && <span>{m.location}</span>}
        {m.location && m.years_exp != null && <span> · </span>}
        {m.years_exp != null && <span>{m.years_exp} yrs exp</span>}
      </div>

      {(m.tags?.length ?? 0) > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {m.tags!.slice(0, 6).map((t) => (
            <li key={t} className="rounded-full border px-2 py-1 opacity-80">
              {t}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-4 flex items-center justify-between">
        <Link
          href={`/mentors/${m.slug}`}
          className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
          aria-label={`View ${m.display_name}'s profile`}
        >
          View profile
        </Link>
        <Link
          href={`/mentors/${m.slug}`}
          className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
          aria-label={`Book a session with ${m.display_name}`}
        >
          Book now
        </Link>
      </footer>
    </article>
  );
}
