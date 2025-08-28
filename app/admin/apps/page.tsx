import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import AdminAppRow, { type AdminAppRowData } from "@/components/AdminAppRow";

export const revalidate = 0;

type SP = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["pending", "approved", "declined", "suspended", "blocked"] as const;
type Tab = (typeof TABS)[number];

function pickTab(raw?: string | string[]): Tab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (TABS.includes((v as Tab) || "pending") ? (v as Tab) : "pending");
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = pickTab(sp.tab);

  const { data } = await supabaseAdmin
    .from("mentor_applications")
    .select("id, created_at, display_name, user_id, headline, rate, tags, status")
    .eq("status", tab)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as AdminAppRowData[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin · Mentor Applications</h1>
        <Link href="/admin/requests" className="underline opacity-80">
          ← Requests
        </Link>
      </div>

      <p className="mt-2 opacity-70">Moderate applicants and control mentor account status.</p>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/apps?tab=${t}`}
            className={`rounded-full border px-3 py-1 capitalize ${tab === t ? "bg-white/10" : ""}`}
          >
            {t}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm opacity-70">
        {rows.length} item{rows.length === 1 ? "" : "s"} in “{tab}”
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border">
        <table className="w-full text-left">
          <thead className="text-sm opacity-70">
            <tr>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Applicant</th>
              <th className="px-3 py-3">Headline</th>
              <th className="px-3 py-3">Rate</th>
              <th className="px-3 py-3">Tags</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => (
              <AdminAppRow key={app.id} app={app} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center opacity-70">
                  No applications in this tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
