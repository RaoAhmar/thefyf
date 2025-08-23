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
    if (!token) return new Response(JSON.stringify({ ok: true, signedIn: false }), { status: 200 });

    const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !userData?.user) {
      return new Response(JSON.stringify({ ok: true, signedIn: false }), { status: 200 });
    }

    const email = userData.user.email ?? null;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role, display_name")
      .eq("id", userData.user.id)
      .single();

    return new Response(
      JSON.stringify({
        ok: true,
        signedIn: true,
        email,
        role: prof?.role || "mentee",
        displayName: prof?.display_name || (email ? email.split("@")[0] : null),
        isAdmin: isAllowed(email),
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}
