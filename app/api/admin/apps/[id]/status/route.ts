import { supabaseAdmin } from "@/lib/supabaseServer";
import type { PostgrestError } from "@supabase/supabase-js";

type Action = "approve" | "decline" | "suspend" | "block";

type AppRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  bio: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  country: string | null; // ISO code
  city: string | null;
  photo_url: string | null;
  rate: number | null;
  tags: string[] | null;
  experience:
    | {
        title?: string;
        company?: string;
        start?: string; // YYYY-MM
        end?: string | null; // YYYY-MM
        current?: boolean;
      }[]
    | null;
  status: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function calcYearsExp(roles: AppRow["experience"]): number {
  if (!roles || roles.length === 0) return 0;
  let months = 0;
  const now = new Date();
  for (const r of roles) {
    if (!r?.start) continue;
    const [syStr, smStr] = r.start.split("-");
    const sy = parseInt(syStr || "0", 10);
    const sm = parseInt(smStr || "1", 10);
    if (!sy) continue;
    const s = new Date(sy, (sm || 1) - 1, 1);

    let e: Date;
    if (r.current) {
      e = now;
    } else if (r.end) {
      const [eyStr, emStr] = r.end.split("-");
      const ey = parseInt(eyStr || "0", 10);
      const em = parseInt(emStr || "1", 10);
      e = ey ? new Date(ey, (em || 1) - 1, 1) : s;
    } else {
      e = s;
    }

    const diff = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (diff > 0) months += diff;
  }
  return Math.max(0, Math.floor(months / 12));
}

async function ensureUniqueSlug(base: string) {
  let candidate = slugify(base) || "mentor";
  for (let i = 0; i < 6; i++) {
    const { data } = await supabaseAdmin
      .from("mentors")
      .select("id")
      .eq("slug", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return candidate;
}

async function approve(app: AppRow) {
  // compute display name without mixing ?? and ||
  const nameFromParts = `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim();
  const displayName = (app.display_name ?? nameFromParts) || "Mentor";

  const slug = await ensureUniqueSlug(displayName);
  const years = calcYearsExp(app.experience ?? []);
  const location = [app.city, app.country].filter(Boolean).join(", ");

  // Upsert by user_id manually (avoid onConflict requirements)
  const existing = await supabaseAdmin
    .from("mentors")
    .select("id")
    .eq("user_id", app.user_id)
    .maybeSingle();
  if (existing.error) return existing;

  if (existing.data) {
    return await supabaseAdmin
      .from("mentors")
      .update({
        slug,
        display_name: displayName,
        headline: app.headline ?? null,
        rate: app.rate ?? 0,
        tags: app.tags ?? [],
        location,
        years_exp: years,
      })
      .eq("id", existing.data.id)
      .select("id")
      .single();
  } else {
    return await supabaseAdmin
      .from("mentors")
      .insert({
        user_id: app.user_id,
        slug,
        display_name: displayName,
        headline: app.headline ?? null,
        rate: app.rate ?? 0,
        tags: app.tags ?? [],
        location,
        years_exp: years,
      })
      .select("id")
      .single();
  }
}

async function setApplicationStatus(id: string, status: string) {
  return await supabaseAdmin
    .from("mentor_applications")
    .update({ status })
    .eq("id", id)
    .select("id,status")
    .single();
}

async function handleAction(id: string, action: Action) {
  // Load application
  const { data: app, error: loadErr } = await supabaseAdmin
    .from("mentor_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (loadErr || !app) {
    const e = loadErr as PostgrestError | null;
    return json({ ok: false, error: "not_found", detail: e?.message ?? null }, 404);
  }

  const row = app as AppRow;

  if (action === "approve") {
    const up = await approve(row);
    if (up.error) {
      const e = up.error as PostgrestError;
      return json({ ok: false, error: "mentor_upsert_failed", code: e.code, detail: e.message }, 500);
    }
    const upd = await setApplicationStatus(id, "approved");
    if (upd.error) {
      const e = upd.error as PostgrestError;
      return json({ ok: false, error: "status_update_failed", code: e.code, detail: e.message }, 500);
    }
    return json({ ok: true, action: "approve" });
  }

  // Other status changes
  const map: Record<Action, string> = {
    approve: "approved",
    decline: "declined",
    suspend: "suspended",
    block: "blocked",
  };
  const upd = await setApplicationStatus(id, map[action]);
  if (upd.error) {
    const e = upd.error as PostgrestError;
    return json({ ok: false, error: "status_update_failed", code: e.code, detail: e.message }, 500);
  }
  return json({ ok: true, action });
}

/* ---------------- Route handlers ---------------- */

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const action = (body as { action?: Action })?.action;
  if (!action || !["approve", "decline", "suspend", "block"].includes(action)) {
    return json({ ok: false, error: "invalid_action" }, 400);
  }
  return handleAction(id, action);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let action: Action | undefined;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const body = (await req.json()) as { action?: Action };
      action = body.action;
    } catch {
      return json({ ok: false, error: "bad_json" }, 400);
    }
  } else {
    const form = await req.formData();
    action = (form.get("action") as Action | null) ?? undefined;
  }

  if (!action || !["approve", "decline", "suspend", "block"].includes(action)) {
    return json({ ok: false, error: "invalid_action" }, 400);
  }

  return handleAction(id, action);
}
