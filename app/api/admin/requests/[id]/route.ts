import { supabaseAdmin } from "@/lib/supabaseServer";

function isAllowed(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return email ? list.includes(email.toLowerCase()) : false;
}

export async function PATCH(
  req: Request,
  ctx: Promise<{ params: { id: string } }>
) {
  try {
    // Next.js 15: context is a Promise
    const { params } = await ctx;
    const id = params?.id;
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "Missing id" }), {
        status: 400,
      });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "No token" }), {
        status: 401,
      });
    }

    // Validate Supabase access token and check admin whitelist
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Bad token" }), {
        status: 401,
      });
    }
    if (!isAllowed(userData.user.email ?? null)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
    };
    const status = String(body?.status ?? "").toLowerCase();
    if (!["pending", "accepted", "declined"].includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid status" }), {
        status: 400,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("session_requests")
      .update({ status })
      .eq("id", id)
      .select(
        "id, mentor_slug, requester_name, requester_email, preferred_time, message, status, created_at"
      )
      .single();

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: "Update failed" }), {
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, row: data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), {
      status: 500,
    });
  }
}
