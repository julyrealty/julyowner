// ho-buyer — JULY Search sync for the hub's Buying HQ.
// Reads the caller's OWN JULY Search activity (by their email) from
// july-platform via the secret-gated RPC hub_buyer_snapshot. Degrades to
// { linked: false } until that bridge function exists on july-platform.
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

// `viewed` belongs here. It was missing, so Recently Viewed rendered empty for
// every live buyer even when JULY Search had rows: the bridge returned them and
// this function quietly dropped the key on the way through.
const EMPTY = { linked: false, watched: [], searches: [], tours: [], viewed: [] };

/** Ask july-platform for this email's JULY Search activity. Any failure → EMPTY. */
async function buyerSnapshot(email: string) {
  try {
    const base = await cfg("platform_url");
    const key = await cfg("platform_anon_key");
    const secret = await cfg("platform_bridge_secret");
    if (!base || !key || !secret || !email) return EMPTY;
    const res = await fetch(`${base}/rest/v1/rpc/hub_buyer_snapshot`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ p_email: email, p_secret: secret }),
    });
    if (!res.ok) return EMPTY; // bridge not installed yet, or forbidden
    const data = await res.json().catch(() => null);
    if (!data || typeof data.linked !== "boolean") return EMPTY;
    return {
      linked: data.linked,
      watched: Array.isArray(data.watched) ? data.watched : [],
      searches: Array.isArray(data.searches) ? data.searches : [],
      tours: Array.isArray(data.tours) ? data.tours : [],
      viewed: Array.isArray(data.viewed) ? data.viewed : [],
    };
  } catch {
    return EMPTY;
  }
}

/** Call any hub_* bridge RPC on july-platform with the shared secret. */
async function bridge(fn: string, args: Record<string, unknown>): Promise<unknown | null> {
  try {
    const base = await cfg("platform_url");
    const key = await cfg("platform_anon_key");
    const secret = await cfg("platform_bridge_secret");
    if (!base || !key || !secret) return null;
    const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ ...args, p_secret: secret }),
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

const ACTIONS = new Set(["snapshot", "alerts_list", "alert_save", "alert_delete"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");
  if (!ACTIONS.has(action)) {
    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
  }

  // Internal test path: shared secret + explicit email.
  const secret = req.headers.get("x-cron-secret");
  if (action === "snapshot" && secret && secret === (await cfg("cron_secret"))) {
    const snap = await buyerSnapshot(String(body.email ?? ""));
    return new Response(JSON.stringify(snap), { headers: JSONH });
  }

  // User path: must be a member of the hub; we only ever look up the caller's own email.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL0, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user?.email) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSONH });
  const hubId = String(body.hub_id ?? "");
  if (!hubId) return new Response(JSON.stringify({ error: "hub_id required" }), { status: 400, headers: JSONH });
  const { data: mem } = await admin.from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).maybeSingle();
  if (!mem) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });

  if (action === "snapshot") {
    const snap = await buyerSnapshot(user.email);
    return new Response(JSON.stringify(snap), { headers: JSONH });
  }

  /* ---- alerts ----
     The email is always the CALLER's, taken from their verified session and
     never from the request body. That is what stops a hub member managing
     somebody else's JULY Search alerts. */
  if (action === "alerts_list") {
    const out = await bridge("hub_alert_list", { p_email: user.email });
    return new Response(JSON.stringify(out ?? { linked: false, alerts: [] }), { headers: JSONH });
  }

  if (action === "alert_save") {
    const crit = body.criteria;
    if (!crit || typeof crit !== "object" || Array.isArray(crit)) {
      return new Response(JSON.stringify({ error: "criteria must be an object" }), { status: 400, headers: JSONH });
    }
    const out = await bridge("hub_alert_save", {
      p_email: user.email,
      p_name: String(body.name ?? "").slice(0, 120),
      p_criteria: crit,
      p_scope: ["search", "area", "building"].includes(String(body.scope)) ? String(body.scope) : "search",
      p_alert_new: body.alert_new !== false,
      p_alert_sold: body.alert_sold === true,
      p_frequency: ["instant", "daily", "weekly", "off"].includes(String(body.frequency)) ? String(body.frequency) : "daily",
      p_id: body.id ? String(body.id) : null,
    });
    if (!out) return new Response(JSON.stringify({ error: "Alerts are unavailable right now." }), { status: 502, headers: JSONH });
    return new Response(JSON.stringify(out), { headers: JSONH });
  }

  if (action === "alert_delete") {
    const id = String(body.id ?? "");
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: JSONH });
    const out = await bridge("hub_alert_delete", { p_email: user.email, p_id: id });
    if (!out) return new Response(JSON.stringify({ error: "Alerts are unavailable right now." }), { status: 502, headers: JSONH });
    return new Response(JSON.stringify(out), { headers: JSONH });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
});
