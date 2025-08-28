"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Row = {
  id: string;
  mentor_slug: string;
  requester_name: string;
  requester_email: string;
  preferred_time: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<"loading" | "noauth" | "forbidden" | "ok" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) return setState("noauth");
      setEmail(session.user.email ?? null);

      try {
        const res = await fetch("/api/admin/requests", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 401) return setState("noauth");
        if (res.status === 403) return setState("forbidden");
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error("bad");
        setRows(json.rows as Row[]);
        setState("ok");
      } catch {
        setState("error");
      }
    }
    run();
  }, []);

  async function updateStatus(id: string, status: Row["status"]) {
    if (!rows) return;
    setBusyId(id);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setState("noauth");

      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("bad");

      setRows(rows.map((r) => (r.id === id ? (json.row as Row) : r)));
    } catch {
      alert("Failed to update status. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Admin · Requests</h1>
      <p className="mt-2 opacity-70">Accept or decline session requests.</p>

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
          Couldn’t load requests. Try refreshing.
        </div>
      )}

      {state === "ok" && rows && (
        <>
          <div className="mt-6 text-sm opacity-70">
            {rows.length} request{rows.length === 1 ? "" : "s"}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border-b px-3 py-2">Created</th>
                  <th className="border-b px-3 py-2">Mentor</th>
                  <th className="border-b px-3 py-2">Requester</th>
                  <th className="border-b px-3 py-2">Email</th>
                  <th className="border-b px-3 py-2">Preferred time</th>
                  <th className="border-b px-3 py-2">Message</th>
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
                      <Link href={`/mentors/${r.mentor_slug}`} className="underline">
                        {r.mentor_slug}
                      </Link>
                    </td>
                    <td className="border-b px-3 py-2">{r.requester_name}</td>
                    <td className="border-b px-3 py-2 font-mono">{r.requester_email}</td>
                    <td className="border-b px-3 py-2">{r.preferred_time || "—"}</td>
                    <td className="border-b px-3 py-2">{r.message || "—"}</td>
                    <td className="border-b px-3 py-2">{r.status}</td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(r.id, "accepted")}
                          disabled={busyId === r.id}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            busyId === r.id ? "opacity-60" : "hover:shadow"
                          }`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "declined")}
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
