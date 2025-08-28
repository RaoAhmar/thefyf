import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return new Response(JSON.stringify({ ok: false, error: "No token" }), { status: 401 });

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) return new Response(JSON.stringify({ ok: false, error: "Bad token" }), { status: 401 });

    // find mentor slug for this user
    const { data: mentor } = await supabaseAdmin
      .from("mentors")
      .select("slug, account_status")
      .eq("user_id", u.user.id)
      .single();

    if (!mentor?.slug) {
      return new Response(JSON.stringify({ ok: false, error: "No mentor profile" }), { status: 403 });
    }
    if (mentor.account_status !== "approved") {
      return new Response(JSON.stringify({ ok: false, error: "Mentor not approved" }), { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("session_requests")
      .select("id, mentor_slug, requester_name, requester_email, preferred_time, message, status, created_at")
      .eq("mentor_slug", mentor.slug)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return new Response(JSON.stringify({ ok: false, error: "Query failed" }), { status: 500 });

    return new Response(JSON.stringify({ ok: true, rows: data || [], mentorSlug: mentor.slug }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
