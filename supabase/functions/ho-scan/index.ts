// @ts-nocheck — Supabase Edge Function (Deno runtime). Deployed with
// `supabase functions deploy ho-scan`; not part of the Next.js build, so
// Node-side type checking is disabled for this file only.
//
// ho-scan — proxy between the homeowner hub and BuyerAiPro's document
// scanners (REST /api/v1, see BuyerAiPro API.md).
//
//   action "scan":   { hub_id, document_id, scan_type } -> { job_id, status }
//   action "status": { hub_id, job_id } -> { status, summary?, result?, items? }
//
// Auth: caller's Supabase JWT (Authorization header) must belong to a member
// of hub_id (ho_hub_members). Config comes from ho_config rows
// `buyeraipro_api_url` + `buyeraipro_api_key` (service-role only — the key
// never reaches the browser and is never echoed in responses or logs).

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/** Valid scan types — identical to BuyerAiPro scanner ids. */
const SCAN_TYPES = new Set(["inspection", "strata", "title", "pds", "contract"]);

/* ------------------------------------------------------------------ */
/* Inspection findings -> JULYOwner inventory item types.              */
/* The type strings MUST exactly match INVENTORY_CATALOG in            */
/* src/lib/demo.ts — that is what addInventory() keys on.              */
/* ------------------------------------------------------------------ */

const TERM_MAP: Array<{ re: RegExp; type: string }> = [
  { re: /\b(furnace|boiler|forced[- ]air|heating system)\b/i, type: "Heating" },
  { re: /\b(heat pump|air[- ]condition\w*|a\/c\b|ac unit|cooling system)\b/i, type: "Cooling / Heat Pump" },
  { re: /\b(water heater|hot[- ]water (?:tank|heater))\b/i, type: "Water Heater" },
  { re: /\b(roof(?:ing)?|shingles?)\b/i, type: "Roof" },
  { re: /\b(electrical panel|breaker panel|main panel|service panel|distribution panel)\b/i, type: "Electrical Panel" },
  { re: /\b(plumbing|supply piping|drain piping|water lines)\b/i, type: "Plumbing" },
  { re: /\bwindows?\b/i, type: "Windows" },
  { re: /\bdish[- ]?washers?\b/i, type: "Dishwasher" },
  { re: /\b(range\b|oven|stove|cooktop)/i, type: "Range" },
  { re: /\b(clothes washer|washing machine|washer\b)/i, type: "Washer" },
  { re: /\b(clothes dryer|dryer\b)/i, type: "Dryer" },
  { re: /\b(deck|porch)\b/i, type: "Deck" },
  { re: /\b(gutters?|downspouts?|eavestrough\w*)\b/i, type: "Gutters" },
];

const BRAND_RE =
  /\b(Carrier|Lennox|Trane|Goodman|Rheem|Ruud|Bradford White|A\.?\s?O\.?\s?Smith|John Wood|Giant|Navien|Rinnai|Daikin|Mitsubishi|Fujitsu|York|Amana|Bosch|Whirlpool|Samsung|LG|Maytag|KitchenAid|Frigidaire|Kenmore|General Electric|Electrolux|Miele|Viessmann)\b/;

function ageAndBrandNear(win: string): { age_years: number | null; brand: string | null } {
  let age: number | null = null;
  // "12-year-old furnace", "approximately 9 years old", "9 yrs of age"
  const m1 = win.match(/(\d{1,2})\s*[- ]?\s*(?:years?|yrs?)[- ]?\s*(?:old|of age|in age)/i);
  if (m1) age = parseInt(m1[1], 10);
  if (age == null) {
    // "estimated age: 12 years", "age of approximately 9 years"
    const m2 = win.match(/\bage\b[^.\n]{0,25}?(\d{1,2})\s*(?:years?|yrs?)/i);
    if (m2) age = parseInt(m2[1], 10);
  }
  if (age == null) {
    // "installed in 2014", "manufactured 2017", "replaced circa 2019"
    const m3 = win.match(/(?:installed|manufactured|replaced|dated?|circa|from)\s*(?:in|around|approx\.?|approximately)?\s*((?:19|20)\d{2})\b/i);
    if (m3) age = new Date().getFullYear() - parseInt(m3[1], 10);
  }
  if (age != null && (age < 0 || age > 80)) age = null;
  const bm = win.match(BRAND_RE);
  return { age_years: age, brand: bm ? bm[1].replace(/\s+/g, " ").trim() : null };
}

