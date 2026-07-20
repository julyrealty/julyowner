import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL0 = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL0, SRK);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSONH = { ...CORS, "content-type": "application/json" };

const cfgCache: Record<string, string> = {};
async function cfg(k: string): Promise<string> {
  if (cfgCache[k]) return cfgCache[k];
  const { data } = await admin.from("ho_config").select("value").eq("key", k).maybeSingle();
  cfgCache[k] = data?.value ?? "";
  return cfgCache[k];
}

type JvEstimate = {
  propertyId: string; address: string; estimate: number; low: number; high: number;
  confidence: string; attribution?: string;
};

/**
 * Raw address search, for the buyer-side autocomplete.
 *
 * JULY Value matches the stored address literally and stores it inconsistently
 * ("5535 Hastings St" in Burnaby, "2080 W 33rd Avenue" in Vancouver), so typing
 * the full street type misses: "5535 Hastings Street" returns nothing while
 * "5535 Hastings" returns seven. Dropping trailing words until something hits
 * covers that, and also covers a city typed into the street box.
 */
async function jvSearch(q: string, limit = 8): Promise<{ propertyId: string; address?: string }[]> {
  const base = await cfg("julyvalue_api_url");
  const key = await cfg("julyvalue_api_key");
  const cleaned = q.replace(/[,]/g, " ").replace(/\s+/g, " ").trim();
  if (!base || !key || cleaned.length < 3) return [];
  const H = { "X-API-Key": key, "content-type": "application/json" };

  const tokens = cleaned.split(" ");
  const tries: string[] = [];
  // At most three attempts — this runs per keystroke behind a debounce.
  for (let n = tokens.length; n >= 2 && tries.length < 3; n--) tries.push(tokens.slice(0, n).join(" "));
  if (tries.length === 0) tries.push(cleaned);

  for (const t of tries) {
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(t)}`, { headers: H });
      if (!r.ok) continue;
      const b = await r.json().catch(() => ({}));
      if (Array.isArray(b.results) && b.results.length > 0) return b.results.slice(0, limit);
    } catch { /* try the next, shorter query */ }
  }
  return [];
}

/**
 * Addresses from the DDF listing set, via july-platform's hub_address_search.
 *
 * JULY Value's index is much sparser than the listings — on W 33rd Avenue in
 * Vancouver it holds 2 properties against 16 in ddf_listings — so searching
 * only JULY Value made the tool look broken for most real addresses. These
 * results carry no estimate; they are marked so the UI can say so plainly.
 */
async function ddfSearch(q: string, limit = 6): Promise<
  { address: string; city: string; list_price: number | null; status: string | null; listing_key: string }[]
> {
  const base = await cfg("platform_url");
  const key = await cfg("platform_anon_key");
  const secret = await cfg("platform_bridge_secret");
  if (!base || !key || !secret || q.trim().length < 3) return [];
  try {
    const res = await fetch(`${base}/rest/v1/rpc/hub_address_search`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ p_q: q, p_secret: secret, p_limit: limit }),
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    return Array.isArray(body?.results) ? body.results : [];
  } catch {
    return [];
  }
}

/** Estimate for a propertyId the caller already picked from search results. */
async function jvEstimateById(propertyId: string): Promise<JvEstimate | null> {
  const base = await cfg("julyvalue_api_url");
  const key = await cfg("julyvalue_api_key");
  if (!base || !key || !propertyId) return null;
  try {
    const er = await fetch(`${base}/estimate`, {
      method: "POST",
      headers: { "X-API-Key": key, "content-type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    if (!er.ok) return null;
    const est = await er.json().catch(() => null);
    return est?.estimate ? (est as JvEstimate) : null;
  } catch { return null; }
}

/** Search JULY Value and return the estimate for the best unit+city-safe match, or null.
 *  Retries with a "number + first street word" query when the full street line misses
 *  (autocomplete writes "Street"/"Avenue"; listings abbreviate to St/Ave). */
async function jvEstimateFor(address1: string, unit: string | null, city: string | null): Promise<JvEstimate | null> {
  const base = await cfg("julyvalue_api_url");
  const key = await cfg("julyvalue_api_key");
  if (!base || !key || !address1?.trim()) return null;
  const H = { "X-API-Key": key, "content-type": "application/json" };
  const full = address1.replace(/^\s*[0-9a-z]+\s*-\s*/i, "").trim();
  const tokens = full.split(/\s+/);
  const queries = [full];
  if (tokens.length > 2) queries.push(tokens.slice(0, 2).join(" "));

  let results: { propertyId: string; address?: string }[] = [];
  for (const q of queries) {
    const sr = await fetch(`${base}/search?q=${encodeURIComponent(q)}`, { headers: H });
    if (!sr.ok) continue;
    const body = await sr.json().catch(() => ({ results: [] }));
    if (Array.isArray(body.results) && body.results.length > 0) { results = body.results; break; }
  }
  if (results.length === 0) return null;

  const normUnit = (unit ?? "").replace(/[^0-9a-z]/gi, "").toLowerCase();
  const cityLc = (city ?? "").trim().toLowerCase();
  const scored = results
    .map((r) => {
      const addr = String(r.address ?? "").toLowerCase();
      const m = addr.match(/^([0-9a-z]+)-/);
      const rUnit = m ? m[1] : "";
      let score = 0;
      if (cityLc && addr.includes(cityLc)) score += 2;
      if (normUnit && rUnit === normUnit) score += 4;
      if (!normUnit && !rUnit) score += 3;
      return { r, rUnit, addr, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (normUnit && best.rUnit !== normUnit) return null;
  if (!normUnit && best.rUnit) return null;
  if (cityLc && !best.addr.includes(cityLc)) return null;

  const er = await fetch(`${base}/estimate`, {
    method: "POST", headers: H,
    body: JSON.stringify({ propertyId: best.r.propertyId }),
  });
  if (!er.ok) return null;
  const est = await er.json().catch(() => null);
  if (!est?.estimate) return null;
  return est as JvEstimate;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");

  /* ---------------- lookup: any address, read-only ----------------
     Powers the buyer-side Valuation tool. Requires a signed-in user but
     touches no hub and writes nothing — it must never mutate someone's
     own home value as a side effect of looking up a listing. */
  if (action === "search" || action === "lookup") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(URL0, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSONH });

    /* Autocomplete: only ever offers addresses JULY Value actually holds, which
       is the difference between picking one and guessing its stored spelling. */
    if (action === "search") {
      const q = String(body.q ?? "");
      // Both sources at once. JULY Value entries lead because only they carry
      // an estimate; listings fill the long tail so a real address still lands.
      const [jv, ddf] = await Promise.all([jvSearch(q), ddfSearch(q)]);

      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const seen = new Set<string>();
      const results: Record<string, unknown>[] = [];

      for (const r of jv) {
        if (!r?.propertyId) continue;
        const addr = String(r.address ?? "");
        seen.add(norm(addr));
        results.push({ property_id: String(r.propertyId), address: addr, source: "value" });
      }
      for (const d of ddf) {
        const addr = [d.address, d.city].filter(Boolean).join(", ");
        if (!addr || seen.has(norm(addr))) continue;
        seen.add(norm(addr));
        results.push({
          address: addr, source: "listing",
          listing_key: d.listing_key, list_price: d.list_price ?? null, status: d.status ?? null,
        });
      }

      return new Response(JSON.stringify({ results: results.slice(0, 10) }), { headers: JSONH });
    }

    // Picked from autocomplete: no address matching needed, we have the id.
    const propertyId = body.property_id ? String(body.property_id) : "";
    if (propertyId) {
      const picked = await jvEstimateById(propertyId);
      if (!picked) return new Response(JSON.stringify({ matched: false }), { headers: JSONH });
      return new Response(JSON.stringify({
        matched: true,
        address: picked.address,
        estimate: Math.round(picked.estimate),
        low: Math.round(picked.low),
        high: Math.round(picked.high),
        confidence: ["low", "medium", "high"].includes(picked.confidence) ? picked.confidence : null,
        attribution: picked.attribution ?? null,
      }), { headers: JSONH });
    }

    const address1 = String(body.address1 ?? "").trim();
    if (!address1) return new Response(JSON.stringify({ error: "address1 required" }), { status: 400, headers: JSONH });
    const unit = body.unit ? String(body.unit) : null;
    const city = body.city ? String(body.city) : null;

    const est = await jvEstimateFor(address1, unit, city);
    if (!est) return new Response(JSON.stringify({ matched: false }), { headers: JSONH });
    return new Response(JSON.stringify({
      matched: true,
      address: est.address,
      estimate: Math.round(est.estimate),
      low: Math.round(est.low),
      high: Math.round(est.high),
      confidence: ["low", "medium", "high"].includes(est.confidence) ? est.confidence : null,
      attribution: est.attribution ?? null,
    }), { headers: JSONH });
  }

  if (action !== "refresh") {
    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
  }
  const hubId = String(body.hub_id ?? "");
  if (!hubId) return new Response(JSON.stringify({ error: "hub_id required" }), { status: 400, headers: JSONH });

  const secret = req.headers.get("x-cron-secret");
  const internal = !!secret && secret === (await cfg("cron_secret"));
  if (!internal) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(URL0, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSONH });
    const [{ data: mem }, { data: hubOwn }] = await Promise.all([
      admin.from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).maybeSingle(),
      admin.from("ho_hubs").select("id").eq("id", hubId).eq("pro_id", user.id).maybeSingle(),
    ]);
    if (!mem && !hubOwn) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
  }

  const { data: hub } = await admin.from("ho_hubs")
    .select("id,address1,unit,city,home_value,value_updated").eq("id", hubId).maybeSingle();
  if (!hub) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });

  const est = await jvEstimateFor(hub.address1, hub.unit, hub.city);
  if (!est) return new Response(JSON.stringify({ matched: false }), { headers: JSONH });

  const conf = ["low", "medium", "high"].includes(est.confidence) ? est.confidence : null;
  const patch = {
    home_value: Math.round(est.estimate),
    value_low: Math.round(est.low),
    value_high: Math.round(est.high),
    value_updated: new Date().toISOString(),
    value_confidence: conf,
  };
  const { error } = await admin.from("ho_hubs").update(patch).eq("id", hubId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSONH });

  return new Response(JSON.stringify({ matched: true, ...patch, attribution: est.attribution ?? null }), { headers: JSONH });
});
