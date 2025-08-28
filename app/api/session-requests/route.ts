// app/api/session-requests/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';             // service key requires Node runtime
export const dynamic = 'force-dynamic';      // avoid static optimization

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,    // SERVER-ONLY secret
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    // Accept <form> submits and JSON
    const ct = req.headers.get('content-type') || '';
    let body: Record<string, any> = {};
    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      form.forEach((v, k) => (body[k] = v));
    } else {
      body = await req.json().catch(() => ({}));
    }

    // Normalize fields
    const mentor_slug = String(body.mentor_slug || body.slug || '').trim();
    const requester_name = String(body.requester_name || body.name || '').trim();
    const requester_email = String(body.requester_email || body.email || '').trim();
    const preferred_time = (body.preferred_time || '') as string;
    const message = (body.message || '') as string;

    if (!mentor_slug || !requester_name || !requester_email) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    // Look up mentor_id from slug
    const { data: mentor, error: mErr } = await supabaseAdmin
      .from('mentors')
      .select('id, slug')
      .eq('slug', mentor_slug)
      .maybeSingle();

    if (mErr || !mentor) {
      return NextResponse.json({ ok: false, error: 'mentor_not_found' }, { status: 404 });
    }

    // Insert the request
    const { error: insErr } = await supabaseAdmin.from('session_requests').insert({
      mentor_id: mentor.id,
      mentor_slug,
      requester_name,
      requester_email,
      preferred_time: preferred_time || null,
      message: message || null,
      status: 'pending',
    });

    if (insErr) {
      console.error(insErr);
      return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
    }

    // Redirect back to the mentor page with a success flag
    const url = new URL(`/mentors/${mentor_slug}?ok=1`, req.url);
    return NextResponse.redirect(url, { status: 303 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
