import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mentorSlug = (body?.mentorSlug ?? "").toString().trim();
    const requester_name = (body?.name ?? "").toString().trim();
    const requester_email = (body?.email ?? "").toString().trim();
    const preferred_time = (body?.preferredTime ?? "").toString().trim();
    const message = (body?.message ?? "").toString().trim();

    if (!mentorSlug || !requester_name || !requester_email.includes("@")) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), { status: 400 });
    }

    // Find mentor id by slug
    const { data: mentor, error: mErr } = await supabaseAdmin
      .from("mentors")
      .select("id, slug")
      .eq("slug", mentorSlug)
      .single();

    if (mErr || !mentor) {
      return new Response(JSON.stringify({ ok: false, error: "Mentor not found" }), { status: 404 });
    }

    // Insert request
    const { error: iErr } = await supabaseAdmin.from("session_requests").insert({
      mentor_id: mentor.id,
      mentor_slug: mentor.slug,
      requester_name,
      requester_email,
      preferred_time,
      message,
      status: "pending",
    });

    if (iErr) {
      return new Response(JSON.stringify({ ok: false, error: "Insert failed" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Unexpected error" }), { status: 500 });
  }
}
