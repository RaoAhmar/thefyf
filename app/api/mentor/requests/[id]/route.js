import { supabaseAdmin } from "@/lib/supabaseServer";

export async function PATCH(req, ctx) {
  try {
    const c = ctx && typeof ctx.then === "function" ? await ctx : ctx || {};
    const id = c?.params?.id;
    if (!id) return new Response(JSON.stringify({ ok: false, error: "Missing id" }), { status: 400 });

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return new Response(JSON.stringify({ ok: false, error: "No token" }), { status: 401 });

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) return new Response(JSON.stringify({ ok: false, error: "Bad token" }), { status: 401 });

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "").toLowerCase();
    if (!["pending", "accepted", "declined"].includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid status" }), { status: 400 });
    }

    // Check mentor identity
    const { data: mentor } = await supabaseAdmin
      .from("mentors")
      .select("id, slug, account_status")
      .eq("user_id", u.user.id)
      .single();

    if (!mentor?.slug) return new Response(JSON.stringify({ ok: false, error: "No mentor profile" }), { status: 403 });
    if (mentor.account_status !== "approved") {
      return new Response(JSON.stringify({ ok: false, error: "Mentor not approved" }), { status: 403 });
    }

    // Update only if the request belongs to this mentor
    const { data, error } = await supabaseAdmin
      .from("session_requests")
      .update({ status })
      .eq("id", id)
      .eq("mentor_slug", mentor.slug)
      .select(
        "id, mentor_slug, requester_name, requester_email, preferred_time, message, status, created_at"
      )
      .single();

    if (error) return new Response(JSON.stringify({ ok: false, error: "Update failed" }), { status: 500 });

    return new Response(JSON.stringify({ ok: true, row: data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
