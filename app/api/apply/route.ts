import { supabaseAdmin } from "@/lib/supabaseServer";
import type { PostgrestError } from "@supabase/supabase-js";

type Role = {
  title: string;
  company: string;
  start: string;              // YYYY-MM
  end?: string | null;        // YYYY-MM or null
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
  country: string;            // ISO code, e.g., "PK"
  city: string;
  photoUrl?: string | null;   // public URL from Storage
  rate: number;
  roles: Role[];
  tagIds: string[];           // IDs from tag_options
};

export async function POST(req: Request) {
  try {
    // ---- Auth ----
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "no_token" }), { status: 401 });
    }

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "bad_token", detail: ue?.message ?? null }),
        { status: 401 }
      );
    }
    const uid = u.user.id;

    // ---- Parse & validate body ----
    const body = (await req.json()) as Body;

    const required =
      body.first?.trim() &&
      body.last?.trim() &&
      body.headline?.trim() &&
      body.bio?.trim() &&
      body.linkedin?.trim() &&
      body.country?.trim() &&
      body.city?.trim();

    if (!required) {
      return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400 });
    }

    // ---- Resolve admin-controlled tags (ids -> names) ----
    const tagIds = (body.tagIds ?? []).filter((id) => !!id);
    let tagNames: string[] = [];
    if (tagIds.length > 0) {
      const { data: tags, error: tagErr } = await supabaseAdmin
        .from("tag_options")
        .select("name")
        .in("id", tagIds)
        .eq("active", true);

      if (tagErr) {
        const e = tagErr as PostgrestError;
        return new Response(
          JSON.stringify({ ok: false, error: "tags_lookup_failed", code: e.code, detail: e.message }),
          { status: 500 }
        );
      }
      tagNames = (tags ?? []).map((t) => String(t.name));
    }

    // ---- Compose insert payload ----
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
      rate: Number.isFinite(body.rate) ? Number(body.rate) : 0,
      tags: tagNames,          // text[] from admin list only
      experience: body.roles,  // jsonb
      status: "pending" as const,
    };

    // ---- Insert application ----
    const { data: row, error: insErr } = await supabaseAdmin
      .from("mentor_applications")
      .insert(payload)
      .select("id,status,created_at")
      .single();

    if (insErr) {
      const e = insErr as PostgrestError;
      return new Response(
        JSON.stringify({
          ok: false,
          error: "insert_failed",
          code: e.code,
          detail: e.message,
          hint: e.hint ?? null,
          payloadKeys: Object.keys(payload),
        }),
        { status: 500 }
      );
    }

    // ---- Done ----
    return new Response(
      JSON.stringify({ ok: true, id: row?.id, status: row?.status }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: "server_error", detail }), {
      status: 500,
    });
  }
}
