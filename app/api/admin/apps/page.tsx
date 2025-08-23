"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type AppRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  rate: number | null;
  tags: string[] | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export default function AdminAppsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [state, setState] = useState<"loading" | "noauth" | "forbidden" | "ok" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function setStatus(id: string, status: AppRow["status"]) {
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
        alert(`Approved. Mentor profile created: /mentors/${json.mentorSlug}`);
      }
    } catch {
      alert("Failed to update status. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Admin · Mentor Applications</h1>
      <p className="mt-2 opacity-70">Approve or decline mentor applications.</p>

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
        <div className="mt-8 rounded-2xl border p-5 text-red-400">Couldn’t load applications. Try refreshing.</div>
      )}

      {state === "ok" && rows && (
        <>
          <div className="mt-6 text-sm opacity-70">{rows.length} application{rows.length === 1 ? "" : "s"}</div>
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
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="border-b px-3 py-2 opacity-80">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="border-b px-3 py-2">
                      <div className="font-medium">{r.display_name || r.user_id.slice(0, 8)}</div>
                    </td>
                    <td className="border-b px-3 py-2">{r.headline || "—"}</td>
                    <td className="border-b px-3 py-2">{r.rate != null ? `PKR ${r.rate}/hr` : "—"}</td>
                    <td className="border-b px-3 py-2">{(r.tags || []).join(", ") || "—"}</td>
                    <td className="border-b px-3 py-2">{r.status}</td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatus(r.id, "approved")}
                          disabled={busyId === r.id}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            busyId === r.id ? "opacity-60" : "hover:shadow"
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setStatus(r.id, "declined")}
                          disabled={busyId === r.id}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            busyId === r.id ? "opacity-60" : "hover:shadow"
                          }`}
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
