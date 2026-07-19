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

const esc = (s: unknown) => String(s ?? "").replace(/[<>&\"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-CA");

/** Instant JULY Value estimate for a free-text address; null when not covered.
 *  Retries with "number + first street word" when the full line misses. */
async function jvQuickEstimate(fullAddress: string): Promise<{ estimate: number; low: number; high: number; confidence: string; attribution?: string } | null> {
  try {
    const base = await cfg("julyvalue_api_url");
    const key = await cfg("julyvalue_api_key");
    if (!base || !key || !fullAddress) return null;
    const H = { "X-API-Key": key, "content-type": "application/json" };
    const street = fullAddress.split(",")[0].trim();
    const unitMatch = street.match(/^([0-9a-z]+)\s*-\s*/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : "";
    const full = street.replace(/^[0-9a-z]+\s*-\s*/i, "").trim();
    const cityLc = (fullAddress.split(",")[1] ?? "").trim().toLowerCase();
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
    if (!results.length) return null;
    const scored = results.map((r) => {
      const addr = String(r.address ?? "").toLowerCase();
      const m = addr.match(/^([0-9a-z]+)-/);
      const rUnit = m ? m[1] : "";
      let score = 0;
      if (cityLc && addr.includes(cityLc)) score += 2;
      if (unit && rUnit === unit) score += 4;
      if (!unit && !rUnit) score += 3;
      return { r, rUnit, addr, score };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (unit && best.rUnit !== unit) return null;
    if (!unit && best.rUnit) return null;
    if (cityLc && !best.addr.includes(cityLc)) return null;
    const er = await fetch(`${base}/estimate`, { method: "POST", headers: H, body: JSON.stringify({ propertyId: best.r.propertyId }) });
    if (!er.ok) return null;
    const est = await er.json().catch(() => null);
    return est?.estimate ? est : null;
  } catch {
    return null;
  }
}

function layout(title: string, body: string, brand = "#0e7c7b", footer = "") {
  return `<!doctype html><body style="margin:0;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;color:#10201f">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:${brand};border-radius:14px 14px 0 0;padding:22px 26px;color:#ffffff">
      <div style="font-size:18px;font-weight:800">JULY<span style="opacity:.85">Owner</span></div>
      <div style="font-size:22px;font-weight:800;margin-top:10px">${title}</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e6e8e6;border-top:0;border-radius:0 0 14px 14px;padding:26px">${body}</div>
    <p style="font-size:11px;color:#9aa0a0;text-align:center;margin-top:14px">${footer || "Sent by JULYOwner · JULY Realty · Vancouver, BC"}</p>
  </div></body>`;
}

async function send(to: { email: string; name?: string }[], subject: string, html: string, replyTo?: string) {
  const payload: Record<string, unknown> = {
    sender: { email: await cfg("email_from"), name: await cfg("email_from_name") }, to, subject, htmlContent: html,
  };
  if (replyTo) payload.replyTo = { email: replyTo };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": await cfg("brevo_api_key"), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("brevo error", res.status, await res.text());
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action as string;
  const site = await cfg("site_url");
  const ops = (await cfg("ops_email")) || "info@july.ca";

  if (action === "monthly" || action === "test" || action === "dup_alert" || action === "valuation_lead" || action === "weekly_pro") {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== (await cfg("cron_secret"))) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: JSONH });
    }

    if (action === "test") {
      const ok = await send([{ email: String(body.to) }], "Your JULYOwner email engine is live",
        layout("Everything is wired up",
          `<p style=\"font-size:15px;line-height:1.6\">This is a live test from your JULYOwner platform, sent through Brevo.</p>
           <p><a href=\"${site}\" style=\"display:inline-block;background:#0e7c7b;color:#ffffff;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none\">Open JULYOwner</a></p>`));
      return new Response(JSON.stringify({ ok }), { headers: JSONH });
    }

    if (action === "weekly_pro") {
      const sinceIso = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: pros } = await admin.from("ho_profiles").select("id,email,first_name,brand_color").eq("role", "professional");
      let sentN = 0;
      for (const p of pros ?? []) {
        if (!p.email) continue;
        const { data: hubs } = await admin.from("ho_hubs")
          .select("id,full_address,address1,selling_started_at,buying_started_at").eq("pro_id", p.id);
        const hubIds = (hubs ?? []).map((h) => h.id as string);
        const { data: leads } = await admin.from("ho_leads")
          .select("kind,name,address,created_at").eq("pro_id", p.id).gte("created_at", sinceIso);
        let actCount = 0;
        const renewals: { addr: string; lender: string | null; loan_type: string | null; renew: Date }[] = [];
        if (hubIds.length) {
          const r2 = await admin.from("ho_activities").select("id", { count: "exact", head: true })
            .in("hub_id", hubIds).gte("created_at", sinceIso);
          actCount = r2.count ?? 0;
          const { data: mtgs } = await admin.from("ho_mortgages")
            .select("hub_id,lender,loan_type,start_date,term_months").in("hub_id", hubIds);
          const now = Date.now();
          for (const m of mtgs ?? []) {
            const sd = new Date(String(m.start_date));
            if (isNaN(sd.getTime())) continue;
            const renew = new Date(sd.getFullYear(), sd.getMonth() + Number(m.term_months ?? 60), sd.getDate(), 12);
            if (renew.getTime() > now && renew.getTime() < now + 90 * 86400000) {
              const h = (hubs ?? []).find((x) => x.id === m.hub_id);
              renewals.push({ addr: String(h?.full_address ?? h?.address1 ?? "a sponsored home"), lender: (m.lender as string | null), loan_type: (m.loan_type as string | null), renew });
            }
          }
          renewals.sort((a, b) => a.renew.getTime() - b.renew.getTime());
        }
        const newSelling = (hubs ?? []).filter((h) => h.selling_started_at && String(h.selling_started_at) >= sinceIso);
        const newBuying = (hubs ?? []).filter((h) => h.buying_started_at && String(h.buying_started_at) >= sinceIso);
        const signals = (leads?.length ?? 0) + newSelling.length + newBuying.length + renewals.length;
        if (signals === 0 && actCount === 0) continue;
        const brand = (p.brand_color as string) || "#0e7c7b";
        const monthOf = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
        const li = (s: string) => `<li style="margin:4px 0">${s}</li>`;
        const section = (title: string, items: string[]) => items.length
          ? `<p style="font-size:12px;font-weight:800;letter-spacing:.06em;color:#5a6462;margin:16px 0 4px">${title}</p><ul style="font-size:14px;line-height:1.5;margin:0;padding-left:18px">${items.join("")}</ul>` : "";
        const kindLabel = (k: unknown) => k === "valuation" ? "valuation request" : k === "sell" ? "sell inquiry" : k === "loan" ? "financing inquiry" : "service request";
        const html = layout(`Your week — ${signals || actCount} signal${(signals || actCount) === 1 ? "" : "s"} worth a look`,
          `<p style="font-size:15px;line-height:1.6">Here’s what moved in your book of homeowners this week.</p>
           ${section("NEW LEADS", (leads ?? []).map((l) => li(`<b>${esc(l.name)}</b> — ${kindLabel(l.kind)}${l.address ? ` · ${esc(l.address)}` : ""}`)))}
           ${section("STARTED SELLING", newSelling.map((h) => li(`<b>${esc(h.full_address ?? h.address1)}</b> — activated their selling plan`)))}
           ${section("STARTED BUYING", newBuying.map((h) => li(`<b>${esc(h.full_address ?? h.address1)}</b> — opened Buying HQ`)))}
           ${section("RENEWALS INSIDE 90 DAYS", renewals.map((m) => li(`<b>${esc(m.addr)}</b> — ${esc(m.loan_type ?? "mortgage")} with ${esc(m.lender ?? "their lender")} renews ${monthOf(m.renew)}`)))}
           ${actCount ? `<p style="font-size:13px;color:#5a6462;margin-top:16px">Plus ${actCount} visit${actCount === 1 ? "" : "s"} and actions across your hubs.</p>` : ""}
           <p style="margin-top:18px"><a href="${site}/pro" style="display:inline-block;background:${brand};color:#ffffff;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none">Open my dashboard</a></p>`,
          brand,
          "Your weekly JULYOwner digest — sent Mondays when there’s something worth knowing.");
        const ok = await send([{ email: p.email as string, name: (p.first_name as string) ?? undefined }],
          `${signals || actCount} homeowner signal${(signals || actCount) === 1 ? "" : "s"} this week`, html);
        if (ok) sentN++;
        await admin.from("ho_email_log").insert({ kind: "weekly", ok, recipients: 1 });
      }
      return new Response(JSON.stringify({ sent: sentN }), { headers: JSONH });
    }

    if (action === "valuation_lead") {
      const { data: lead } = await admin.from("ho_leads").select("*").eq("id", String(body.lead_id)).maybeSingle();
      if (!lead) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
      const jv = await jvQuickEstimate(String(lead.address ?? ""));
      const jvBlock = jv
        ? `<div style=\"background:#eef7f6;border-radius:12px;padding:16px;margin-top:16px\">
             <p style=\"font-size:12px;font-weight:800;letter-spacing:.06em;color:#0e7c7b;margin:0\">JULY VALUE INSTANT ESTIMATE</p>
             <p style=\"font-size:26px;font-weight:800;margin:6px 0 2px\">${money(jv.estimate)}</p>
             <p style=\"font-size:13px;color:#5a6462;margin:0\">Range ${money(jv.low)} – ${money(jv.high)} · ${esc(jv.confidence)} confidence</p>
             <p style=\"font-size:11px;color:#9aa0a0;margin:8px 0 0\">${esc(jv.attribution ?? "Estimate by JULY Value (julyvalue.com). Not an appraisal.")}</p>
           </div>`
        : `<p style=\"font-size:12px;color:#9aa0a0;margin-top:14px\">No instant JULY Value match for this address yet — prepare the evaluation manually.</p>`;
      const ok = await send([{ email: ops }],
        `🎯 Valuation request: ${lead.address ?? "address on file"}`,
        layout("New seller lead — home valuation request",
          `<p style=\"font-size:15px;line-height:1.6\">Someone just asked what their home is worth on the public JULYOwner page. Valuation requests are the strongest seller signal there is — respond within the hour if you can.</p>
           <table style=\"font-size:14px;line-height:1.9\">
             <tr><td style=\"color:#5a6462;padding-right:12px\">Name</td><td><b>${esc(lead.name)}</b></td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">Email</td><td>${esc(lead.email)}</td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">Phone</td><td>${esc(lead.phone ?? "—")}</td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">Address</td><td><b>${esc(lead.address)}</b></td></tr>
             ${lead.message ? `<tr><td style=\"color:#5a6462;padding-right:12px;vertical-align:top\">Notes</td><td>${esc(String(lead.message).slice(0, 400))}</td></tr>` : ""}
           </table>
           ${jvBlock}
           <p style=\"font-size:13px;color:#5a6462;margin-top:14px\">Reply to this email to reach them directly. Prepare the evaluation, then invite them to claim their hub so the relationship compounds.</p>`),
        (lead.email as string) ?? undefined);
      await admin.from("ho_email_log").insert({ kind: "valuation", ok, recipients: 1 });
      return new Response(JSON.stringify({ ok, jv: !!jv }), { headers: JSONH });
    }

    if (action === "dup_alert") {
      const { data: hub } = await admin.from("ho_hubs").select("id,full_address").eq("id", String(body.hub_id)).maybeSingle();
      const { data: orig } = await admin.from("ho_hubs").select("id,full_address,created_at").eq("id", String(body.dup_of)).maybeSingle();
      const { data: origMembers } = await admin.from("ho_hub_members").select("email").eq("hub_id", String(body.dup_of));
      const ok = await send([{ email: ops }],
        `Ownership review needed: duplicate claim at ${hub?.full_address ?? "unknown address"}`,
        layout("Duplicate address claim",
          `<p style=\"font-size:15px;line-height:1.6\">A second hub was claimed for an address that is already registered. The new hub is <b>flagged</b>.</p>
           <table style=\"font-size:14px;line-height:1.8\">
             <tr><td style=\"color:#5a6462;padding-right:12px\">Address</td><td><b>${esc(hub?.full_address)}</b></td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">New claimer</td><td>${esc(body.claimer)}</td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">Existing member(s)</td><td>${esc((origMembers ?? []).map((m) => m.email).join(", "))}</td></tr>
             <tr><td style=\"color:#5a6462;padding-right:12px\">Existing hub since</td><td>${esc(orig?.created_at?.slice(0, 10))}</td></tr>
           </table>`));
      return new Response(JSON.stringify({ ok }), { headers: JSONH });
    }

    // monthly value email batch — refreshes stale JULY Value estimates first
    const { data: hubs } = await admin.from("ho_hubs")
      .select("id,address1,unit,city,home_value,value_updated,purchase_price,pro_id")
      .eq("status", "active").limit(500);
    let sent = 0;
    let refreshed = 0;
    for (const h of hubs ?? []) {
      let value: number | null = h.home_value;
      const stale = !value || !h.value_updated || Date.now() - new Date(h.value_updated).getTime() > 25 * 86400000;
      if (stale && h.address1) {
        const jv = await jvQuickEstimate(`${h.unit ? `${h.unit}-` : ""}${h.address1}, ${h.city ?? ""}`);
        if (jv) {
          value = Math.round(jv.estimate);
          refreshed++;
          await admin.from("ho_hubs").update({
            home_value: value,
            value_low: Math.round(jv.low),
            value_high: Math.round(jv.high),
            value_updated: new Date().toISOString(),
            value_confidence: ["low", "medium", "high"].includes(jv.confidence) ? jv.confidence : null,
          }).eq("id", h.id);
        }
      }
      if (!value) continue;
      const { data: members } = await admin.from("ho_hub_members")
        .select("email,first_name").eq("hub_id", h.id).eq("status", "joined");
      if (!members?.length) continue;
      let proLine = "";
      let brand = "#0e7c7b";
      if (h.pro_id) {
        const { data: pro } = await admin.from("ho_profiles")
          .select("first_name,last_name,phone,email,brand_color").eq("id", h.pro_id).maybeSingle();
        if (pro) {
          brand = pro.brand_color || brand;
          proLine = `<p style=\"font-size:13px;color:#5a6462;border-top:1px solid #e6e8e6;padding-top:14px;margin-top:18px\">Questions about your home or the market? <b>${esc(pro.first_name)} ${esc(pro.last_name)}</b> · ${esc(pro.phone ?? "")} · ${esc(pro.email)}</p>`;
        }
      }
      const gain = h.purchase_price ? value - h.purchase_price : null;
      // A drop is not a gain: never paint a loss green with an up-arrow.
      const gainLine = gain == null ? ""
        : gain >= 0
          ? `<p style=\"font-size:13px;color:#1c8a51;font-weight:700\">▲ ${money(gain)} since purchase</p>`
          : `<p style=\"font-size:13px;color:#b5432f;font-weight:700\">▼ ${money(Math.abs(gain))} since purchase</p>`;
      const html = layout(`${esc(h.address1)} — this month's value`,
        `<p style=\"font-size:15px\">Your home's estimated value is now</p>
         <p style=\"font-size:34px;font-weight:800;color:${brand};margin:6px 0\">${money(value)}</p>
         ${gainLine}
         <p style=\"margin-top:18px\"><a href=\"${site}/hub\" style=\"display:inline-block;background:${brand};color:#ffffff;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none\">Check in on my home</a></p>${proLine}`,
        brand,
        "Estimates for information only — not an appraisal. Manage notifications inside your hub.");
      const ok = await send(members.map((m) => ({ email: m.email, name: m.first_name ?? undefined })), `Your home value update — ${h.address1}`, html);
      if (ok) sent++;
      await admin.from("ho_email_log").insert({ kind: "monthly", hub_id: h.id, recipients: members.length, ok });
    }
    return new Response(JSON.stringify({ sent, refreshed }), { headers: JSONH });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL0, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSONH });

  if (action === "invite") {
    const { data: inv } = await admin.from("ho_invites").select("*").eq("id", String(body.invite_id)).maybeSingle();
    if (!inv || inv.pro_id !== user.id) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
    const { data: pro } = await admin.from("ho_profiles").select("*").eq("id", user.id).maybeSingle();
    const brand = pro?.brand_color || "#0e7c7b";
    const buying = inv.journey === "buying";
    const link = `${site}/claim?invite=${inv.token}${buying ? "&persona=buyer" : ""}`;
    const pitch = buying
      ? `invited you to your own home-search HQ — every home you're watching in one place, what you can really afford, tours planned together, and AI that reads the boring documents before you offer. Free, no app required, two minutes to set up.`
      : `invited you to JULYOwner — a private hub to track your home's value and equity, stay on top of maintenance, and keep every document in one place. Free, no app required, two minutes to set up.`;
    const html = layout(`${esc(pro?.first_name ?? "Your advisor")} set up ${buying ? "a home-search HQ" : "a private hub"} for you`,
      `<p style=\"font-size:15px;line-height:1.6\"><b>${esc(pro?.first_name)} ${esc(pro?.last_name)}</b>${pro?.company ? ` at ${esc(pro.company)}` : ""} ${pitch}</p>
       <p style=\"margin-top:18px\"><a href=\"${link}\" style=\"display:inline-block;background:${brand};color:#ffffff;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none\">${buying ? "Start my search HQ" : "Claim your home"}</a></p>
       <p style=\"font-size:12px;color:#9aa0a0\">This link is personal to ${esc(inv.email)}.</p>`, brand);
    const ok = await send([{ email: inv.email }], `${pro?.first_name ?? "Your advisor"} invited you to ${buying ? "your home-search HQ" : "your home's private hub"}`, html);
    await admin.from("ho_email_log").insert({ kind: "invite", ok, recipients: 1 });
    return new Response(JSON.stringify({ ok }), { headers: JSONH });
  }

  if (action === "lead") {
    const hubId = String(body.hub_id);
    const { data: hub } = await admin.from("ho_hubs").select("id,address1,pro_id").eq("id", hubId).maybeSingle();
    const { data: mem } = await admin.from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).maybeSingle();
    if (!hub || !mem) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
    if (!hub.pro_id) return new Response(JSON.stringify({ ok: false, reason: "hub has no professional" }), { headers: JSONH });
    const { data: pro } = await admin.from("ho_profiles").select("email,first_name").eq("id", hub.pro_id).maybeSingle();
    if (!pro?.email) return new Response(JSON.stringify({ ok: false, reason: "pro has no email" }), { headers: JSONH });
    const kind = String(body.kind ?? "general");
    const kindLabel = kind === "sell" ? "Sell-my-home inquiry" : kind === "loan" ? "Financing inquiry" : "Service request";
    const meta = user.user_metadata as Record<string, string> | null;
    const html = layout(`New lead — ${esc(hub.address1)}`,
      `<p style=\"font-size:15px;line-height:1.6\"><b>${esc(meta?.first_name ?? "")} ${esc(meta?.last_name ?? "")}</b> (${esc(user.email)}) just reached out from their hub at <b>${esc(hub.address1)}</b>.</p>
       <p style=\"font-size:14px;font-weight:800;color:#b5432f\">${kindLabel}</p>
       ${body.message ? `<p style=\"background:#f6f4ef;border-radius:10px;padding:14px;font-size:14px\">${esc(String(body.message).slice(0, 500))}</p>` : ""}
       <p style=\"font-size:13px;color:#5a6462\">Reach out while it's warm — reply directly to this email or call them.</p>`);
    const ok = await send([{ email: pro.email, name: pro.first_name ?? undefined }], `New lead: ${kindLabel} at ${hub.address1}`, html, user.email ?? undefined);
    await admin.from("ho_email_log").insert({ kind: "lead", hub_id: hub.id, ok, recipients: 1 });
    return new Response(JSON.stringify({ ok }), { headers: JSONH });
  }

  if (action === "ownership_proof") {
    const hubId = String(body.hub_id);
    const { data: hub } = await admin.from("ho_hubs").select("id,full_address,verification_status,dup_of").eq("id", hubId).maybeSingle();
    const { data: mem } = await admin.from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).maybeSingle();
    if (!hub || !mem) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
    const meta = user.user_metadata as Record<string, string> | null;
    const html = layout(`Ownership proof submitted — ${esc(hub.full_address)}`,
      `<p style=\"font-size:15px;line-height:1.6\"><b>${esc(meta?.first_name ?? "")} ${esc(meta?.last_name ?? "")}</b> (${esc(user.email)}) says they are the owner of <b>${esc(hub.full_address)}</b> and requests verification.</p>
       ${body.message ? `<p style=\"background:#f6f4ef;border-radius:10px;padding:14px;font-size:14px\">${esc(String(body.message).slice(0, 800))}</p>` : ""}
       <p style=\"font-size:13px;color:#5a6462\">Reply to this email (goes straight to them) and ask for a property tax notice or title. Once confirmed, set verification_status to 'verified'.</p>`);
    const ok = await send([{ email: ops }], `Ownership verification request: ${hub.full_address}`, html, user.email ?? undefined);
    await admin.from("ho_activities").insert({ hub_id: hub.id, member_email: user.email, action: "Submitted ownership proof", detail: String(body.message ?? "").slice(0, 200) });
    await admin.from("ho_email_log").insert({ kind: "ownership", hub_id: hub.id, ok, recipients: 1 });
    return new Response(JSON.stringify({ ok }), { headers: JSONH });
  }

  if (action === "selling_started" || action === "buying_started") {
    const hubId = String(body.hub_id);
    const { data: hub } = await admin.from("ho_hubs").select("id,full_address,pro_id").eq("id", hubId).maybeSingle();
    const { data: mem } = await admin.from("ho_hub_members").select("id").eq("hub_id", hubId).eq("user_id", user.id).maybeSingle();
    if (!hub || !mem) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: JSONH });
    const to = hub.pro_id
      ? (await admin.from("ho_profiles").select("email,first_name").eq("id", hub.pro_id).maybeSingle()).data
      : null;
    const meta = user.user_metadata as Record<string, string> | null;
    const who = `<b>${esc(meta?.first_name ?? "")} ${esc(meta?.last_name ?? "")}</b> (${esc(user.email)})`;
    const selling = action === "selling_started";
    const html = selling
      ? layout(`🔥 ${esc(hub.full_address)} started a selling plan`,
          `<p style=\"font-size:15px;line-height:1.6\">${who} just activated seller mode for <b>${esc(hub.full_address)}</b>. They are seeing the pricing lab and net-proceeds numbers right now.</p>
           <p style=\"font-size:13px;color:#5a6462\">This is the moment to reach out and offer a proper market evaluation.</p>`)
      : layout(`🏡 ${esc(hub.full_address)} started a buying plan`,
          `<p style=\"font-size:15px;line-height:1.6\">${who} just opened Buying HQ for <b>${esc(hub.full_address)}</b> — they are planning their next purchase with their equity and purchasing power in front of them.</p>
           <p style=\"font-size:13px;color:#5a6462\">Great moment to talk pre-approval, search strategy, and what their equity unlocks.</p>`);
    const ok = await send([{ email: to?.email ?? ops, name: to?.first_name ?? undefined }],
      selling ? `Seller signal: ${hub.full_address}` : `Buyer signal: ${hub.full_address}`, html, user.email ?? undefined);
    await admin.from("ho_email_log").insert({ kind: selling ? "selling" : "buying", hub_id: hub.id, ok, recipients: 1 });
    return new Response(JSON.stringify({ ok }), { headers: JSONH });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: JSONH });
});
