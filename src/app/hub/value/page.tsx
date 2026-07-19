"use client";
// Buyer-side valuation: look up what any home is worth before you offer.
// White-labelled JULY Value — the buyer never leaves the hub or signs in again.
//
// Address entry is autocomplete-first on purpose. JULY Value matches its stored
// address literally and stores it inconsistently ("Hastings St" but "33rd
// Avenue"), so typing a street type it did not store returns nothing and looks
// like the tool is broken. Picking from a list can only ever produce an address
// the service actually holds.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowRight, Loader2, Info, TrendingUp, ExternalLink, MapPin } from "lucide-react";
import { useHub } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { cad } from "@/lib/calc";
import { Card, SectionLabel, Pill } from "@/components/ui";

type Result = {
  matched: boolean;
  address?: string;
  estimate?: number;
  low?: number;
  high?: number;
  confidence?: "low" | "medium" | "high" | null;
  attribution?: string | null;
};

type Suggestion = { property_id: string; address: string };

const CONFIDENCE_NOTE: Record<string, string> = {
  high: "Plenty of comparable sales nearby — this range is tight for a reason.",
  medium: "Fewer close comparables. Treat the range as the real answer, not the midpoint.",
  low: "Thin data for this property type or area. Useful as a sanity check, not a number to offer on.",
};

/** Shown only in the demo hub, where the banner says everything is a sample. */
const DEMO_SUGGESTIONS: Suggestion[] = [
  { property_id: "demo-1", address: "404-5535 Hastings St, Burnaby" },
  { property_id: "demo-2", address: "302-5535 Hastings St, Burnaby" },
  { property_id: "demo-3", address: "2080 W 33rd Avenue, Vancouver" },
];

