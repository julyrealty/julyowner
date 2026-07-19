// @ts-nocheck — Supabase Edge Function (Deno runtime). Deployed with
// `supabase functions deploy ho-rates`; not part of the Next.js build.
//
// ho-rates — refreshes public Canadian interest rates into ho_market_rates.
//
//   action "refresh": cron only -> { updated: n, observed_on }
//
// Source is the Bank of Canada Valet API, which publishes this data openly and
// without a key. We deliberately do NOT scrape a rate-comparison site: those
// tables are a commercial product, their robots.txt disallows /api/, and their
// "best available" numbers are qualified offers a given buyer may not get.
//
// IMPORTANT — the conventional mortgage series are POSTED rates: the sticker
// price chartered banks advertise, not the discounted rate anyone signs. They
// run well above negotiated rates and must never be shown as "your rate".
// They are published here because posted rates genuinely matter twice: they
// are the benchmark a discount is quoted from, and lenders may calculate an
// IRD prepayment penalty from the posted rate at signing minus your discount
// (Financial Consumer Agency of Canada, "Mortgage fees: Prepayment penalties").

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/** Bank of Canada Valet series we publish, all from the chartered_bank_interest group. */
const SERIES: Record<string, { label: string; kind: string; term_years: number | null }> = {
  V80691311: { label: "Prime rate", kind: "prime", term_years: null },
  V80691333: { label: "Posted 1-year fixed", kind: "posted", term_years: 1 },
  V80691334: { label: "Posted 3-year fixed", kind: "posted", term_years: 3 },
  V80691335: { label: "Posted 5-year fixed", kind: "posted", term_years: 5 },
};

// Two years of weekly observations: the last one is "current", the rest is the
// trend line. One request covers both, and re-upserting is idempotent.
const WEEKS = 104;
const VALET =
  `https://www.bankofcanada.ca/valet/observations/group/chartered_bank_interest/json?recent=${WEEKS}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.action !== "refresh") return json({ error: "unknown action" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: conf } = await admin
    .from("ho_config").select("value").eq("key", "cron_secret").maybeSingle();
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== conf?.value) return json({ error: "forbidden" }, 403);

  let payload: { observations?: Array<Record<string, unknown>> };
  try {
    const res = await fetch(VALET, { headers: { accept: "application/json" } });
    if (!res.ok) return json({ error: `valet ${res.status}` }, 502);
    payload = await res.json();
  } catch (e) {
    return json({ error: `valet unreachable: ${String(e)}` }, 502);
  }

  const all = (payload.observations ?? []).filter((o) => o?.d);
  if (all.length === 0) return json({ error: "no observations" }, 502);
  // Pick the newest by DATE, never by array position: Valet returns this group
  // newest-first, so trusting the last element silently stored a two-year-old
  // figure as "today's rate".
  const obs = all.reduce((a, b) => (String(a.d) >= String(b.d) ? a : b));
  const observedOn = String(obs.d);

  const num = (o: Record<string, unknown>, id: string): number => {
    const raw = (o[id] as { v?: string } | undefined)?.v;
    return raw == null || raw === "" ? NaN : Number(raw);
  };

  const rows: unknown[] = [];
  const history: unknown[] = [];
  for (const [seriesId, meta] of Object.entries(SERIES)) {
    const value = num(obs, seriesId);
    // A series can be absent or blank on a given day — skip rather than write a zero.
    if (!Number.isFinite(value)) continue;
    rows.push({
      series_id: seriesId,
      label: meta.label,
      kind: meta.kind,
      term_years: meta.term_years,
      value,
      observed_on: observedOn,
      updated_at: new Date().toISOString(),
    });
    for (const o of all) {
      const v = num(o, seriesId);
      if (!o?.d || !Number.isFinite(v)) continue;
      history.push({ series_id: seriesId, observed_on: String(o.d), value: v });
    }
  }
  if (rows.length === 0) return json({ error: "no usable series" }, 502);

  const { error } = await admin.from("ho_market_rates").upsert(rows, { onConflict: "series_id" });
  if (error) return json({ error: error.message }, 500);

  // History is a nice-to-have: a failure here must not fail the current figures.
  let historyRows = 0;
  if (history.length > 0) {
    const { error: hErr } = await admin
      .from("ho_rate_history").upsert(history, { onConflict: "series_id,observed_on" });
    if (!hErr) historyRows = history.length;
  }

  return json({ updated: rows.length, history: historyRows, observed_on: observedOn });
});
