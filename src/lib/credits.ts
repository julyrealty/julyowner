"use client";
// Credits for AI document reviews: balance, pricing, and the top-up purchase.
//
// Balance always comes from the server (sum of an append-only ledger). Nothing
// here ever computes a balance locally — a number the browser can influence is
// a number that will eventually be wrong in the customer's favour or ours.
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export type Pack = { key: string; coins: number; price: number; label: string };
export type ScanCosts = Record<string, number>;

export type Pricing = {
  packs: Pack[];
  costs: ScanCosts;
  /** False while credits are recorded but not yet gating anything. */
  enforced: boolean;
};

declare global {
  // Injected by https://secure.helcim.app/helcim-pay/services/start.js
  function appendHelcimPayIframe(checkoutToken: string): void;
}

export function useCredits(enabled = true) {
  const [balance, setBalance] = useState<number | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    try {
      const [{ data: bal }, { data: price }] = await Promise.all([
        sb().rpc("ho_credit_balance"),
        sb().functions.invoke("ho-billing", { body: { action: "packs" } }),
      ]);
      setBalance(typeof bal === "number" ? bal : null);
      const p = price as Pricing | null;
      if (p?.packs) setPricing({ packs: p.packs, costs: p.costs ?? {}, enforced: !!p.enforced });
    } catch {
      // A missing balance shows as "—" rather than a confident zero.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { balance, pricing, loading, refresh };
}

/** Load the HelcimPay script once; resolves when it can render the iframe. */
export function useHelcimScript(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.appendHelcimPayIframe === "function") { setReady(true); return; }
    const existing = document.querySelector("script[data-helcim-pay]");
    if (existing) { existing.addEventListener("load", () => setReady(true)); return; }
    const s = document.createElement("script");
    s.src = "https://secure.helcim.app/helcim-pay/services/start.js";
    s.dataset.helcimPay = "1";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

export type BuyResult =
  | { ok: true; coins: number; balance: number | null }
  | { ok: false; cancelled?: boolean; error?: string };

/**
 * Buy a credit pack. Opens Helcim's hosted iframe — card details go straight
 * to Helcim and never touch this app or its database.
 */
export async function buyCredits(pack: string): Promise<BuyResult> {
  const { data, error } = await sb().functions.invoke("ho-billing", {
    body: { action: "buy_credits", pack },
  });
  if (error || !(data as { checkoutToken?: string })?.checkoutToken) {
    return { ok: false, error: (data as { error?: string })?.error || "Checkout is unavailable right now." };
  }
  const { checkoutToken, checkout_id } = data as { checkoutToken: string; checkout_id: string };

  const result = await new Promise<{ data: unknown; hash: string } | null>((resolve) => {
    const onMsg = (ev: MessageEvent) => {
      const d = ev.data as { eventName?: string; eventStatus?: string; eventMessage?: unknown };
      if (d?.eventName !== `helcim-pay-js-${checkoutToken}`) return;
      if (d.eventStatus === "ABORTED") { window.removeEventListener("message", onMsg); resolve(null); }
      if (d.eventStatus === "SUCCESS") {
        window.removeEventListener("message", onMsg);
        let payload: { data?: { data?: unknown; hash?: string } } = {};
        try { payload = typeof d.eventMessage === "string" ? JSON.parse(d.eventMessage) : (d.eventMessage as typeof payload); } catch { /* keep empty */ }
        resolve({ data: payload?.data?.data ?? payload?.data ?? {}, hash: payload?.data?.hash ?? "" });
      }
    };
    window.addEventListener("message", onMsg);
    appendHelcimPayIframe(checkoutToken);
  });
  if (!result) return { ok: false, cancelled: true };

  const { data: conf, error: confErr } = await sb().functions.invoke("ho-billing", {
    body: { action: "confirm_credits", checkout_id, transaction_data: result.data, hash: result.hash },
  });
  const c = conf as { ok?: boolean; coins?: number; balance?: number; error?: string } | null;
  if (confErr || !c?.ok) {
    return { ok: false, error: c?.error || "We couldn't confirm the payment." };
  }
  return { ok: true, coins: c.coins ?? 0, balance: c.balance ?? null };
}
