import { supabaseAdmin } from "@/lib/supabaseServer";

function isAllowed(email) {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return email ? list.includes(email.toLowerCase()) : false;
}

export async function GET(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return new Response(JSON.stringify({ ok: false, error: "No token" }), { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Bad token" }), { status: 401 });
    }
    if (!isAllowed(userData.user.email ?? null)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403 });
    }

    const { data: apps, error } = await supabaseAdmin
      .from("mentor_applications")
      .select("id,user_id,headline,bio,rate,tags,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return new Response(JSON.stringify({ ok: false, error: "Query failed" }), { status: 500 });

    const userIds = [...new Set((apps || []).map((a) => a.user_id))];
    let profiles = [];
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .in("id", userIds);
      profiles = profs || [];
    }
    const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.display_name]));

    const rows = (apps || []).map((a) => ({
      ...a,
      display_name: nameById[a.user_id] || null,
    }));

    return new Response(JSON.stringify({ ok: true, rows }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
