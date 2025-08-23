// Returns [{ code: "PK", name: "Pakistan" }, ...] from REST Countries
type RestCountry = {
  cca2?: string;
  name?: { common?: string };
};

export async function GET() {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2",
      { next: { revalidate: 60 * 60 * 24 } } // cache 24h
    );
    if (!res.ok) throw new Error("countries_fetch_failed");

    const json: unknown = await res.json();
    const arr: RestCountry[] = Array.isArray(json) ? (json as RestCountry[]) : [];

    const rows = arr
      .map((r) => ({
        code: String(r.cca2 ?? "").toUpperCase(),
        name: String(r.name?.common ?? "").trim(),
      }))
      .filter((r) => r.code && r.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ ok: true, rows }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "countries_unavailable" }),
      { status: 502 }
    );
  }
}
