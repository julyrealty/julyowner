"use client";
// Published Canadian rates, refreshed daily from the Bank of Canada by the
// ho-rates function. Public data, readable without a hub — so this is a plain
// hook rather than part of the hub store, and it reads the same in demo mode.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export type MarketRate = {
  series_id: string;
  label: string;
  kind: "prime" | "posted" | "policy";
  term_years: number | null;
  value: number;
  observed_on: string;
};

export type MarketRates = {
  prime: MarketRate | null;
  posted: MarketRate[];
  observedOn: string | null;
};

const EMPTY: MarketRates = { prime: null, posted: [], observedOn: null };

/** null while loading; a populated (or empty) set once settled. */
export function useMarketRates(): MarketRates | null {
  const [rates, setRates] = useState<MarketRates | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let rows: MarketRate[] = [];
      try {
        const { data } = await sb()
          .from("ho_market_rates")
          .select("series_id,label,kind,term_years,value,observed_on");
        // PostgREST can hand numeric back as a string — coerce before any maths.
        rows = ((data as MarketRate[]) ?? []).map((r) => ({ ...r, value: Number(r.value) }));
      } catch {
        // No rates is a display state, not an error worth surfacing to a buyer.
      }
      if (!alive) return;
      if (rows.length === 0) return setRates(EMPTY);
      setRates({
        prime: rows.find((r) => r.kind === "prime") ?? null,
        posted: rows.filter((r) => r.kind === "posted").sort((a, b) => (a.term_years ?? 0) - (b.term_years ?? 0)),
        observedOn: rows[0].observed_on,
      });
    })();
    return () => { alive = false; };
  }, []);

  return rates;
}

/** "15 July 2026" — the Bank of Canada's observation date, not today's date. */
export function rateDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
