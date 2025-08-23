import { supabaseAdmin } from "@/lib/supabaseServer";

type Role = {
  title: string;
  company: string;
  start: string;
  end?: string | null;
  current?: boolean;
  description?: string | null;
};

type Body = {
  first: string;
  last: string;
  headline: string;
  bio: string;
  linkedin: string;
  portfolio?: string | null;
  country: string;
  city: string;
  photoUrl?: string | null;
  rate: number;
  roles: Role[];
  tagIds: string[];
};

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "no_token" }), { status: 401 });
    }

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) {
      return new Response(JSON.stringify({ ok: false, error: "bad_token", detail: ue?.message }), {
        status: 401,
      });
    }
    const uid = u.user.id;

    const body: Body = (await req.json()) as Body;

    if (
      !body.first?.trim() ||
      !body.last?.trim() ||
      !body.headline?.trim() ||
      !body.bio?.trim() ||
      !body.linkedin?.trim() ||
      !body.country?.trim() ||
      !body.city?.trim()
    ) {
      return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400 });
    }

    // resolve tag ids -> names (admin controlled)
    const tagIds = (body.tagIds || []).filter(Boolean);
    let tagNames: string[] = [];
    if (tagIds.length) {
      const { data: tags, error: tagErr } = await supabaseAdmin
        .from("tag_options")
        .select("name")
        .in("id", tagIds)
        .eq("active", true);
      if (tagErr) {
        return new Response(
          JSON.stringify({ ok: false, error: "tags_lookup_failed", detail: tagErr.message }),
          { status: 500 }
        );
      }
      tagNames = (tags || []).map((t) => String(t.name));
    }

    const displayName = `${body.first.trim()} ${body.last.trim()}`.trim();

    const payload = {
      user_id: uid,
      display_name: displayName,
      first_name: body.first.trim(),
      last_name: body.last.trim(),
      headline: body.headline.trim(),
      bio: body.bio.trim(),
      linkedin_url: body.linkedin.trim(),
      portfolio_url: body.portfolio?.trim() || null,
      country: body.country.trim(),
      city: body.city.trim(),
      photo_url: body.photoUrl || null,
      rate: Number(body.rate) || 0,
      tags: tagNames,          // text[] from admin options only
      experience: body.roles,  // jsonb
      status: "pending" as const, // <-- if this column doesn't exist, we'll see it in error below
    };

    const { data: row, error: insErr } = await supabaseAdmin
      .from("mentor_applications")
      .insert(payload)
      .select("id,status,created_at")
      .single();

    if (insErr) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "insert_failed",
          code: insErr.code,
          detail: insErr.message,
          hint: (insErr as any).hint ?? null,
          payloadKeys: Object.keys(payload),
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: row?.id, status: row?.status }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "server_error",
        detail: e instanceof Error ? e.message : String(e),
      }),
      { status: 500 }
    );
  }
}
