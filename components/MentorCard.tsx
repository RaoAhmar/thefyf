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
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/mentors/${m.slug}`} className="text-lg font-semibold underline-offset-4 hover:underline">
          {m.display_name}
        </Link>
        <div className="opacity-80">{m.rate != null ? `PKR ${m.rate}/hr` : "—"}</div>
      </div>

      <div className="mt-1 opacity-80">{m.headline || "—"}</div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-80">
        {m.tags?.map((t) => (
          <span key={t} className="rounded-full border px-2 py-0.5">{t}</span>
        ))}
        {m.location && <span className="rounded-full border px-2 py-0.5">{m.location}</span>}
        {m.years_exp != null && <span className="rounded-full border px-2 py-0.5">{m.years_exp} yrs</span>}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/mentors/${m.slug}`}
          className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
