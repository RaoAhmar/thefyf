import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tag_options")
    .select("id,name,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: "query_failed" }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, rows: data ?? [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
