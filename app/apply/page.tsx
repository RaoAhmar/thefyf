"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseClient";

type TagOption = { id: string; name: string; sort_order?: number };
type Country = { code: string; name: string };

type Role = {
  title: string;
  company: string;
  start: string;  // YYYY-MM
  end?: string;   // YYYY-MM | ""
  current: boolean;
  description?: string;
};

type AppState = "loading" | "none" | "pending" | "declined" | "suspended" | "blocked" | "approved";

export default function ApplyPage() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Gate state (controls whether we show the form)
  const [state, setState] = useState<AppState>("loading");

  // Form state
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([
    { title: "", company: "", start: "", end: "", current: false, description: "" },
  ]);
  const [rate, setRate] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Options
  const [tags, setTags] = useState<TagOption[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [busyCities, setBusyCities] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { id: string }>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load session, app-status, and options
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        const sess = data.session;
        setSessionEmail(sess?.user?.email ?? null);

        // Determine current application state for this user
        let gate: AppState = "none";
        if (sess?.access_token) {
          const r = await fetch("/api/me/app-status", {
            headers: { Authorization: `Bearer ${sess.access_token}` },
          });
          const j = await r.json();
          if (r.ok && j?.ok) {
            gate = j.state as AppState;
          } else {
            gate = "none";
          }
        }
        if (!abort) setState(gate);

        // tags (admin controlled)
        const t = await fetch("/api/tags/options");
        const tj = await t.json();
        if (!abort && t.ok && tj.ok) setTags(tj.rows as TagOption[]);

        // countries
        const c = await fetch("/api/geo/countries");
        const cj = await c.json();
        if (!abort && c.ok && cj.ok) setCountries(cj.rows as Country[]);
      } catch {
        if (!abort) setState("none");
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, []);

  // When country changes, fetch its cities
  useEffect(() => {
    let abort = false;
    async function loadCities() {
      if (!country) {
        setCities([]);
        setCity("");
        return;
      }
      setBusyCities(true);
      try {
        const r = await fetch(`/api/geo/cities?country=${encodeURIComponent(country)}`);
        const j = await r.json();
        if (!abort && r.ok && j.ok) {
          setCities(j.rows as string[]);
          setCity("");
        }
      } finally {
        if (!abort) setBusyCities(false);
      }
    }
    loadCities();
    return () => {
      abort = true;
    };
  }, [country]);

  // Photo preview
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Helpers
  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }
  function updateRole(idx: number, patch: Partial<Role>) {
    setRoles((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch };
      if (patch.current) next[idx].end = "";
      return next;
    });
  }
  function addRole() {
    setRoles((arr) => [
      ...arr,
      { title: "", company: "", start: "", end: "", current: false, description: "" },
    ]);
  }
  function removeRole(idx: number) {
    setRoles((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      // session
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in to submit.");

      // 1) Optional: upload photo via signed URL
      let photoUrl: string | undefined;
      if (photoFile) {
        const signRes = await fetch("/api/upload/mentor-photo", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: photoFile.name,
            contentType: photoFile.type || "image/jpeg",
          }),
        });
        const signJson = await signRes.json();
        if (!signRes.ok || !signJson?.ok) throw new Error("Could not start photo upload.");

        const upRes = await supabaseBrowser.storage
          .from("mentor-photos")
          .uploadToSignedUrl(signJson.path, signJson.token, photoFile);
        if (upRes.error) throw new Error("Photo upload failed. Try a smaller image.");

        const { data: pub } = supabaseBrowser.storage
          .from("mentor-photos")
          .getPublicUrl(signJson.path);
        photoUrl = pub.publicUrl;
      }

      // 2) POST application to server (server resolves tag IDs to names)
      const saveRes = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first,
          last,
          headline,
          bio,
          linkedin,
          portfolio: portfolio || null,
          country,
          city,
          photoUrl: photoUrl || null,
          rate: Number(rate || "0"),
          roles,
          tagIds: selectedTags,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson?.ok) {
        throw new Error(saveJson?.detail || "Failed to submit. Please try again.");
      }

      setSubmitted({ id: saveJson.id as string });
      setState("pending"); // move UI to pending after successful submit
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------- UI ----------------

  // Pending / Suspended / Blocked / Approved banners (no form)
  if (state === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Apply to become a mentor</h1>
        <div className="mt-8 animate-pulse">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="mt-4 h-48 w-full rounded bg-white/10" />
        </div>
      </main>
    );
  }

  if (state === "approved") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">You are an approved mentor 🎉</h1>
        <p className="mt-3 opacity-80">
          Head over to your dashboard to manage your profile and requests.
        </p>
        <div className="mt-6">
          <Link href="/mentor" className="rounded-full border px-4 py-2 hover:shadow">
            Go to Mentor Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (state === "pending") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Application pending</h1>
        <p className="mt-3 opacity-80">
          Thanks—your application is under review. You’ll get an email when it’s approved.
        </p>
        <div className="mt-6">
          <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (state === "suspended") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Application on hold</h1>
        <p className="mt-3 opacity-80">
          Please wait while our team reviews your application.
        </p>
        <div className="mt-6">
          <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (state === "blocked") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Application blocked</h1>
        <p className="mt-3 opacity-80">
          If you think this is a mistake, you can appeal at{" "}
          <a href="mailto:thefindyourfit@gmail.com" className="underline">
            thefindyourfit@gmail.com
          </a>.
        </p>
        <div className="mt-6">
          <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // Declined → show a message but allow re-application (show the form)
  // None → plain form

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Apply to become a mentor</h1>
      {sessionEmail && (
        <p className="mt-2 opacity-70">
          Signed in as <span className="font-mono">{sessionEmail}</span>
        </p>
      )}

      {state === "declined" && (
        <div className="mt-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
          Your previous application was declined. You can edit your details and apply again below.
        </div>
      )}

      <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
        {/* Name */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm opacity-80">First name</label>
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-black p-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm opacity-80">Last name</label>
            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-black p-3"
              required
            />
          </div>
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm opacity-80">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g., Sr. Data Scientist · ML & Interview Prep"
            className="mt-1 w-full rounded-xl border bg-black p-3"
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm opacity-80">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell mentees what you help with, and your background."
            rows={6}
            className="mt-1 w-full rounded-xl border bg-black p-3"
            required
          />
        </div>

        {/* Links */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm opacity-80">LinkedIn URL</label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/in/username"
              className="mt-1 w-full rounded-xl border bg-black p-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm opacity-80">Portfolio (optional)</label>
            <input
              type="url"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://your-site.com"
              className="mt-1 w-full rounded-xl border bg-black p-3"
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm opacity-80">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-black p-3"
              required
            >
              <option value="">Select country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm opacity-80">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-black p-3"
              required
              disabled={!country || busyCities}
            >
              <option value="">
                {busyCities ? "Loading…" : country ? "Select city…" : "Choose country first"}
              </option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm opacity-80">Photo (white background, square preferred)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-xl border bg-black p-3 file:mr-3 file:rounded-full file:border file:px-3 file:py-1"
          />
          {photoPreview && (
            <div className="mt-3">
              <Image
                src={photoPreview}
                alt="Preview"
                width={96}
                height={96}
                unoptimized
                className="rounded-xl border"
              />
            </div>
          )}
        </div>

        {/* Experience */}
        <div>
          <label className="block text-sm opacity-80">Work experience</label>
          <div className="mt-2 grid gap-4">
            {roles.map((r, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    placeholder="Title (e.g., Senior Data Scientist)"
                    value={r.title}
                    onChange={(e) => updateRole(i, { title: e.target.value })}
                    className="rounded-xl border bg-black p-3"
                    required
                  />
                  <input
                    placeholder="Company (e.g., Acme Inc.)"
                    value={r.company}
                    onChange={(e) => updateRole(i, { company: e.target.value })}
                    className="rounded-xl border bg-black p-3"
                    required
                  />
                  <input
                    type="month"
                    placeholder="Start"
                    value={r.start}
                    onChange={(e) => updateRole(i, { start: e.target.value })}
                    className="rounded-xl border bg-black p-3"
                    required
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="month"
                      placeholder="End"
                      value={r.current ? "" : (r.end || "")}
                      onChange={(e) => updateRole(i, { end: e.target.value })}
                      className="w-full rounded-xl border bg-black p-3 disabled:opacity-50"
                      disabled={r.current}
                    />
                    <label className="inline-flex items-center gap-2 text-sm opacity-80">
                      <input
                        type="checkbox"
                        checked={r.current}
                        onChange={(e) => updateRole(i, { current: e.target.checked })}
                      />
                      Current
                    </label>
                  </div>
                </div>
                <textarea
                  placeholder="Short description (optional)"
                  value={r.description || ""}
                  onChange={(e) => updateRole(i, { description: e.target.value })}
                  className="mt-3 w-full rounded-xl border bg-black p-3"
                  rows={3}
                />
                {roles.length > 1 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => removeRole(i)}
                      className="rounded-full border px-3 py-1 text-sm hover:shadow"
                    >
                      Remove role
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRole}
            className="mt-3 rounded-full border px-3 py-1 text-sm hover:shadow"
          >
            + Add another role
          </button>
        </div>

        {/* Rate */}
        <div>
          <label className="block text-sm opacity-80">Hourly rate (PKR)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-black p-3"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm opacity-80">Tags (choose all that apply)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.length === 0 && (
              <div className="opacity-70">No tags available yet — admin will add these.</div>
            )}
            {tags.map((t) => (
              <label
                key={t.id}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  selectedTags.includes(t.id) ? "bg-white/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedTags.includes(t.id)}
                  onChange={() => toggleTag(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full border px-4 py-2 hover:shadow disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
          <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
            Go Home
          </Link>
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {errorMsg}
          </div>
        )}

        {submitted && (
          <div className="rounded-2xl border px-4 py-3">
            Application submitted! We’ll review it shortly.
          </div>
        )}
      </form>
    </main>
  );
}