export default function BuyerValuation() {
  const { demo } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const [query, setQuery] = useState("");
  const [sugg, setSugg] = useState<Suggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Only the newest search may write results — a slow early keystroke must not
  // overwrite the suggestions for what the user has since typed.
  const seq = useRef(0);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) { setSugg(null); setSearching(false); return; }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      let rows: Suggestion[] = [];
      try {
        if (demo) {
          await new Promise((r) => setTimeout(r, 250));
          const lc = term.toLowerCase();
          rows = DEMO_SUGGESTIONS.filter((s) => s.address.toLowerCase().includes(lc.split(" ")[0]));
        } else {
          const { data } = await sb().functions.invoke("ho-value", { body: { action: "search", q: term } });
          rows = ((data as { results?: Suggestion[] })?.results ?? []).filter((r) => r.property_id);
        }
      } catch {
        rows = [];
      }
      if (mine !== seq.current) return;
      setSugg(rows); setSearching(false); setOpen(true); setCursor(-1);
    }, 350);
    return () => clearTimeout(t);
  }, [query, demo]);

  const pick = useCallback(async (s: Suggestion) => {
    setOpen(false); setQuery(s.address); setBusy(true); setErr(null); setRes(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 600));
        setRes({
          matched: true, address: s.address,
          estimate: 1184000, low: 1121000, high: 1247000, confidence: "medium",
          attribution: "Estimate by JULY Value (julyvalue.com). Not an appraisal.",
        });
        return;
      }
      const { data, error } = await sb().functions.invoke("ho-value", {
        body: { action: "lookup", property_id: s.property_id },
      });
      if (error) throw error;
      setRes(data as Result);
    } catch {
      setErr("Couldn't reach the valuation service just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [demo]);

  function onKey(e: React.KeyboardEvent) {
    if (!open || !sugg?.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, sugg.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, -1)); }
    else if (e.key === "Enter" && cursor >= 0) { e.preventDefault(); pick(sugg[cursor]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const noMatches = !searching && sugg !== null && sugg.length === 0 && query.trim().length >= 3;

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Valuation</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">What is it actually worth?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Before you write an offer, check the asking price against an independent estimate.
            Start typing an address and pick it from the list — no sign-up, no phone number, no
            salesperson.
          </p>
        </div>
      </section>

      <div className="container-x grid min-w-0 gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400" htmlFor="jv-addr">
              Address
            </label>
            <div ref={boxRef} className="relative">
              <div className="relative">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="jv-addr"
                  className="input pl-9"
                  placeholder="Start typing — e.g. 5535 Hastings"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setRes(null); }}
                  onFocus={() => { if (sugg?.length) setOpen(true); }}
                  onKeyDown={onKey}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="jv-suggestions"
                />
                {(searching || busy) && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-teal" />
                )}
              </div>

              {open && !!sugg?.length && (
                <ul id="jv-suggestions" role="listbox"
                  className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-lg">
                  {sugg.map((s, i) => (
                    <li key={s.property_id} role="option" aria-selected={i === cursor}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => pick(s)}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${i === cursor ? "bg-teal-soft text-teal-deep" : "hover:bg-gray-50"}`}
                      >
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        <span className="min-w-0 truncate font-semibold">{s.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-gray-400">
              Pick from the list — those are the addresses JULY Value holds data for.
            </p>

            {err && <p className="mt-3 text-center text-[13px] text-coral">{err}</p>}
          </Card>

          {/* Not "no match for that address" — the address may be perfectly real
              and simply outside the data JULY Value covers. Say which. */}
          {noMatches && !res && (
            <Card className="p-6">
              <p className="text-sm font-bold">Nothing found for that yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                Try fewer words — just the number and street name, like <b>5535 Hastings</b> rather than
                the full &ldquo;Street&rdquo; or city. If it still doesn&apos;t appear, JULY Value
                doesn&apos;t hold comparable sales for that property yet. That is a gap in the data, not
                a verdict on the home — your advisor can pull the comparable set manually.
              </p>
              <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm mt-3">Ask my advisor <ArrowRight size={14} /></Link>
            </Card>
          )}

          {res && !res.matched && (
            <Card className="p-6">
              <p className="text-sm font-bold">No estimate available for that property</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                The address is on file but there aren&apos;t enough comparable sales to put a number on
                it with any confidence. Your advisor can work it manually.
              </p>
              <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm mt-3">Ask my advisor <ArrowRight size={14} /></Link>
            </Card>
          )}

          {res?.matched && res.estimate != null && (
            <section>
              <SectionLabel>Estimate</SectionLabel>
              <Card className="overflow-hidden">
                <div className="dark-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">JULY Value estimate</p>
                    {res.confidence && (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#bfe8e0]">
                        {res.confidence} confidence
                      </span>
                    )}
                  </div>
                  <p className="tabular mt-1 text-4xl font-extrabold text-white">{cad(res.estimate)}</p>
                  {res.low != null && res.high != null && (
                    <p className="mt-1 text-sm text-white/70">Range {cad(res.low)} – {cad(res.high)}</p>
                  )}
                  {res.address && <p className="mt-2 text-xs text-white/50">{res.address}</p>}
                </div>
                <div className="space-y-3 p-5 sm:p-6">
                  {res.confidence && CONFIDENCE_NOTE[res.confidence] && (
                    <p className="flex gap-2 text-[13px] leading-relaxed text-gray-600">
                      <Info size={15} className="mt-0.5 shrink-0 text-teal-deep" />
                      {CONFIDENCE_NOTE[res.confidence]}
                    </p>
                  )}
                  <p className="text-[13px] leading-relaxed text-gray-600">
                    Compare this against the asking price. A list price well above the range isn&apos;t
                    automatically wrong — but it is a question worth asking before you offer.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href={`/hub/messages${q}`} className="btn btn-primary btn-sm">
                      Talk it through <ArrowRight size={14} />
                    </Link>
                    <a href="https://search.july.ca" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                      Find comparables <ExternalLink size={13} />
                    </a>
                  </div>
                  <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-gray-400">
                    {res.attribution || "Estimate by JULY Value (julyvalue.com)."} An automated estimate — not an
                    appraisal, and not a lending decision. Your lender orders their own.
                  </p>
                </div>
              </Card>
            </section>
          )}

          {!res && !noMatches && (
            <Card className="p-6">
              <p className="flex items-center gap-2 text-sm font-extrabold"><TrendingUp size={16} className="text-teal-deep" /> Why check before you offer</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "An asking price is a marketing decision. An estimate is a data one — they often differ.",
                  "In a bidding situation, knowing the range is what keeps you from chasing a number.",
                  "If the estimate lands well under asking, that's the conversation to have with your advisor first.",
                ].map((li) => (
                  <li key={li} className="flex gap-2.5 text-[13px] leading-relaxed text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />{li}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <section>
            <SectionLabel>How this works</SectionLabel>
            <Card className="p-5">
              <p className="text-[13px] leading-relaxed text-gray-600">
                Estimates come from JULY Value, which reads recent comparable sales around the address
                and returns a range with a confidence grade. It runs inside your hub — nothing to sign
                up for, and no one calls you afterwards.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-gray-400">
                Coverage depends on where comparable sales exist, so some addresses won&apos;t appear.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <Pill tone="teal">Powered by JULY Value</Pill>
              </p>
            </Card>
          </section>

          <section>
            <SectionLabel>Next step</SectionLabel>
            <Card className="p-5">
              <p className="text-sm font-bold">Run the documents too</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                Price is half the picture. The strata minutes, disclosure and inspection are the other
                half — and AI reads them in a couple of minutes.
              </p>
              <Link href={`/hub/scan${q}`} className="btn btn-ghost btn-sm mt-3">Open AI Review <ArrowRight size={14} /></Link>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
