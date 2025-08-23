import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const revalidate = 0;

type Role = {
  title: string;
  company: string;
  start: string;
  end?: string | null;
  current?: boolean;
  description?: string | null;
};

type App = {
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  country: string | null;
  city: string | null;
  photo_url: string | null;
  rate: number | null;
  tags: string[] | null;
  experience: Role[] | null;
  status: string;
};

async function getApp(id: string) {
  const { data } = await supabaseAdmin
    .from("mentor_applications")
    .select("*")
    .eq("id", id)
    .single();
  return (data ?? null) as App | null;
}

export default async function Page({ params }: { params: { id: string } }) {
  const app = await getApp(params.id);
  if (!app) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold">Application not found</h1>
        <div className="mt-6">
          <Link href="/admin/apps" className="rounded-full border px-4 py-2">
            ← Back to applications
          </Link>
        </div>
      </main>
    );
  }

  // Fix: compute name separately to avoid ?? with || precedence issues
  const computedName =
    app.display_name ?? `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim();
  const safeName = computedName || "—";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Review application</h1>
        <Link href="/admin/apps" className="underline opacity-80">
          ← Back to applications
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[128px,1fr]">
        <div className="flex items-start">
          {app.photo_url ? (
            <Image
              src={app.photo_url}
              alt={safeName}
              width={128}
              height={128}
              className="rounded-xl border object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-xl border opacity-60">
              No photo
            </div>
          )}
        </div>

        <div>
          <div className="text-2xl font-semibold">{safeName}</div>
          <div className="mt-1 opacity-70">User ID: {app.user_id}</div>
          <div className="mt-3 text-lg">{app.headline || "—"}</div>
          <div className="mt-2 opacity-80">
            {app.country || "—"} {app.city ? `· ${app.city}` : ""}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(app.tags ?? []).map((t, i) => (
              <span key={i} className="rounded-full border px-2 py-0.5 text-xs opacity-80">
                {t}
              </span>
            ))}
            {(!app.tags || app.tags.length === 0) && <span className="opacity-60">—</span>}
          </div>

          <div className="mt-3 font-medium">
            {app.rate ? `PKR ${app.rate.toLocaleString()}/hr` : "—"}
          </div>

          <div className="mt-4 flex gap-3">
            {app.linkedin_url && (
              <a
                href={app.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1 text-sm underline"
              >
                LinkedIn
              </a>
            )}
            {app.portfolio_url && (
              <a
                href={app.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1 text-sm underline"
              >
                Portfolio
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Bio</h2>
        <p className="mt-2 whitespace-pre-wrap opacity-90">{app.bio || "—"}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Work experience</h2>
        <div className="mt-3 grid gap-3">
          {(app.experience ?? []).length === 0 && <div className="opacity-70">—</div>}
          {(app.experience ?? []).map((r, i) => (
            <div key={i} className="rounded-2xl border p-3">
              <div className="font-medium">{r.title || "—"}</div>
              <div className="opacity-80">
                {r.company || "—"} · {r.start || "—"}
                {r.current ? " – Present" : r.end ? ` – ${r.end}` : ""}
              </div>
              {r.description && (
                <div className="mt-2 whitespace-pre-wrap opacity-90">{r.description}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap gap-2">
          <AdminAction id={app.id} action="approve" label="Approve" />
          <AdminAction id={app.id} action="decline" label="Decline" />
          <AdminAction id={app.id} action="suspend" label="Suspend" />
          <AdminAction id={app.id} action="block" label="Block" />
        </div>
      </section>
    </main>
  );
}

function AdminAction({
  id,
  action,
  label,
}: {
  id: string;
  action: "approve" | "decline" | "suspend" | "block";
  label: string;
}) {
  return (
    <form action={`/api/admin/apps/${id}/status`} method="post" className="inline">
      <input type="hidden" name="action" value={action} />
      <button className="rounded-full border px-3 py-1 text-sm hover:shadow" formMethod="post">
        {label}
      </button>
    </form>
  );
}
