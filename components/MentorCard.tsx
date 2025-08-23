import Link from "next/link";
import Image from "next/image";

export type Mentor = {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  rate: number | null;
  tags: string[] | null;
  location: string | null;
  years_exp: number | null;
  photo_url?: string | null;
};

export default function MentorCard({ m }: { m: Mentor }) {
  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <div className="group rounded-2xl border p-4 transition hover:shadow-md">
      {/* Photo + name */}
      <div className="flex items-center gap-3">
        {m.photo_url ? (
          <Image
            src={m.photo_url}
            alt={m.display_name}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 rounded-xl border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border font-semibold">
            {initials(m.display_name)}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold leading-tight">{m.display_name}</div>
          <div className="text-sm opacity-70">{m.headline || ""}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm opacity-80">
        {m.location && <span>{m.location}</span>}
        {typeof m.years_exp === "number" && <span>• {m.years_exp} yrs exp</span>}
        {typeof m.rate === "number" && <span>• PKR {m.rate.toLocaleString()}/hr</span>}
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        {(m.tags ?? []).slice(0, 4).map((t, i) => (
          <span key={i} className="rounded-full border px-2 py-0.5 text-xs opacity-80">
            {t}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-4">
        <Link
          href={`/mentors/${m.slug}`}
          className="inline-block rounded-full border px-4 py-2 text-sm transition hover:shadow"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
