// ho-billing — Helcim checkout for paid product tiers and AI review credits.
//
// Two different Helcim shapes, deliberately:
//   Subscriptions ('checkout' + 'confirm') capture the card via a $0 verify
//   session, then create a recurring subscription on the tier's payment plan.
//   Credit packs ('buy_credits' + 'confirm_credits') are a one-time purchase,
//   so they initialize with paymentType 'purchase' and a real amount.
//
// Pack sizes and prices live HERE, never in the request body — a client that
// can name its own price can buy 400 coins for a dollar.
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

const TIER_PRICE: Record<string, number> = { starter: 29, pro: 59, team: 119 };
const PRODUCTS = ["buyer", "owner", "seller", "investor"];

/** Credit packs. Price is CAD; coins are what lands in the ledger. */
const PACKS: Record<string, { coins: number; price: number; label: string }> = {
  small: { coins: 50, price: 19, label: "50 credits" },
  medium: { coins: 150, price: 39, label: "150 credits" },
  large: { coins: 400, price: 89, label: "400 credits" },
};

async function helcim(path: string, init?: RequestInit): Promise<Response> {
  const token = await cfg("helcim_api_token");
  return fetch(`https://api.helcim.com/v2/${path}`, {
    ...init,
    headers: { "api-token": token, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

/** Find or create the Helcim payment plan for a tier (idempotent by name). */
async function ensurePlan(tier: string): Promise<number | null> {
  const name = `JULY Platform ${tier[0].toUpperCase()}${tier.slice(1)}`;
  const list = await helcim(`payment-plans?limit=100`);
  if (list.ok) {
    const body = await list.json().catch(() => null);
    const found = (body?.data ?? []).find((p: { name?: string }) => p.name === name);
    if (found?.id) return found.id;
  }
  const create = await helcim("payment-plans", {
    method: "POST",
    body: JSON.stringify({
      paymentPlans: [{
        name,
        description: `JULY platform product subscription — ${tier} tier`,
        type: "subscription",
        currency: "CAD",
        recurringAmount: TIER_PRICE[tier],
        billingPeriod: "monthly",
        billingPeriodIncrements: 1,
      }],
    }),
  });
  if (!create.ok) {
    console.error("plan create failed", create.status, await create.text());
    return null;
  }
  const made = await create.json().catch(() => null);
  return made?.data?.[0]?.id ?? made?.[0]?.id ?? null;
}

/** Find or create a Helcim customer for this user (by email). */
async function ensureCustomer(email: string, name: string): Promise<string | null> {
  const q = await helcim(`customers?search=${encodeURIComponent(email)}&limit=10`);
  if (q.ok) {
    const body = await q.json().catch(() => null);
    const hit = (body?.data ?? []).find((c: { billingAddress?: { email?: string } }) => c.billingAddress?.email === email);
    if (hit?.customerCode) return hit.customerCode;
  }
  const create = await helcim("customers", {
    method: "POST",
    body: JSON.stringify({ contactName: name || email, billingAddress: { name: name || email, email } }),
  });
  if (!create.ok) {
    console.error("customer create failed", create.status, await create.text());
    return null;
  }
  const made = await create.json().catch(() => null);
  return made?.customerCode ?? made?.data?.customerCode ?? null;
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");

  // Internal smoke test: proves the Helcim path end-to-end without a user.
  const secret = req.headers.get("x-cron-secret");
  if (action === "selftest" && secret && secret === (await cfg("cron_secret"))) {
    const init = await helcim("helcim-pay/initialize", {
      method: "POST",
      body: JSON.stringify({ paymentType: "verify", amount: 0, currency: "CAD" }),
    });
    const ok = init.ok;
    const data = ok ? await init.json().catch(() => null) : null;
    return new Response(JSON.stringify({ ok, hasToken: !!data?.checkoutToken }), { headers: JSONH });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL0, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user?.email) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSONH });

  /* ---------------- pricing: packs + per-scan costs ----------------
     Costs live in ho_config, which is service-role only because it also holds
     API keys — so the browser learns them here rather than hardcoding a copy
     that would silently drift the moment a price changes. */
  if (action === "packs") {
    const keys = ["credits_enforced", "credits_cost_title", "credits_cost_pds",
      "credits_cost_contract", "credits_cost_inspection", "credits_cost_strata"];
    const { data: rows } = await admin.from("ho_config").select("key,value").in("key", keys);
    const conf: Record<string, string> = {};
    for (const r of rows ?? []) conf[r.key] = r.value;
    const cost = (k: string) => Math.max(0, parseInt(conf[`credits_cost_${k}`] ?? "0", 10) || 0);
    return new Response(JSON.stringify({
      packs: Object.entries(PACKS).map(([key, p]) => ({ key, ...p })),
      enforced: (conf["credits_enforced"] ?? "").toLowerCase() === "true",
      costs: {
        title: cost("title"), pds: cost("pds"), contract: cost("contract"),
        inspection: cost("inspection"), strata: cost("strata"),
      },
    }), { headers: JSONH });
  }

  /* ---------------- credit packs: start a one-time purchase ---------------- */
  if (action === "buy_credits") {
    const packKey = String(body.pack ?? "");
    const pack = PACKS[packKey];
    if (!pack) return new Response(JSON.stringify({ error: "unknown pack" }), { status: 400, headers: JSONH });

    const { data: prof } = await admin.from("ho_profiles").select("first_name,last_name").eq("id", user.id).maybeSingle();
    const displayName = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim();
    const customerCode = await ensureCustomer(user.email, displayName);
    if (!customerCode) {
      return new Response(JSON.stringify({ error: "Could not set up your billing profile. Try again shortly." }), { status: 502, headers: JSONH });
    }

    // A real charge, not a card capture — credits are bought outright.
    const init = await helcim("helcim-pay/initialize", {
      method: "POST",
      body: JSON.stringify({ paymentType: "purchase", amount: pack.price, currency: "CAD", customerCode }),
    });
    if (!init.ok) {
      console.error("credit initialize failed", init.status, await init.text());
      return new Response(JSON.stringify({ error: "Checkout is unavailable right now." }), { status: 502, headers: JSONH });
    }
    const tokens = await init.json().catch(() => null);
    if (!tokens?.checkoutToken || !tokens?.secretToken) {
      return new Response(JSON.stringify({ error: "Checkout is unavailable right now." }), { status: 502, headers: JSONH });
    }

    const { data: row, error } = await admin.from("ho_checkouts")
      .insert({
        user_id: user.id, product: "credits", tier: packKey,
        checkout_token: tokens.checkoutToken, secret_token: tokens.secretToken, customer_code: customerCode,
      })
      .select("id").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSONH });

    return new Response(JSON.stringify({
      checkout_id: row.id, checkoutToken: tokens.checkoutToken,
      coins: pack.coins, price: pack.price,
    }), { headers: JSONH });
  }

  /* ---------------- credit packs: confirm and credit the ledger ---------------- */
  if (action === "confirm_credits") {
    const checkoutId = String(body.checkout_id ?? "");
    const rawData = body.transaction_data;
    const hash = String(body.hash ?? "");
    // status='pending' is what makes this single-use: a replayed confirm finds nothing.
    const { data: co } = await admin.from("ho_checkouts")
      .select("*").eq("id", checkoutId).eq("user_id", user.id)
      .eq("product", "credits").eq("status", "pending").maybeSingle();
    if (!co) return new Response(JSON.stringify({ error: "checkout not found" }), { status: 404, headers: JSONH });

    const pack = PACKS[co.tier];
    if (!pack) return new Response(JSON.stringify({ error: "unknown pack" }), { status: 400, headers: JSONH });

    const expected = await sha256Hex(JSON.stringify(rawData) + co.secret_token);
    if (!hash || expected !== hash) {
      await admin.from("ho_checkouts").update({ status: "failed" }).eq("id", co.id);
      return new Response(JSON.stringify({ error: "payment validation failed" }), { status: 400, headers: JSONH });
    }

    // Close the checkout FIRST. If the credit insert then fails we can replay it
    // from the row; if we credited first and this failed, a retry double-credits.
    const { error: closeErr } = await admin.from("ho_checkouts")
      .update({ status: "confirmed" }).eq("id", co.id).eq("status", "pending");
    if (closeErr) return new Response(JSON.stringify({ error: "could not close checkout" }), { status: 500, headers: JSONH });

    const { error: credErr } = await admin.from("ho_credit_entries").insert({
      user_id: user.id, delta: pack.coins, reason: "purchase",
      checkout_id: co.id, note: `${pack.label} purchased`,
    });
    if (credErr) {
      console.error(`[ho-billing] PAID BUT NOT CREDITED checkout=${co.id} user=${user.id}: ${credErr.message}`);
      return new Response(JSON.stringify({ error: "Payment went through but the credits didn't land. We've logged it — contact us and we'll add them." }), { status: 500, headers: JSONH });
    }

    const { data: bal } = await admin.rpc("ho_credit_balance_for", { p_user: user.id });
    return new Response(JSON.stringify({ ok: true, coins: pack.coins, balance: bal ?? null }), { headers: JSONH });
  }

  if (action === "checkout") {
    const product = String(body.product ?? "");
    const tier = String(body.tier ?? "");
    if (!PRODUCTS.includes(product) || !(tier in TIER_PRICE)) {
      return new Response(JSON.stringify({ error: "invalid product or tier" }), { status: 400, headers: JSONH });
    }
    const { data: prof } = await admin.from("ho_profiles").select("first_name,last_name").eq("id", user.id).maybeSingle();
    const displayName = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim();
    const customerCode = await ensureCustomer(user.email, displayName);
    if (!customerCode) return new Response(JSON.stringify({ error: "Could not set up your billing profile. Try again shortly." }), { status: 502, headers: JSONH });

    const init = await helcim("helcim-pay/initialize", {
      method: "POST",
      body: JSON.stringify({ paymentType: "verify", amount: 0, currency: "CAD", customerCode }),
    });
    if (!init.ok) {
      console.error("initialize failed", init.status, await init.text());
      return new Response(JSON.stringify({ error: "Checkout is unavailable right now." }), { status: 502, headers: JSONH });
    }
    const tokens = await init.json().catch(() => null);
    if (!tokens?.checkoutToken || !tokens?.secretToken) {
      return new Response(JSON.stringify({ error: "Checkout is unavailable right now." }), { status: 502, headers: JSONH });
    }
    const { data: row, error } = await admin.from("ho_checkouts")
      .insert({ user_id: user.id, product, tier, checkout_token: tokens.checkoutToken, secret_token: tokens.secretToken, customer_code: customerCode })
      .select("id").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSONH });
    return new Response(JSON.stringify({ checkout_id: row.id, checkoutToken: tokens.checkoutToken, price: TIER_PRICE[tier] }), { headers: JSONH });
  }

  if (action === "confirm") {
    const checkoutId = String(body.checkout_id ?? "");
    const rawData = body.transaction_data;   // HelcimPay success payload 'data.data'
    const hash = String(body.hash ?? "");    // HelcimPay success payload 'data.hash'
    const { data: co } = await admin.from("ho_checkouts")
      .select("*").eq("id", checkoutId).eq("user_id", user.id).eq("status", "pending").maybeSingle();
    if (!co) return new Response(JSON.stringify({ error: "checkout not found" }), { status: 404, headers: JSONH });

    // Validate the iframe result: sha256(jsonData + secretToken) must equal the hash.
    const expected = await sha256Hex(JSON.stringify(rawData) + co.secret_token);
    if (!hash || expected !== hash) {
      await admin.from("ho_checkouts").update({ status: "failed" }).eq("id", co.id);
      return new Response(JSON.stringify({ error: "payment validation failed" }), { status: 400, headers: JSONH });
    }

    // Card captured — start the subscription on the tier's plan.
    const planId = await ensurePlan(co.tier);
    let subscribed = false;
    if (planId) {
      const today = new Date().toISOString().slice(0, 10);
      const sub = await helcim("subscriptions", {
        method: "POST",
        body: JSON.stringify({ subscriptions: [{ customerCode: co.customer_code, paymentPlanId: planId, dateActivated: today, recurringAmount: TIER_PRICE[co.tier] }] }),
      });
      subscribed = sub.ok;
      if (!sub.ok) console.error("subscription create failed", sub.status, await sub.text());
    }

    await admin.from("ho_entitlements")
      .upsert({ user_id: user.id, product: co.product, tier: co.tier, status: "active", source: "purchase", code: null }, { onConflict: "user_id,product" });
    await admin.from("ho_checkouts").update({ status: "confirmed" }).eq("id", co.id);
    await admin.from("ho_email_log").insert({ kind: "purchase", ok: true, recipients: 1 });
    return new Response(JSON.stringify({ ok: true, subscribed, product: co.product, tier: co.tier }), { headers: JSONH });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
});
