'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const search = useSearchParams();
  const next = search.get('next') || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setMsg(null);

    try {
      // Force the flow through Supabase's callback. It will verify the token
      // and then redirect to our /auth/callback WITH ?code=... appended.
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const finalDest = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next
      )}`;
      const emailRedirectTo = `${projectUrl}/auth/v1/callback?redirect_to=${encodeURIComponent(
        finalDest
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });

      if (error) throw error;
      setState('sent');
      setMsg('Check your inbox for the sign-in link.');
    } catch (err) {
      console.error(err);
      setState('error');
      setMsg('Could not send the magic link. Please try again.');
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm opacity-70">We’ll email you a magic link.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-lg border bg-transparent px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-full border px-4 py-2 text-sm transition hover:shadow disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>

        {msg && <div className="text-sm opacity-80">{msg}</div>}
      </form>
    </main>
  );
}
