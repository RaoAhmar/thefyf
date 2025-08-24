'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------- Types ----------
type Mentor = { id: string; slug: string; display_name: string };

type RequestRow = {
  id: string;
  created_at: string;
  mentor_id: string | null;
  mentor_slug: string | null;
  requester_name: string | null;
  requester_email: string | null;
  preferred_time: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'declined';
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'declined';

// ---------- Page ----------
export default function MentorDashboard() {
  const router = useRouter();
  const [mentor, setMentor] = useState<Mentor | null>(null);

  const [loadingReqs, setLoadingReqs] = useState(true);
  const [reqs, setReqs] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');

  // ---- Auth + mentor record
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!mounted) return;

      if (!u) {
        router.replace('/auth?next=/mentor');
        return;
      }

      // Get mentor row for this user
      const { data: m, error } = await supabase
        .from('mentors')
        .select('id,slug,display_name')
        .eq('user_id', u.id)
        .limit(1)
        .maybeSingle();

      if (error) console.error(error);
      setMentor((m as Mentor) ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // ---- Load my incoming requests (from public.session_requests)
  useEffect(() => {
    if (!mentor?.id) return;
    let mounted = true;
    (async () => {
      setLoadingReqs(true);
      const { data, error } = await supabase
        .from('session_requests')
        .select(
          'id,created_at,mentor_id,mentor_slug,requester_name,requester_email,preferred_time,message,status'
        )
        .eq('mentor_id', mentor.id)
        .order('created_at', { ascending: false });

      if (!mounted) return;
      if (error) {
        console.error(error);
        setReqs([]);
      } else {
        setReqs((data as RequestRow[]) ?? []);
      }
      setLoadingReqs(false);
    })();
    return () => {
      mounted = false;
    };
  }, [mentor?.id]);

  // ---- Requests actions
  async function updateRequest(id: string, status: 'approved' | 'declined') {
    try {
      const { error } = await supabase
        .from('session_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      console.error(e);
      alert('Could not update request.');
    }
  }

  const filtered = useMemo<RequestRow[]>(() => {
    if (filter === 'all') return reqs;
    return reqs.filter((r) => r.status === filter);
  }, [reqs, filter]);

  // ---- History (approved only)
  const approved = useMemo(
    () => reqs.filter((r) => r.status === 'approved'),
    [reqs]
  );

  const groupedByMentee = useMemo(() => {
    const map = new Map<string, RequestRow[]>();
    for (const r of approved) {
      const key = r.requester_email || r.requester_name || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ad = new Date(a[1][0].created_at).getTime();
      const bd = new Date(b[1][0].created_at).getTime();
      return bd - ad;
    });
  }, [approved]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Mentor dashboard</h1>
        <nav className="flex items-center gap-2">
          <Link
            href="/mentor/profile"
            className="rounded-full border px-4 py-2 text-sm transition hover:shadow"
          >
            Edit profile
          </Link>
          <Link
            href="/mentor/availability"
            className="rounded-full border px-4 py-2 text-sm transition hover:shadow"
          >
            Set availability
          </Link>
        </nav>
      </header>

      {!mentor && (
        <p className="mt-5 opacity-80">
          You don’t have a mentor profile yet (or it’s not approved). If you
          believe this is a mistake, contact support.
        </p>
      )}

      {/* Requests */}
      <section className="mt-8 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Incoming requests</h2>
          <div className="flex gap-2 text-sm">
            {(['pending', 'approved', 'declined', 'all'] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-full border px-3 py-1 transition ${
                    filter === s ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {loadingReqs ? (
          <div className="mt-4 opacity-70">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 opacity-70">No requests.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="opacity-70">
                <tr>
                  <th className="py-2">Created</th>
                  <th className="py-2">Requester</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Preferred time</th>
                  <th className="py-2">Message</th>
                  <th className="py-2">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-2">{r.requester_name ?? '—'}</td>
                    <td className="py-2">{r.requester_email ?? '—'}</td>
                    <td className="py-2">{r.preferred_time ?? '—'}</td>
                    <td className="py-2">{r.message ?? '—'}</td>
                    <td className="py-2 capitalize">{r.status}</td>
                    <td className="py-2">
                      {r.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateRequest(r.id, 'approved')}
                            className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateRequest(r.id, 'declined')}
                            className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="opacity-60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* History */}
      <section className="mt-8 rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">History (approved)</h2>
        <p className="mt-1 text-sm opacity-80">
          Overall approved sessions and breakdown by mentee.
        </p>

        <div className="mt-4">
          <div className="rounded-xl border p-3">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="opacity-70">Total approved</div>
                <div className="text-xl font-semibold">{approved.length}</div>
              </div>
              <div>
                <div className="opacity-70">Unique mentees</div>
                <div className="text-xl font-semibold">
                  {groupedByMentee.length}
                </div>
              </div>
            </div>
          </div>

          {/* Per-mentee lists */}
          <div className="mt-4 grid gap-3">
            {groupedByMentee.map(([key, items]) => (
              <details key={key} className="rounded-xl border p-3">
                <summary className="cursor-pointer select-none">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {key}{' '}
                      <span className="opacity-60 text-sm">
                        ({items.length} approved)
                      </span>
                    </div>
                    <div className="opacity-70 text-sm">
                      Last:{' '}
                      {new Date(items[0].created_at).toLocaleString()}
                    </div>
                  </div>
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="opacity-70">
                      <tr>
                        <th className="py-2">Created</th>
                        <th className="py-2">Preferred time</th>
                        <th className="py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="py-2">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                          <td className="py-2">{r.preferred_time ?? '—'}</td>
                          <td className="py-2">{r.message ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
            {groupedByMentee.length === 0 && (
              <div className="opacity-70">No approved sessions yet.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
