"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const [state, setState] = useState<"working" | "ok" | "error">("working");

  useEffect(() => {
    supabaseBrowser.auth
      .exchangeCodeForSession()
      .then(({ error }) => setState(error ? "error" : "ok"))
      .catch(() => setState("error"));
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Signing you in…</h1>
      {state === "working" && (
        <p className="mt-2 opacity-70">Please wait a moment.</p>
      )}
      {state === "ok" && (
        <div className="mt-4 rounded-2xl border p-4">
          <div className="text-green-400">Success! You’re signed in.</div>
          <div className="mt-3 flex gap-3">
            <Link
              href="/"
              className="rounded-full border px-4 py-2 transition hover:shadow"
            >
              Go home
            </Link>
            <Link
              href="/mentors"
              className="rounded-full border px-4 py-2 transition hover:shadow"
            >
              Browse mentors
            </Link>
          </div>
        </div>
      )}
      {state === "error" && (
        <div className="mt-4 rounded-2xl border p-4">
          <div className="text-red-400">Couldn’t complete sign-in.</div>
          <div className="mt-3">
            <Link href="/auth" className="underline">
              Try again
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
