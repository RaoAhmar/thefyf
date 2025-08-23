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
    // Next 14/15: ctx may be a Promise
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
    const nextStatus = String(body?.status ?? "").toLowerCase();

    // New full set of allowed states
    const allowed = ["approved", "declined", "pending", "suspended", "blocked"];
    if (!allowed.includes(nextStatus)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid status" }), { status: 400 });
    }

    // Load the application
    const { data: app, error: appErr } = await supabaseAdmin
      .from("mentor_applications")
      .select("*")
      .eq("id", id)
      .single();
    if (appErr || !app) return new Response(JSON.stringify({ ok: false, error: "Application not found" }), { status: 404 });

    let mentorSlug = null;

    // --- Transition rules ----------------------------------------------------
    // - 'approved': promote profile.role -> 'mentor', upsert mentors row, set mentors.account_status='approved', set application.status='approved'
    // - 'suspended' | 'blocked': keep profile.role as-is (likely 'mentor'), set mentors.account_status accordingly, set application.status to same (for admin tabs)
    // - 'declined' | 'pending': update application.status; do not touch mentors row
    // ------------------------------------------------------------------------

    if (nextStatus === "approved") {
      // Promote to mentor in profiles
      await supabaseAdmin
        .from("profiles")
        .update({ role: "mentor", updated_at: new Date().toISOString() })
        .eq("id", app.user_id);

      // Name for profile
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name")
        .eq("id", app.user_id)
        .single();

      const base = slugify(prof?.display_name || "mentor");
      let candidate = base;
      let n = 0;
      // ensure slug unique
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

      // Upsert mentor row & mark approved
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
            account_status: "approved",
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
          account_status: "approved",
        });
      }
    }

    if (nextStatus === "suspended" || nextStatus === "blocked") {
      // Adjust live mentor account status (if mentor row exists)
      const { data: mentor } = await supabaseAdmin
        .from("mentors")
        .select("id,slug")
        .eq("user_id", app.user_id)
        .single();
      if (mentor) {
        await supabaseAdmin
          .from("mentors")
          .update({ account_status: nextStatus })
          .eq("id", mentor.id);
        mentorSlug = mentor.slug;
      }
    }

    // Update the application status to reflect the chosen tab
    const { data: updatedApp, error: updErr } = await supabaseAdmin
      .from("mentor_applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) return new Response(JSON.stringify({ ok: false, error: "Update failed" }), { status: 500 });

    return new Response(JSON.stringify({ ok: true, row: updatedApp, mentorSlug }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500 });
  }
}
