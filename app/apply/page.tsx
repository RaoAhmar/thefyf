"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type AppRow = {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  rate: number | null;
  tags: string[] | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export default function ApplyPage() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<AppRow | null>(null);

  // form state
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState<string>("");
  const [tagsCsv, setTagsCsv] = useState("");

  const pending = app?.status === "pending";
  const approved = app?.status === "approved";
  const declined = app?.status === "declined";

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabaseBrowser.auth.getSession();
      const s = data.session;
      if (!s) {
        setLoading(false);
        return;
      }
      setSessionEmail(s.user.email ?? null);
      setUserId(s.user.id);

      // fetch latest application (if any)
      const { data: apps } = await supabaseBrowser
        .from("mentor_applications")
        .select("*")
        .eq("user_id", s.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (apps && apps[0]) {
        const a = apps[0] as AppRow;
        setApp(a);
        setHeadline(a.headline ?? "");
        setBio(a.bio ?? "");
        setRate(a.rate != null ? String(a.rate) : "");
        setTagsCsv((a.tags ?? []).join(", "));
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  const canEdit = useMemo(() => !!userId && (!app || pending), [userId, app, pending]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const cleanRate = rate.trim() ? parseInt(rate.trim(), 10) : null;
    const cleanTags =
      tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];

    try {
      setLoading(true);
      if (app && pending) {
        const { error } = await supabaseBrowser
          .from("mentor_applications")
          .update({
            headline: headline || null,
            bio: bio || null,
            rate: cleanRate,
            tags: cleanTags,
          })
          .eq("id", app.id)
          .select("*")
          .single();

        if (error) throw error;
      } else {
        const { data, error } = await supabaseBrowser
          .from("mentor_applications")
          .insert({
            user_id: userId,
            headline: headline || null,
            bio: bio || null,
            rate: cleanRate,
            tags: cleanTags,
          })
          .select("*")
          .single();

        if (error) throw error;
        setApp(data as AppRow);
      }

      // refetch to reflect current status/values
      const { data: apps } = await supabaseBrowser
        .from("mentor_applications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (apps && apps[0]) setApp(apps[0] as AppRow);
      alert("Application saved.");
    } catch (e) {
      alert("Could not save your application. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="mt-4 h-28 w-full rounded bg-white/10" />
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Apply to become a mentor</h1>
        <p className="mt-2 opacity-70">
          Please sign in to submit an application.
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-full border px-4 py-2 hover:shadow"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Apply to become a mentor</h1>
      <p className="mt-2 opacity-70">
        Signed in as <span className="font-mono">{sessionEmail}</span>
      </p>

      {approved && (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="text-green-400">
            Your application is approved. You’ll soon get access to the mentor
            tools.
          </div>
          <div className="mt-2 text-sm opacity-70">
            You can still view your submitted info below.
          </div>
        </div>
      )}

      {declined && (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="text-red-400">
            Your application was declined. You can edit and resubmit.
          </div>
        </div>
      )}

      {pending && (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="text-yellow-300">
            Your application is pending review.
          </div>
          <div className="mt-2 text-sm opacity-70">
            You can edit it until a decision is made.
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <label className="text-sm opacity-80">Headline</label>
        <input
          className="rounded-lg border bg-black p-2 text-white"
          placeholder="e.g., Sr. Data Scientist · ML & Interview Prep"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          disabled={!canEdit}
        />

        <label className="mt-3 text-sm opacity-80">Bio</label>
        <textarea
          rows={6}
          className="rounded-lg border bg-black p-2 text-white"
          placeholder="Tell mentees what you help with, and your background."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={!canEdit}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm opacity-80">Hourly Rate (PKR)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border bg-black p-2 text-white"
              placeholder="4000"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm opacity-80">Tags (comma-separated)</label>
            <input
              className="w-full rounded-lg border bg-black p-2 text-white"
              placeholder="Data, ML, Interview"
              value={tagsCsv}
              onChange={(e) => setTagsCsv(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={!canEdit}
            className={`rounded-full border px-4 py-2 transition ${
              canEdit ? "hover:shadow" : "opacity-60"
            }`}
          >
            {app ? "Save changes" : "Submit application"}
          </button>

          <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
            Go Home
          </Link>
        </div>
      </form>
    </main>
  );
}
