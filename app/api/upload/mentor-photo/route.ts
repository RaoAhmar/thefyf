import { supabaseAdmin } from "@/lib/supabaseServer";

// tiny helper to guess an extension
function pickExt(filename?: string, mime?: string) {
  const nameExt = (filename || "").split(".").pop()?.toLowerCase();
  if (nameExt) return nameExt;
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "no_token" }), { status: 401 });
    }

    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(token);
    if (ue || !u?.user) {
      return new Response(JSON.stringify({ ok: false, error: "bad_token" }), { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      filename?: string;
      contentType?: string;
    };

    const ext = pickExt(body.filename, body.contentType);
    const uid = u.user.id;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${uid}/${stamp}.${ext}`;

    // Create a short-lived signed upload ticket (no storage policies needed)
    const { data, error } = await supabaseAdmin
      .storage
      .from("mentor-photos")
      .createSignedUploadUrl(path, 120); // valid for 2 minutes

    if (error || !data) {
      return new Response(JSON.stringify({ ok: false, error: "sign_failed" }), { status: 500 });
    }

    // We return path + token; client will call uploadToSignedUrl(path, token, file)
    return new Response(
      JSON.stringify({ ok: true, path: data.path, token: data.token }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), { status: 500 });
  }
}
