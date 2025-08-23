"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Status = "pending" | "approved" | "declined" | "suspended" | "blocked";

type AppRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  rate: number | null;
  tags: string[] | null;
  status: Status;
  created_at: string;
};

const TABS: Status[] = ["pending", "approved", "declined", "suspended", "blocked"];

export default function AdminAppsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [state, setState] = useState<"loading" | "noauth" | "forbidden" | "ok" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Status>("pending");

  useEffect(() => {
    async function run() {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) return setState("noauth");
      setEmail(session.user.email ?? null);

      try {
        const res = await fetch("/api/admin/mentor-apps", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 401) return setState("noauth");
        if (res.status === 403) return setState("forbidden");
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error("bad");
        setRows(json.rows as AppRow[]);
        setState("ok");
      } catch {
        setState("error");
      }
    }
    run();
  }, []);

  const filtered = useMemo(
    () => (rows || []).filter((r) => r.status === tab),
    [rows, tab]
  );

  async function setStatus(id: string, status: Status) {
    setBusyId(id);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setState("noauth");

      const res = await fetch(`/api/admin/mentor-apps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("bad");

      setRows((rows || []).map((r) => (r.id === id ? { ...r, status } : r)));
      if (status === "approved" && json.mentorSlug) {
        alert(`Approved. Mentor profile: /mentors/${json.mentorSlug}`);
      }
    } catch {
      alert("Failed to update status. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(row: AppRow) {
    const commonBtn =
      "rounded-full border px-3 py-1 text-xs transition hover:shadow disabled:opacity-60";

    if (row.status === "pending") {
      return (
        <div className="flex gap-2">
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "approved")}
          >
            Approve
          </button>
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "declined")}
          >
            Decline
          </button>
        </div>
      );
    }

    if (row.status === "approved") {
      return (
        <div className="flex gap-2">
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "suspended")}
          >
            Suspend
          </button>
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "blocked")}
          >
            Block
          </button>
        </div>
      );
    }

    if (row.status === "suspended") {
      return (
        <div className="flex gap-2">
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "approved")}
          >
            Re-approve
          </button>
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "blocked")}
          >
            Block
          </button>
        </div>
      );
    }

    if (row.status === "blocked") {
      return (
        <div className="flex gap-2">
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "approved")}
          >
            Re-approve
          </button>
          <button
            className={commonBtn}
            disabled={busyId === row.id}
            onClick={() => setStatus(row.id, "suspended")}
          >
            Suspend
          </button>
        </div>
      );
    }

    // declined
    return (
      <div className="flex gap-2">
        <button
          className={commonBtn}
          disabled={busyId === row.id}
          onClick={() => setStatus(row.id, "pending")}
        >
          Move to Pending
        </button>
        <button
          className={commonBtn}
          disabled={busyId === row.id}
          onClick={() => setStatus(row.id, "approved")}
        >
          Approve
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Admin · Mentor Applications</h1>
      <p className="mt-2 opacity-70">Moderate applicants and control mentor account status.</p>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
              tab === t ? "bg-white/10" : "opacity-80 hover:opacity-100"
            }`}
          >
            {t}
          </button>
        ))}
        <Link href="/admin" className="ml-auto underline opacity-80">
          ← Requests
        </Link>
      </div>

      {/* States */}
      {state === "loading" && (
        <div className="mt-8 animate-pulse">
          <div className="h-10 w-72 rounded bg-white/10" />
          <div className="mt-4 h-28 w-full rounded bg-white/10" />
        </div>
      )}

      {state === "noauth" && (
        <div className="mt-8 rounded-2xl border p-5">
          <div className="opacity-80">You must sign in to view this page.</div>
          <Link href="/auth" className="mt-3 inline-block rounded-full border px-4 py-2 hover:shadow">
            Go to Sign in
          </Link>
        </div>
      )}

      {state === "forbidden" && (
        <div className="mt-8 rounded-2xl border p-5">
          <div className="text-red-400">Your account is not whitelisted for admin access.</div>
          <div className="mt-3 text-sm opacity-70">Signed in as {email ?? "unknown"}.</div>
        </div>
      )}

      {state === "error" && (
        <div className="mt-8 rounded-2xl border p-5 text-red-400">
          Couldn’t load applications. Try refreshing.
        </div>
      )}

      {state === "ok" && (
        <>
          <div className="mt-6 text-sm opacity-70">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} in “{tab}”
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border-b px-3 py-2">Created</th>
                  <th className="border-b px-3 py-2">Applicant</th>
                  <th className="border-b px-3 py-2">Headline</th>
                  <th className="border-b px-3 py-2">Rate</th>
                  <th className="border-b px-3 py-2">Tags</th>
                  <th className="border-b px-3 py-2">Status</th>
                  <th className="border-b px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="border-b px-3 py-2 opacity-80">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="font-medium">{r.display_name || r.user_id.slice(0, 8)}</div>
                      <div className="font-mono text-xs opacity-60">{r.user_id}</div>
                    </td>
                    <td className="border-b px-3 py-2">{r.headline || "—"}</td>
                    <td className="border-b px-3 py-2">{r.rate != null ? `PKR ${r.rate}/hr` : "—"}</td>
                    <td className="border-b px-3 py-2">{(r.tags || []).join(", ") || "—"}</td>
                    <td className="border-b px-3 py-2 capitalize">{r.status}</td>
                    <td className="border-b px-3 py-2">{actionsFor(r)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 opacity-70" colSpan={7}>
                      Nothing in this tab yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
