"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseClient";

type TagOption = { id: string; name: string; sort_order?: number };
type Country = { code: string; name: string };

type Role = {
  title: string;
  company: string;
  start: string; // YYYY-MM
  end?: string;  // YYYY-MM | ""
  current: boolean;
  description?: string;
};

export default function ApplyPage() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Load session + options
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        const email = data.session?.user?.email ?? null;
        if (!abort) setSessionEmail(email);

        // tags (admin controlled)
        const t = await fetch("/api/tags/options");
        const tj = await t.json();
        if (!abort && t.ok && tj.ok) setTags(tj.rows as TagOption[]);

        // countries
        const c = await fetch("/api/geo/countries");
        const cj = await c.json();
        if (!abort && c.ok && cj.ok) setCountries(cj.rows as Country[]);
      } finally {
        if (!abort) setLoading(false);
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
      if (patch.current) {
        next[idx].end = ""; // clear end if current
      }
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

  const disabledSubmit = useMemo(() => {
    // UI step only — saving wired in next step
    return true;
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Apply to become a mentor</h1>
      {sessionEmail && (
        <p className="mt-2 opacity-70">Signed in as <span className="font-mono">{sessionEmail}</span></p>
      )}

      {loading ? (
        <div className="mt-8 animate-pulse">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="mt-4 h-48 w-full rounded bg-white/10" />
        </div>
      ) : (
        <form className="mt-8 grid gap-6">
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
            <label className="block text-sm opacity-80">
              Photo (white background, square preferred)
            </label>
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
                  className="rounded-xl border"
                />
              </div>
            )}
          </div>

          {/* Experience (like LinkedIn) */}
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

          {/* Tags (multi-select from admin options only) */}
          <div>
            <label className="block text-sm opacity-80">Tags (choose all that apply)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length === 0 && (
                <div className="opacity-70">No tags available yet—admin will add these.</div>
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
              type="button"
              disabled={disabledSubmit}
              className="rounded-full border px-4 py-2 opacity-70"
              title="We’ll enable submit in the next step"
            >
              Submit application
            </button>
            <Link href="/" className="rounded-full border px-4 py-2 hover:shadow">
              Go Home
            </Link>
          </div>

          <p className="text-sm opacity-60">
            Heads-up: this step sets up the new fields. In the next step, we’ll connect the submit
            button to Supabase (including photo upload to storage and saving your experience).
          </p>
        </form>
      )}
    </main>
  );
}
