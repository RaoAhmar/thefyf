// GET /api/geo/cities?country=PK  ->  ["Karachi","Lahore",...]
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("country") || "").toUpperCase();
  if (!code) {
    return new Response(JSON.stringify({ ok: false, error: "missing_country" }), { status: 400 });
  }

  try {
    // 1) Resolve country code -> country name (REST Countries)
    const resName = await fetch(
      `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?fields=name`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!resName.ok) throw new Error("country_lookup_failed");
    const nameJson = await resName.json();
    const nameObj = Array.isArray(nameJson) ? nameJson[0] : nameJson;
    const countryName = String(nameObj?.name?.common || "").trim();
    if (!countryName) throw new Error("country_name_missing");

    // 2) Fetch city list (countriesnow.space)
    const resCities = await fetch(
      "https://countriesnow.space/api/v0.1/countries/cities",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: countryName }),
        // cache for 24h; change if you need fresher data
        next: { revalidate: 60 * 60 * 24 },
      }
    );
    if (!resCities.ok) throw new Error("cities_fetch_failed");
    const citiesJson: any = await resCities.json();

    const rows: string[] = Array.isArray(citiesJson?.data) ? citiesJson.data : [];
    const uniqueSorted = [...new Set(rows.map((c) => String(c).trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );

    return new Response(JSON.stringify({ ok: true, rows: uniqueSorted }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "cities_unavailable" }), { status: 502 });
  }
}
