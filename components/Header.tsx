"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load session + role/name for header
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
        if (!abort && res.ok && json.ok) {
          setIsAdmin(!!json.isAdmin);
          setDisplayName(json.displayName || (json.email ? json.email.split("@")[0] : null));
        }
      } catch {
        /* ignore */
      }
    }

    run();
    return () => {
      abort = true;
    };
  }, []);

  // Close dropdown on outside click / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleSignOut() {
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      setOpen(false);
      setSignedIn(false);
      router.push("/");
      router.refresh();
    }
  }

  return (
    <header className="mx-auto max-w-6xl px-6 py-4">
      <div className="flex items-center justify-between border-b pb-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Find your Fit
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/apply">Become a mentor</Link>

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

          {/* Auth control: sign in OR name with dropdown */}
          {!signedIn ? (
            <Link
              href="/auth"
              className="rounded-full border px-3 py-1 transition hover:shadow"
            >
              Sign in
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="rounded-full border px-3 py-1 transition hover:shadow"
                title="Account"
              >
                {displayName ?? "Account"}
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-44 rounded-xl border bg-black p-1 shadow-lg"
                >
                  <button
                    role="menuitem"
                    onClick={handleSignOut}
                    className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
