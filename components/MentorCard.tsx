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
  photo_url?: string | null; // full URL or storage path
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function resolvePhotoURL(raw?: string | null) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const path = raw.replace(/^mentor-photos\//, "");
  return `${base}/storage/v1/object/public/mentor-photos/${path}`;
}

export default function MentorCard({ m }: { m: Mentor }) {
  const src = resolvePhotoURL(m.photo_url);
  const rateText =
    typeof m.rate === "number" ? `PKR ${m.rate.toLocaleString()}/hr` : null;

  return (
    <article className="grid h-full grid-rows-[auto_auto_1fr_auto] rounded-2xl border p-4 transition hover:shadow-md">
      {/* Header: avatar/name left, rate right */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          {src ? (
            <Image
              src={src}
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
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight">
              {m.display_name}
            </h3>
            <p className="truncate text-sm opacity-70">{m.headline || ""}</p>
          </div>
        </div>

        {rateText && (
          <div className="whitespace-nowrap text-right text-sm font-medium">
            {rateText}
          </div>
        )}
      </header>

      {/* Meta line */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm opacity-80">
        {m.location && <span>{m.location}</span>}
        {typeof m.years_exp === "number" && <span>• {m.years_exp} yrs exp</span>}
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2 self-start">
        {(m.tags ?? []).slice(0, 4).map((t, i) => (
          <span
            key={i}
            className="rounded-full border px-2 py-0.5 text-xs opacity-80"
          >
            {t}
          </span>
        ))}
      </div>

      {/* CTA: bottom-right */}
      <div className="mt-4 self-end flex justify-end">
        <Link
          href={`/mentors/${m.slug}`}
          className="inline-block rounded-full border px-4 py-2 text-sm transition hover:shadow"
          aria-label={`Book a session with ${m.display_name}`}
        >
          Book now
        </Link>
      </div>
    </article>
  );
}