/** Best-effort extraction of inventory-mappable systems from report text. */
function extractItems(text: string): Array<{ item_type: string; brand: string | null; age_years: number | null }> {
  if (!text) return [];
  const items: Array<{ item_type: string; brand: string | null; age_years: number | null }> = [];
  const seen = new Set<string>();
  for (const { re, type } of TERM_MAP) {
    if (seen.has(type)) continue;
    const m = re.exec(text);
    if (!m) continue;
    const at = m.index ?? 0;
    const win = text.slice(Math.max(0, at - 160), Math.min(text.length, at + 320));
    const { age_years, brand } = ageAndBrandNear(win);
    items.push({ item_type: type, brand, age_years });
    seen.add(type);
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function cfg(admin, keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await admin.from("ho_config").select("key, value").in("key", keys);
  if (error) throw new Error(`config read failed: ${error.message}`);
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}

async function isHubMember(admin, hubId: string, user): Promise<boolean> {
  const { data: byId, error } = await admin
    .from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).limit(1);
  if (error) throw new Error(`member check failed: ${error.message}`);
  if (byId && byId.length > 0) return true;
  if (user.email) {
    const { data: byEmail, error: e2 } = await admin
      .from("ho_hub_members").select("id").eq("hub_id", hubId).eq("email", user.email).limit(1);
    if (e2) throw new Error(`member check failed: ${e2.message}`);
    if (byEmail && byEmail.length > 0) return true;
  }
  return false;
}

/** Normalize the configured base URL to ".../api/v1". */
function apiBase(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

async function upstreamError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch { /* non-JSON body */ }
  return `Scan service error (HTTP ${res.status}).`;
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

/** Turn a completed upstream scan into the shape we persist and render. */
function outcomeFrom(scan) {
  const items = scan.scannerId === "inspection"
    ? extractItems(`${scan.summary ?? ""}\n${scan.report ?? ""}`)
    : [];
  const md = scan.summary ?? scan.report ?? "";
  const findings = String(md).split(/\r?\n/)
    .filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*?/g, "").replace(/`/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return {
    summary: scan.summary ?? null,
    report: scan.report ?? null,
    findings,
    items,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const action = body?.action;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    /* ---------------- action: poll (cron only) ----------------
       Finishes scans the browser is no longer watching. This is what makes a
       scan survive the user closing the dialog or the whole browser. */
    if (action === "poll") {
      const secret = req.headers.get("x-cron-secret");
      const conf0 = await cfg(admin, ["cron_secret", "buyeraipro_api_url", "buyeraipro_api_key", "site_url"]);
      if (!secret || secret !== conf0["cron_secret"]) return json({ error: "forbidden" }, 403);
      const base0 = apiBase(conf0["buyeraipro_api_url"] ?? "");
      const key0 = conf0["buyeraipro_api_key"] ?? "";
      if (!base0 || !key0) return json({ error: "not configured" }, 503);
      const H0 = { "x-api-key": key0, "Content-Type": "application/json" };

      const { data: pending } = await admin
        .from("ho_scans").select("*").eq("status", "pending").not("job_id", "is", null)
        .order("created_at", { ascending: true }).limit(25);

      let done = 0, failed = 0, notified = 0;
      for (const row of pending ?? []) {
        // Give up on jobs that have been running far longer than any real scan.
        const ageMin = (Date.now() - new Date(row.created_at).getTime()) / 60000;
        try {
          const r = await fetch(`${base0}/scans/${encodeURIComponent(row.job_id)}`, { headers: H0 });
          if (!r.ok) {
            if (ageMin > 60) {
              await admin.from("ho_scans").update({
                status: "failed", error: "The scan service stopped responding.", completed_at: new Date().toISOString(),
              }).eq("id", row.id);
              failed++;
            }
            continue;
          }
          const scan = await r.json();
          if (scan.status === "complete") {
            const o = outcomeFrom(scan);
            await admin.from("ho_scans").update({
              status: "complete",
              summary: o.summary,
              findings: o.findings,
              items: o.items,
              completed_at: new Date().toISOString(),
            }).eq("id", row.id);
            await admin.from("ho_activities").insert({
              hub_id: row.hub_id, member_email: null,
              action: "AI review finished", detail: row.document_name ?? row.scan_type,
            });
            done++;
            // Tell the owner it is ready — they are almost certainly elsewhere.
            try {
              const notifyRes = await fetch(`${supabaseUrl}/functions/v1/ho-emails`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-cron-secret": conf0["cron_secret"],
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
                },
                body: JSON.stringify({ action: "scan_ready", scan_id: row.id }),
              });
              if (notifyRes.ok) {
                await admin.from("ho_scans").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
                notified++;
              }
            } catch (e) {
              console.error(`[ho-scan] notify failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          } else if (scan.status === "failed") {
            await admin.from("ho_scans").update({
              status: "failed",
              error: scan.errorMessage || "The scan failed.",
              completed_at: new Date().toISOString(),
            }).eq("id", row.id);
            failed++;
          } else if (ageMin > 60) {
            await admin.from("ho_scans").update({
              status: "failed", error: "The scan timed out.", completed_at: new Date().toISOString(),
            }).eq("id", row.id);
            failed++;
          }
        } catch (e) {
          console.error(`[ho-scan] poll ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return json({ checked: (pending ?? []).length, done, failed, notified });
    }

    /* ---------------- everything else needs a signed-in member ---------------- */
    const hubId = body?.hub_id;
    if (!action || typeof hubId !== "string" || !hubId) {
      return json({ error: "action and hub_id are required" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in" }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } = { user: null } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    // Membership gate — outsiders learn nothing about the hub.
    if (!(await isHubMember(admin, hubId, user))) return json({ error: "Not found" }, 404);

    /* ---------------- action: list ---------------- */
    if (action === "list") {
      const { data: rows } = await admin
        .from("ho_scans")
        .select("id,document_id,document_name,scan_type,status,summary,findings,items,error,created_at,completed_at")
        .eq("hub_id", hubId).order("created_at", { ascending: false }).limit(30);
      return json({ scans: rows ?? [] });
    }

    /* ---------------- action: cancel ----------------
       Stops the poller advancing a review the user no longer wants. The
       upstream job may already be running and is not refunded — we simply
       stop waiting on it and stop showing it. */
    if (action === "cancel") {
      const scanId = body?.scan_id;
      if (typeof scanId !== "string" || !scanId) return json({ error: "scan_id is required" }, 400);
      const { data: row } = await admin
        .from("ho_scans").select("id,status").eq("id", scanId).eq("hub_id", hubId).maybeSingle();
      if (!row) return json({ error: "Not found" }, 404);
      if (row.status !== "pending") return json({ ok: true, status: row.status });
      await admin.from("ho_scans")
        .update({ status: "failed", error: "Cancelled", completed_at: new Date().toISOString() })
        .eq("id", scanId);
      return json({ ok: true, status: "cancelled" });
    }

    const conf = await cfg(admin, ["buyeraipro_api_url", "buyeraipro_api_key"]);
    const rawUrl = conf["buyeraipro_api_url"];
    const apiKey = conf["buyeraipro_api_key"];
    if (!rawUrl || !apiKey) return json({ error: "AI document scanning is not configured yet." }, 503);
    const base = apiBase(rawUrl);
    const upstreamHeaders = { "x-api-key": apiKey, "Content-Type": "application/json" };

    /* ---------------- action: scan ---------------- */
    if (action === "scan") {
      const documentId = body?.document_id;
      const scanType = body?.scan_type;
      if (typeof documentId !== "string" || !documentId) return json({ error: "document_id is required" }, 400);
      if (typeof scanType !== "string" || !SCAN_TYPES.has(scanType)) {
        return json({ error: "scan_type must be one of: inspection, strata, title, pds, contract" }, 400);
      }

      const { data: doc, error: docErr } = await admin
        .from("ho_documents")
        .select("id, name, storage_path")
        .eq("id", documentId)
        .eq("hub_id", hubId)
        .maybeSingle();
      if (docErr) throw new Error(`document read failed: ${docErr.message}`);
      if (!doc) return json({ error: "Document not found" }, 404);
      if (!doc.storage_path) return json({ error: "This document has no stored file to scan." }, 400);
      if (!/\.pdf$/i.test(doc.name ?? "")) return json({ error: "Only PDF documents can be scanned." }, 400);

      /* Idempotency guard. A double-submit — impatient second click, a retry,
         a remounted component — used to start a SECOND upstream job on the same
         file: duplicate work and a duplicate charge. Han hit exactly this: two
         jobs on one title PDF, six seconds apart. Hand back the in-flight scan
         instead of buying another one. */
      const { data: inflight } = await admin
        .from("ho_scans")
        .select("id, job_id, status")
        .eq("hub_id", hubId)
        .eq("document_id", documentId)
        .eq("scan_type", scanType)
        .eq("status", "pending")
        .gt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inflight?.job_id) {
        return json({ job_id: inflight.job_id, scan_id: inflight.id, status: "pending", reused: true });
      }

      // 10-minute signed URL — BuyerAiPro fetches the bytes server-side right away.
      const { data: signed, error: signErr } = await admin.storage
        .from("ho-docs")
        .createSignedUrl(doc.storage_path, 600);
      if (signErr || !signed?.signedUrl) {
        throw new Error(`signed URL failed: ${signErr?.message ?? "no URL returned"}`);
      }

      /* ---- credits: check before spending money upstream ----
         Gating is off until `credits_enforced` is 'true', so the ledger can
         record real usage for a while before anyone is ever refused. */
      const credCfg = await cfg(admin, ["credits_enforced", `credits_cost_${scanType}`]);
      const enforcing = (credCfg["credits_enforced"] ?? "").toLowerCase() === "true";
      const cost = Math.max(0, parseInt(credCfg[`credits_cost_${scanType}`] ?? "0", 10) || 0);

      if (enforcing && cost > 0) {
        const { data: bal } = await admin.rpc("ho_credit_balance_for", { p_user: user.id });
        if ((bal ?? 0) < cost) {
          return json({ error: "insufficient_credits", needed: cost, balance: bal ?? 0 }, 402);
        }
      }

      const { data: hub } = await admin.from("ho_hubs").select("full_address").eq("id", hubId).maybeSingle();

      const res = await fetch(`${base}/scans`, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify({
          scannerId: scanType,
          fileUrls: [{ url: signed.signedUrl, filename: doc.name }],
          propertyAddress: hub?.full_address ?? undefined,
        }),
      });
      if (!res.ok) {
        const msg = await upstreamError(res);
        console.error(`[ho-scan] create failed (HTTP ${res.status}): ${msg}`);
        // 401/403 mean OUR key is bad — never surface auth details to the caller.
        if (res.status === 401 || res.status === 403) {
          return json({ error: "The scan service rejected the request. Please try again later." }, 502);
        }
        return json({ error: msg }, res.status >= 400 && res.status < 500 ? res.status : 502);
      }
      const created = await res.json();
      if (!created?.jobId) return json({ error: "The scan service did not return a job id." }, 502);

      // Persist BEFORE returning: from here the job completes with or without
      // this browser tab.
      const { data: rowIns } = await admin.from("ho_scans").insert({
        hub_id: hubId, document_id: doc.id, document_name: doc.name,
        scan_type: scanType, job_id: created.jobId, status: "pending", started_by: user.id,
      }).select("id").maybeSingle();

      /* Debit only now — the upstream job exists, so we never charge for a
         review that failed to start. The poller refunds if it fails later. */
      let balance: number | null = null;
      if (cost > 0 && rowIns?.id) {
        const { data: newBal, error: spendErr } = await admin.rpc("ho_spend_credits", {
          p_user: user.id, p_amount: cost, p_reason: "scan",
          p_scan_id: rowIns.id, p_note: `${scanType} review`,
        });
        if (spendErr) {
          // Ledger trouble must not cost the user a review they already started.
          console.error(`[ho-scan] credit debit failed for scan ${rowIns.id}: ${spendErr.message}`);
        } else {
          balance = newBal as number;
        }
      }

      return json({
        job_id: created.jobId, scan_id: rowIns?.id ?? null,
        status: created.status ?? "processing", spent: cost || 0, balance,
      });
    }

    /* ---------------- action: status ---------------- */
    if (action === "status") {
      const jobId = body?.job_id;
      if (typeof jobId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(jobId)) {
        return json({ error: "job_id is required" }, 400);
      }

      const res = await fetch(`${base}/scans/${encodeURIComponent(jobId)}`, { headers: upstreamHeaders });
      if (res.status === 404) return json({ error: "Scan not found" }, 404);
      if (!res.ok) {
        const msg = await upstreamError(res);
        console.error(`[ho-scan] status failed (HTTP ${res.status}): ${msg}`);
        return json({ error: "Could not check the scan status. Please try again." }, 502);
      }
      const scan = await res.json();

      if (scan.status === "complete") {
        const o = outcomeFrom(scan);
        // Mirror into ho_scans so the record matches what the user just saw.
        await admin.from("ho_scans").update({
          status: "complete", summary: o.summary, findings: o.findings, items: o.items,
          completed_at: new Date().toISOString(),
        }).eq("hub_id", hubId).eq("job_id", jobId).eq("status", "pending");
        // Activity log — best-effort, never fails the response.
        const { error: actErr } = await admin.from("ho_activities").insert({
          hub_id: hubId,
          member_email: user.email ?? null,
          action: "Ran an AI document scan",
          detail: scan.scannerId ?? "scan",
        });
        if (actErr) console.error(`[ho-scan] activity log failed: ${actErr.message}`);
        return json({
          status: "complete",
          summary: scan.summary ?? null,
          result: {
            scanner_id: scan.scannerId ?? null,
            report: scan.report ?? null,
            property_address: scan.propertyAddress ?? null,
            completed_at: scan.completedAt ?? null,
          },
          items: o.items,
        });
      }

      if (scan.status === "failed") {
        await admin.from("ho_scans").update({
          status: "failed", error: scan.errorMessage || "The scan failed.",
          completed_at: new Date().toISOString(),
        }).eq("hub_id", hubId).eq("job_id", jobId).eq("status", "pending");
        return json({ status: "failed", error: scan.errorMessage || "The scan failed. Please try again." });
      }
      return json({ status: scan.status ?? "processing" });
    }

    return json({ error: `Unknown action: ${String(action)}` }, 400);
  } catch (err) {
    console.error(`[ho-scan] ${err instanceof Error ? err.message : String(err)}`);
    return json({ error: "Something went wrong running the scan." }, 500);
  }
});
