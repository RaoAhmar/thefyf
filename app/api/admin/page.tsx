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
