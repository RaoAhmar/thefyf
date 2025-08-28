import { supabaseAdmin } from "@/lib/supabaseServer";

function isAllowed(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return email ? list.includes(email.toLowerCase()) : false;
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "No token" }), {
        status: 401,
      });
    }

    // Validate the Supabase access token and fetch user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Bad token" }), {
        status: 401,
      });
    }

    const email = userData.user.email ?? null;
    if (!isAllowed(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
      });
    }

    // Service role bypasses RLS safely on the server
    const { data, error } = await supabaseAdmin
      .from("session_requests")
      .select(
        "id, mentor_slug, requester_name, requester_email, preferred_time, message, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: "Query failed" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, rows: data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
    });
  }
}
