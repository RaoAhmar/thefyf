'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AvailabilityRow = {
  id: string;
  user_id: string;
  weekday: number;    // 0..6
  start_min: number;  // 0..1440
  end_min: number;    // 0..1440
  is_afk: boolean;
};

type DayWindow = { start: string; end: string }; // "HH:MM"
type DayState = { afk: boolean; windows: DayWindow[] };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minsToHHMM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function hhmmToMins(s: string) {
  const [h, m] = s.split(':').map((x) => parseInt(x || '0', 10));
  return h * 60 + (isNaN(m) ? 0 : m);
}
function newWindow(): DayWindow {
  return { start: '10:00', end: '17:00' };
}

export default function MentorAvailability() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState<DayState[]>(
    Array.from({ length: 7 }, () => ({ afk: false, windows: [newWindow()] }))
  );

  // Auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!mounted) return;
      if (!u) {
        router.replace('/auth?next=/mentor/availability');
        return;
      }
      setUserId(u.id);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Load
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('weekday,start_min,end_min,is_afk')
        .eq('user_id', userId);

      if (!mounted) return;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const rows = data as AvailabilityRow[];
      const next: DayState[] = Array.from({ length: 7 }, () => ({
        afk: false,
        windows: [],
      }));

      for (const r of rows) {
        if (r.is_afk) {
          next[r.weekday].afk = true;
          next[r.weekday].windows = [];
        } else {
          next[r.weekday].windows.push({
            start: minsToHHMM(r.start_min),
            end: minsToHHMM(r.end_min),
          });
        }
      }

      for (let d = 0; d < 7; d++) {
        if (!next[d].afk && next[d].windows.length === 0) {
          next[d].windows.push(newWindow());
        }
      }

      setWeek(next);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const canSave = useMemo(
    () =>
      week.every((d) => {
        if (d.afk) return true;
        if (d.windows.length === 0) return false;
        return d.windows.every((w) => hhmmToMins(w.end) > hhmmToMins(w.start));
      }),
    [week]
  );

  async function save() {
    if (!userId || !canSave) return;
    setSaving(true);
    try {
      await supabase.from('mentor_availability').delete().eq('user_id', userId);

      const rows: Omit<AvailabilityRow, 'id'>[] = [];
      week.forEach((day, weekday) => {
        if (day.afk) {
          rows.push({
            user_id: userId,
            weekday,
            start_min: 0,
            end_min: 0,
            is_afk: true,
          });
        } else {
          day.windows.forEach((w) => {
            rows.push({
              user_id: userId,
              weekday,
              start_min: hhmmToMins(w.start),
              end_min: hhmmToMins(w.end),
              is_afk: false,
            });
          });
        }
      });

      if (rows.length) {
        const { error } = await supabase.from('mentor_availability').insert(rows);
        if (error) throw error;
      }
      alert('Availability saved.');
    } catch (e) {
      console.error(e);
      alert('Failed to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Availability</h1>
        <Link
          href="/mentor"
          className="rounded-full border px-4 py-2 text-sm transition hover:shadow"
        >
          ← Back to dashboard
        </Link>
      </div>

      <p className="opacity-80">
        Set multiple time windows per day (local time). Toggle AFK to block a day
        completely.
      </p>

      {loading ? (
        <div className="mt-6 opacity-70">Loading…</div>
      ) : (
        <div className="mt-6 grid gap-3">
          {week.map((day, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{DAYS[i]}</div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.afk}
                    onChange={(e) =>
                      setWeek((w) => {
                        const n = [...w];
                        n[i] = { ...n[i], afk: e.target.checked };
                        if (e.target.checked) n[i].windows = [];
                        if (!e.target.checked && n[i].windows.length === 0)
                          n[i].windows = [newWindow()];
                        return n;
                      })
                    }
                  />
                  <span>AFK (no bookings)</span>
                </label>
              </div>

              {!day.afk && (
                <>
                  {day.windows.map((win, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-3 pl-1"
                    >
                      <label className="flex items-center gap-2">
                        <span className="opacity-70 text-sm">Start</span>
                        <input
                          type="time"
                          value={win.start}
                          onChange={(e) =>
                            setWeek((w) => {
                              const n = [...w];
                              const wds = [...n[i].windows];
                              wds[idx] = { ...wds[idx], start: e.target.value };
                              n[i] = { ...n[i], windows: wds };
                              return n;
                            })
                          }
                          className="rounded border bg-transparent px-2 py-1"
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="opacity-70 text-sm">End</span>
                        <input
                          type="time"
                          value={win.end}
                          onChange={(e) =>
                            setWeek((w) => {
                              const n = [...w];
                              const wds = [...n[i].windows];
                              wds[idx] = { ...wds[idx], end: e.target.value };
                              n[i] = { ...n[i], windows: wds };
                              return n;
                            })
                          }
                          className="rounded border bg-transparent px-2 py-1"
                        />
                      </label>

                      <button
                        onClick={() =>
                          setWeek((w) => {
                            const n = [...w];
                            const wds = [...n[i].windows];
                            wds.splice(idx, 1);
                            n[i] = {
                              ...n[i],
                              windows: wds.length ? wds : [newWindow()],
                            };
                            return n;
                          })
                        }
                        className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div>
                    <button
                      onClick={() =>
                        setWeek((w) => {
                          const n = [...w];
                          n[i] = {
                            ...n[i],
                            windows: [...n[i].windows, newWindow()],
                          };
                          return n;
                        })
                      }
                      className="rounded-full border px-3 py-1 text-sm transition hover:shadow"
                    >
                      + Add window
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="rounded-full border px-4 py-2 text-sm transition hover:shadow disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save availability'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
