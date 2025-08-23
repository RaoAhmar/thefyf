"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Header() {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let abort = false;
    async function run() {
      const { data } = await supabaseBrowser.auth.getSession();
      const s = data.session;
      if (!s) return;
      if (!abort) setSignedIn(true);

      try {
        const res = await fetch("/api/me/role", {
          headers: { Authorization: `Bearer ${s.access_token}` },
        });
        const json = await res.json();
        if (!abort && res.ok && json.ok) setIsAdmin(!!json.isAdmin);
      } catch {
        /* ignore */
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, []);

  return (
    <header className="mx-auto max-w-6xl px-6 py-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Find your Fit
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/mentors">Mentors</Link>
          <Link href="/apply">Apply</Link>
          <Link
            href="/mentor"
            className="rounded-full border px-3 py-1 transition hover:shadow"
          >
            Mentor
          </Link>
          {isAdmin && (
            <Link
              href="/admin/apps"
              className="rounded-full border px-3 py-1 transition hover:shadow"
            >
              Admin
            </Link>
          )}
          {!signedIn && (
            <Link href="/auth" className="underline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
