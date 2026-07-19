"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePro, type ProductKey } from "@/lib/pro-store";
import { sb } from "@/lib/supabase";
import { Card, Pill } from "@/components/ui";
import { Check, ShieldCheck } from "lucide-react";

const PRODUCT_META: Record<ProductKey, { title: string; blurb: string; noun: string }> = {
  buyer: { title: "JULY Buyer", blurb: "Search HQs, buyer signals, AI document scans.", noun: "buyer clients" },
  owner: { title: "JULY Owner", blurb: "Value & equity hubs, renewal radar, annual reports.", noun: "homeowner clients" },
  seller: { title: "JULY Seller", blurb: "Seller activations, pricing lab, propensity signals.", noun: "seller clients" },
  investor: { title: "JULY Investor", blurb: "Landlord tools, lease renewals, rent ledgers.", noun: "investor clients" },
};

const TIERS: { key: "starter" | "pro" | "team"; name: string; price: number; limit: string; points: string[] }[] = [
  { key: "starter", name: "Starter", price: 29, limit: "25", points: ["Branded client hubs", "10 AI document scans/mo", "Monthly value emails from your name"] },
  { key: "pro", name: "Pro", price: 59, limit: "100", points: ["Live client signals & weekly digest", "Your branding everywhere", "50 AI scans/mo"] },
  { key: "team", name: "Team", price: 119, limit: "500", points: ["3 agent seats", "API access", "Priority support"] },
];

declare global {
  // Injected by https://secure.helcim.app/helcim-pay/services/start.js
  function appendHelcimPayIframe(checkoutToken: string): void;
}

export default function UpgradePage() {
  const { products, demo, loading } = usePro();
  const params = useSearchParams();
  const initial = (params.get("product") as ProductKey) || "buyer";
  const [product, setProduct] = useState<ProductKey>(PRODUCT_META[initial] ? initial : "buyer");
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [done, setDone] = useState<{ product: string; tier: string } | null>(null);
  const [err, setErr] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (document.querySelector("script[data-helcim-pay]")) { setScriptReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://secure.helcim.app/helcim-pay/services/start.js";
    s.dataset.helcimPay = "1";
    s.onload = () => setScriptReady(true);
    document.head.appendChild(s);
  }, []);

  const owned = useMemo(() => products[product] ?? null, [products, product]);

  async function buy(tier: "starter" | "pro" | "team") {
    if (demo) { setErr("Checkout is disabled in the demo — sign in to your real portal to subscribe."); return; }
    setErr(""); setBusyTier(tier);
    try {
      const { data, error } = await sb().functions.invoke("ho-billing", { body: { action: "checkout", product, tier } });
      if (error || !data?.checkoutToken) throw new Error(data?.error || "Checkout is unavailable right now.");
      const { checkoutToken, checkout_id } = data as { checkoutToken: string; checkout_id: string };

      const result = await new Promise<{ data: unknown; hash: string } | null>((resolve) => {
        const onMsg = (ev: MessageEvent) => {
          const d = ev.data as { eventName?: string; eventStatus?: string; eventMessage?: unknown };
          if (d?.eventName !== `helcim-pay-js-${checkoutToken}`) return;
          if (d.eventStatus === "ABORTED") { window.removeEventListener("message", onMsg); resolve(null); }
          if (d.eventStatus === "SUCCESS") {
            window.removeEventListener("message", onMsg);
            let payload: { data?: { data?: unknown; hash?: string } } = {};
            try { payload = typeof d.eventMessage === "string" ? JSON.parse(d.eventMessage) : (d.eventMessage as typeof payload); } catch {}
            resolve({ data: payload?.data?.data ?? payload?.data ?? {}, hash: payload?.data?.hash ?? "" });
          }
        };
        window.addEventListener("message", onMsg);
        appendHelcimPayIframe(checkoutToken);
      });
      if (!result) { setBusyTier(null); return; } // user closed the modal

      const { data: conf, error: confErr } = await sb().functions.invoke("ho-billing", {
        body: { action: "confirm", checkout_id, transaction_data: result.data, hash: result.hash },
      });
      if (confErr || !conf?.ok) throw new Error(conf?.error || "We couldn't confirm the payment — nothing was activated.");
      setDone({ product, tier });
      setTimeout(() => window.location.assign("/pro/opportunities"), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong — you were not charged.");
    } finally {
      setBusyTier(null);
    }
  }

  if (loading) return null;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Add a product</h1>
      <p className="mt-1 max-w-xl text-sm text-gray-500">
        Each product unlocks its client experience, live signals, and reporting. Cancel anytime — your clients keep their hubs.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(PRODUCT_META) as ProductKey[]).map((p) => (
          <button key={p} onClick={() => { setProduct(p); setErr(""); }}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${p === product ? "bg-teal text-white" : "bg-white text-gray-600 ring-1 ring-line hover:bg-gray-50"}`}>
            {PRODUCT_META[p].title}
            {products[p] && <span className="ml-1.5 text-[10px] uppercase opacity-70">({products[p]})</span>}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-gray-500">{PRODUCT_META[product].blurb}</p>

      {done ? (
        <Card className="mt-6 max-w-md p-8 text-center">
          <p className="text-lg font-extrabold text-teal-deep">You&apos;re in ✓</p>
          <p className="mt-1 text-sm text-gray-500">
            {PRODUCT_META[done.product as ProductKey].title} {done.tier} is active — your signals are lighting up now.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {TIERS.map((t) => {
            const isCurrent = owned === t.key || owned === "included";
            return (
              <Card key={t.key} className={`p-6 ${t.key === "pro" ? "ring-2 ring-teal" : ""}`}>
                {t.key === "pro" && <Pill tone="green">Most popular</Pill>}
                <p className="mt-2 font-extrabold uppercase tracking-wide text-navy">{t.name}</p>
                <p className="mt-1 text-3xl font-extrabold">${t.price}<span className="text-sm font-bold text-gray-400">/mo CAD</span></p>
                <p className="mt-1 text-sm text-gray-500">Up to <b>{t.limit}</b> active {PRODUCT_META[product].noun}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.points.map((li) => (
                    <li key={li} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" />{li}</li>
                  ))}
                </ul>
                <button
                  className={`btn btn-md mt-6 w-full ${t.key === "pro" ? "btn-primary" : "btn-ghost"}`}
                  disabled={busyTier !== null || isCurrent || !scriptReady}
                  onClick={() => buy(t.key)}>
                  {isCurrent ? (owned === "included" ? "Included with JULY" : "Your current plan")
                    : busyTier === t.key ? "Opening secure checkout…" : `Start ${t.name}`}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {err && <p className="mt-4 max-w-md rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}

      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-gray-400">
        <ShieldCheck size={14} className="shrink-0" />
        Card details go directly to Helcim&apos;s secure checkout — they never touch our servers. Have a brokerage code instead? Enter it at signup, or message us.
      </p>
    </div>
  );
}
