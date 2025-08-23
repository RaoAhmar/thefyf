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
    if (!token) {
      return new Response(JSON.stringify({ ok: true, signedIn: false, isMentorApproved: false }), { status: 200 });
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ ok: true, signedIn: false, isMentorApproved: false }), { status: 200 });
    }

    const email = user.email ?? null;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();

    const { data: mentor } = await supabaseAdmin
      .from("mentors")
      .select("account_status")
      .eq("user_id", user.id)
      .single();

    const isMentorApproved = mentor?.account_status === "approved";

    return new Response(
      JSON.stringify({
        ok: true,
        signedIn: true,
        email,
        role: prof?.role || "mentee",
        displayName: prof?.display_name || (email ? email.split("@")[0] : null),
        isMentorApproved,
        isAdmin: isAllowed(email),
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}
