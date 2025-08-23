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
    <Link
      href={`/mentors/${m.slug}`}
      className="group block rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold">{m.display_name}</h3>
        {m.rate != null && (
          <span className="text-sm opacity-70">PKR {m.rate}/hr</span>
        )}
      </div>
      {m.headline && <p className="mt-1 text-sm opacity-80">{m.headline}</p>}
      {m.tags && m.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {m.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border px-2 py-0.5 text-xs opacity-80"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 text-xs opacity-60">
        {m.location || "Remote"} · {(m.years_exp ?? 0)} yrs
      </div>
    </Link>
  );
}
