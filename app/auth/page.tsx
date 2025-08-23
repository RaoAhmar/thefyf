"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUserEmail(null);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 opacity-70">No passwords. We’ll email you a link.</p>

      {userEmail ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="text-sm opacity-80">Signed in as</div>
          <div className="mt-1 font-mono">{userEmail}</div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/"
              className="rounded-full border px-4 py-2 transition hover:shadow"
            >
              Go home
            </Link>
            <button
              onClick={signOut}
              className="rounded-full border px-4 py-2 transition hover:shadow"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="mt-6">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border bg-black p-3 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className={`mt-3 w-full rounded-full border px-4 py-2 transition ${
              status === "sending" ? "opacity-60" : "hover:shadow"
            }`}
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>

          {status === "sent" && (
            <div className="mt-3 text-sm text-green-400">
              Check your inbox for the sign-in link.
            </div>
          )}
          {status === "error" && (
            <div className="mt-3 text-sm text-red-400">
              Couldn’t send the email. Try again.
            </div>
          )}
        </form>
      )}

      <div className="mt-10 text-sm opacity-60">
        <Link href="/">← Back to Home</Link>
      </div>
    </main>
  );
}
