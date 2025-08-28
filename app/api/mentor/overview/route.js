import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return new Response(JSON.stringify({ ok: false, error: "No token" }), { status: 401 });

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) return new Response(JSON.stringify({ ok: false, error: "Bad token" }), { status: 401 });
    const uid = u.user.id;

    // profile role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, display_name")
      .eq("id", uid)
      .single();

    // latest application
    const { data: apps } = await supabaseAdmin
      .from("mentor_applications")
      .select("status, id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1);

    const app = apps && apps[0] ? apps[0] : null;

    // mentor row (if exists)
    const { data: mentor } = await supabaseAdmin
      .from("mentors")
      .select("slug, account_status")
      .eq("user_id", uid)
      .single();

    return new Response(
      JSON.stringify({
        ok: true,
        profileRole: profile?.role || "mentee",
        displayName: profile?.display_name || null,
        applicationStatus: app?.status || null, // pending/approved/declined/suspended/blocked OR null
        mentorSlug: mentor?.slug || null,
        mentorAccountStatus: mentor?.account_status || null, // approved/suspended/blocked OR null
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
