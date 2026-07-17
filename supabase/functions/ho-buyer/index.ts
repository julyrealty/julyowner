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

const EMPTY = { linked: false, watched: [], searches: [], tours: [] };

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
    };
  } catch {
    return EMPTY;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  if ((body.action as string) !== "snapshot") {
    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
  }

  // Internal test path: shared secret + explicit email.
  const secret = req.headers.get("x-cron-secret");
  if (secret && secret === (await cfg("cron_secret"))) {
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

  const snap = await buyerSnapshot(user.email);
  return new Response(JSON.stringify(snap), { headers: JSONH });
});
