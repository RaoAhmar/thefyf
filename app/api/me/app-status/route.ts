import { supabaseAdmin } from "@/lib/supabaseServer";

type Resp =
  | { ok: true; state: "approved" | "pending" | "declined" | "suspended" | "blocked" | "none" }
  | { ok: false; error: string; detail?: string | null };

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "no_token" } satisfies Resp), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Who is this user?
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "bad_token", detail: ue?.message ?? null } satisfies Resp),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
    const uid = u.user.id;

    // If they already are a mentor → approved
    const mentorQ = await supabaseAdmin
      .from("mentors")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (mentorQ.data) {
      return new Response(JSON.stringify({ ok: true, state: "approved" } satisfies Resp), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Else check latest application status
    const appQ = await supabaseAdmin
      .from("mentor_applications")
      .select("status, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appQ.data?.status) {
      const s = String(appQ.data.status).toLowerCase();
      if (s === "pending" || s === "declined" || s === "suspended" || s === "blocked") {
        return new Response(JSON.stringify({ ok: true, state: s } as Resp), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // No application found
    return new Response(JSON.stringify({ ok: true, state: "none" } satisfies Resp), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: "server_error", detail } satisfies Resp), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
