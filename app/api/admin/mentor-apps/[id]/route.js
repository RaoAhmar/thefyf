import { supabaseAdmin } from "@/lib/supabaseServer";

function isAllowed(email) {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return email ? list.includes(email.toLowerCase()) : false;
}

function slugify(input) {
  const s = (input || "mentor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return s || "mentor";
}

export async function PATCH(req, ctx) {
  try {
    // Next 14/15 compatibility: ctx may be a Promise
    const c = ctx && typeof ctx.then === "function" ? await ctx : (ctx || {});
    const id = c?.params?.id;
    if (!id) return new Response(JSON.stringify({ ok: false, error: "Missing id" }), { status: 400 });

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return new Response(JSON.stringify({ ok: false, error: "No token" }), { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return new Response(JSON.stringify({ ok: false, error: "Bad token" }), { status: 401 });
    if (!isAllowed(userData.user.email ?? null)) return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403 });

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? "").toLowerCase();
    if (!["approved", "declined", "pending"].includes(status)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid status" }), { status: 400 });
    }

    // Load the application
    const { data: app, error: appErr } = await supabaseAdmin
      .from("mentor_applications")
      .select("*")
      .eq("id", id)
      .single();
    if (appErr || !app) return new Response(JSON.stringify({ ok: false, error: "Application not found" }), { status: 404 });

    // Update application status
    const { data: updatedApp, error: updErr } = await supabaseAdmin
      .from("mentor_applications")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) return new Response(JSON.stringify({ ok: false, error: "Update failed" }), { status: 500 });

    let mentorSlug = null;

    if (status === "approved") {
      // Promote profile role -> mentor
      await supabaseAdmin
        .from("profiles")
        .update({ role: "mentor", updated_at: new Date().toISOString() })
        .eq("id", app.user_id);

      // Get display name for slug/name
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .eq("id", app.user_id)
        .single();

      const base = slugify(prof?.display_name || "mentor");
      let candidate = base;
      let n = 0;

      // Ensure slug uniqueness
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: rows } = await supabaseAdmin
          .from("mentors")
          .select("id")
          .eq("slug", candidate)
          .limit(1);
        if (!rows || rows.length === 0) break;
        n += 1;
        candidate = `${base}-${n}`;
      }
      mentorSlug = candidate;

      // Upsert mentor profile for this user
      const { data: existing } = await supabaseAdmin
        .from("mentors")
        .select("id,slug")
        .eq("user_id", app.user_id)
        .limit(1);

      if (existing && existing.length) {
        await supabaseAdmin
          .from("mentors")
          .update({
            slug: existing[0].slug || mentorSlug,
            display_name: prof?.display_name || "Mentor",
            headline: app.headline || null,
            bio: app.bio || null,
            rate: app.rate || null,
            tags: app.tags || [],
          })
          .eq("id", existing[0].id);
        mentorSlug = existing[0].slug || mentorSlug;
      } else {
        await supabaseAdmin.from("mentors").insert({
          user_id: app.user_id,
          slug: mentorSlug,
          display_name: prof?.display_name || "Mentor",
          headline: app.headline || null,
          bio: app.bio || null,
          rate: app.rate || null,
          tags: app.tags || [],
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, row: updatedApp, mentorSlug }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
