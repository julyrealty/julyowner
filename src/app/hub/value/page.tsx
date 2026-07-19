"use client";
// Buyer-side valuation: look up what any home is worth before you offer.
// White-labelled JULY Value — the buyer never leaves the hub or signs in again.
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowRight, Loader2, Info, TrendingUp, ExternalLink } from "lucide-react";
import { useHub } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { cad } from "@/lib/calc";
import { Card, SectionLabel, Field, Pill } from "@/components/ui";

type Result = {
  matched: boolean;
  address?: string;
  estimate?: number;
  low?: number;
  high?: number;
  confidence?: "low" | "medium" | "high" | null;
  attribution?: string | null;
};

const CONFIDENCE_NOTE: Record<string, string> = {
  high: "Plenty of comparable sales nearby — this range is tight for a reason.",
  medium: "Fewer close comparables. Treat the range as the real answer, not the midpoint.",
  low: "Thin data for this property type or area. Useful as a sanity check, not a number to offer on.",
};

export default function BuyerValuation() {
  const { demo } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const [addr, setAddr] = useState({ unit: "", address1: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ready = addr.address1.trim().length > 2 && addr.city.trim().length > 1;

  async function lookup() {
    if (!ready || busy) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      if (demo) {
        // Demo shows the shape of a real answer without spending an API call.
        await new Promise((r) => setTimeout(r, 700));
        setRes({
          matched: true, address: `${addr.address1}, ${addr.city}`,
          estimate: 1184000, low: 1121000, high: 1247000, confidence: "medium",
          attribution: "Estimate by JULY Value (julyvalue.com). Not an appraisal.",
        });
        return;
      }
      const { data, error } = await sb().functions.invoke("ho-value", {
        body: { action: "lookup", address1: addr.address1.trim(), unit: addr.unit.trim() || null, city: addr.city.trim() },
      });
      if (error) throw error;
      setRes(data as Result);
    } catch {
      setErr("Couldn't reach the valuation service just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Valuation</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">What is it actually worth?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Before you write an offer, check the asking price against an independent estimate.
            Look up any address in Canada — no sign-up, no phone number, no salesperson.
          </p>
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
              <Field label="Unit (optional)">
                <input className="input" placeholder="404" value={addr.unit}
                  onChange={(e) => setAddr({ ...addr, unit: e.target.value })} />
              </Field>
              <Field label="Street address">
                <input className="input" placeholder="5535 Hastings Street" value={addr.address1}
                  onChange={(e) => setAddr({ ...addr, address1: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") lookup(); }} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="City">
                <input className="input" placeholder="Burnaby" value={addr.city}
                  onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") lookup(); }} />
              </Field>
            </div>
            <button className="btn btn-primary btn-lg mt-4 w-full" disabled={!ready || busy} onClick={lookup}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <><Search size={16} /> Get the estimate</>}
            </button>
            {err && <p className="mt-3 text-center text-[13px] text-coral">{err}</p>}
          </Card>

          {res && !res.matched && (
            <Card className="p-6">
              <p className="text-sm font-bold">No confident match for that address</p>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                That usually means the unit or city didn&apos;t line up, or the property type is thin on
                comparable sales. Check the spelling and unit number — or ask your advisor, who can pull
                the full comparable set manually.
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

          {!res && (
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

        <aside className="space-y-6">
          <section>
            <SectionLabel>How this works</SectionLabel>
            <Card className="p-5">
              <p className="text-[13px] leading-relaxed text-gray-600">
                Estimates come from JULY Value, which reads recent comparable sales around the address
                and returns a range with a confidence grade. It runs inside your hub — nothing to sign
                up for, and no one calls you afterwards.
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
