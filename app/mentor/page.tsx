"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type ReqRow = {
  id: string;
  mentor_slug: string;
  requester_name: string;
  requester_email: string;
  preferred_time: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

type Overview = {
  ok: boolean;
  profileRole: "mentee" | "mentor" | "admin";
  displayName: string | null;
  applicationStatus: null | "pending" | "approved" | "declined" | "suspended" | "blocked";
  mentorSlug: string | null;
  mentorAccountStatus: null | "approved" | "suspended" | "blocked";
};

export default function MentorDashboard() {
  const [state, setState] = useState<"loading" | "noauth" | "ok" | "error">("loading");
  const [ov, setOv] = useState<Overview | null>(null);
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) return setState("noauth");
      try {
        const res = await fetch("/api/mentor/overview", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = (await res.json()) as Overview;
        if (!res.ok || !json.ok) throw new Error("bad");
        setOv(json);

        if (json.mentorAccountStatus === "approved" || json.profileRole === "mentor") {
          const r = await fetch("/api/mentor/requests", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const jj = await r.json();
          if (r.ok && jj.ok) setRows(jj.rows as ReqRow[]);
        }
        setState("ok");
      } catch {
        setState("error");
      }
    }
    run();
  }, []);

  const canUseDashboard = useMemo(() => {
    if (!ov) return false;
    if (ov.mentorAccountStatus === "blocked") return false;
    if (ov.mentorAccountStatus === "suspended") return false;
    return ov.profileRole === "mentor" || ov.applicationStatus === "approved";
  }, [ov]);

  async function updateStatus(id: string, status: ReqRow["status"]) {
    setBusyId(id);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setState("noauth");
      const res = await fetch(`/api/mentor/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("bad");
      setRows(rows.map((r) => (r.id === id ? (json.row as ReqRow) : r)));
    } catch {
      alert("Failed to update status. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function StatusPanel() {
    if (!ov) return null;

    if (!ov.applicationStatus && ov.profileRole !== "mentor") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="opacity-80">You haven&apos;t applied yet.</div>
          <Link href="/apply" className="mt-3 inline-block rounded-full border px-4 py-2 hover:shadow">
            Apply to become a mentor
          </Link>
        </div>
      );
    }

    if (ov.applicationStatus === "pending") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="text-yellow-300">Pending — waiting for approval.</div>
        </div>
      );
    }

    if (ov.applicationStatus === "declined") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="text-red-400">Declined — apply again.</div>
          <Link href="/apply" className="mt-3 inline-block rounded-full border px-4 py-2 hover:shadow">
            Edit &amp; resubmit
          </Link>
        </div>
      );
    }

    if (ov.mentorAccountStatus === "suspended") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="text-yellow-300">Suspended — please wait while the team reviews.</div>
        </div>
      );
    }
    if (ov.mentorAccountStatus === "blocked") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="text-red-400">
            Blocked — you can submit an appeal at{" "}
            <a href="mailto:thefindyourfit@gmail.com" className="underline">thefindyourfit@gmail.com</a>.
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold">Mentor Dashboard</h1>

      {state === "loading" && (
        <div className="mt-8 animate-pulse">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="mt-4 h-24 w-full rounded bg-white/10" />
        </div>
      )}

      {state === "noauth" && (
        <div className="mt-8 rounded-2xl border p-5">
          <div className="opacity-80">Please sign in to view your dashboard.</div>
          <Link href="/auth" className="mt-3 inline-block rounded-full border px-4 py-2 hover:shadow">
            Go to Sign in
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="mt-8 rounded-2xl border p-5 text-red-400">Couldn’t load your status. Try refreshing.</div>
      )}

      {state === "ok" && (
        <>
          <StatusPanel />

          {canUseDashboard && (
            <>
              <div className="mt-6 rounded-2xl border p-4">
                <div className="opacity-80">
                  Welcome{ov?.displayName ? `, ${ov.displayName}` : ""}. Your public profile:
                </div>
                {ov?.mentorSlug ? (
                  <Link href={`/mentors/${ov.mentorSlug}`} className="mt-2 inline-block underline">
                    /mentors/{ov.mentorSlug}
                  </Link>
                ) : (
                  <div className="mt-2 opacity-60">Profile will appear after approval.</div>
                )}
              </div>

              <section className="mt-8">
                <h2 className="text-xl font-semibold">Incoming Requests</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="border-b px-3 py-2">Created</th>
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
                      {rows.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 opacity-70" colSpan={7}>
                            No requests yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
