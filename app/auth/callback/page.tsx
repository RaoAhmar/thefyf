'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');

  useEffect(() => {
    const code = search.get('code');
    const next = search.get('next') || '/';

    async function run() {
      try {
        if (!code) throw new Error('No code in URL');

        // Compatible with both signatures:
        //   new: exchangeCodeForSession({ code })
        //   old: exchangeCodeForSession(code)
        const auth: any = supabase.auth as any;
        const res =
          typeof auth.exchangeCodeForSession === 'function'
            ? await (async () => {
                try {
                  return await auth.exchangeCodeForSession({ code });
                } catch {
                  return await auth.exchangeCodeForSession(code as any);
                }
              })()
            : { error: new Error('exchangeCodeForSession not available') };

        if (res?.error) throw res.error;

        setStatus('ok');
        router.replace(next);
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    }

    run();
  }, [router, search]);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      {status === 'working' && <p>Signing you in…</p>}
      {status === 'ok' && <p>Signed in. Redirecting…</p>}
      {status === 'error' && (
        <p>Could not complete sign-in. Please request a new link.</p>
      )}
    </main>
  );
}
