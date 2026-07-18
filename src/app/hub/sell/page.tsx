"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Tag, TrendingUp, CalendarDays, CheckCircle2, Circle, AlertTriangle,
  Hammer, ArrowRight, Sparkles, PiggyBank,
} from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, compact, netProceeds, domEstimate, fmtDate } from "@/lib/calc";
import { fetchCityMarket, fetchSoldComps, type CityMarket, type SoldComp } from "@/lib/platform";
import { MARKET, IMPROVEMENTS, SELLER_TASKS } from "@/lib/demo";
import { Card, SectionLabel, Avatar, Progress } from "@/components/ui";

const STATUSES = [
  { key: "preparing", label: "Preparing" },
  { key: "listed", label: "Listed" },
  { key: "offers", label: "Offers" },
  { key: "sold", label: "Sold" },
] as const;

function monthOptions(): { value: string; label: string }[] {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 1; i <= 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push({
      value: m.toISOString().slice(0, 10),
      label: m.toLocaleDateString("en-CA", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

export default function SellPage() {
  const {
    hub, mortgages, tasks, inventory, pro, advisor, demo,
    startSelling, setListingStatus, setTaskStatus, updateHub, createLead, refreshValue,
  } = useHub();
  const [refreshing, setRefreshing] = useState(false);
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const value = hub?.home_value ?? 0;
  const selling = hub?.journey === "selling" || hub?.journey === "sold";

  /* live market pulse — latest snapshot rows straight from JULY Search's DB.
     null (fetch failed / no data) simply hides the strip; nothing else changes. */
  const [market, setMarket] = useState<CityMarket[] | null>(null);
  const [solds, setSolds] = useState<SoldComp[] | null>(null);
  const marketCity = hub?.city || "Vancouver";
  useEffect(() => {
    let cancelled = false;
    fetchCityMarket(marketCity).then((rows) => { if (!cancelled) setMarket(rows); });
    // Real solds replace the seeded comps automatically once JULY's sold DB has data.
    fetchSoldComps(marketCity).then((rows) => { if (!cancelled) setSolds(rows); });
    return () => { cancelled = true; };
  }, [marketCity]);

  const comps = solds?.length
    ? solds.map((s) => ({
        address: `${s.unit_number ? `${s.unit_number}-` : ""}${s.address}`,
        price: s.sold_price ?? 0,
        date: s.sold_date ?? "",
      }))
    : MARKET.recentSales;
  const compsLive = !!solds?.length;

  /* activation */
  const [targetMonth, setTargetMonth] = useState("");
  const [starting, setStarting] = useState(false);

  /* pricing lab */
  const sliderMin = Math.round(Math.min(hub?.value_low ?? value * 0.94, value * 0.92) / 5000) * 5000;
  const sliderMax = Math.round(Math.max(hub?.value_high ?? value * 1.06, value * 1.1) / 5000) * 5000;
  const [listPrice, setListPrice] = useState(() => Math.round(value / 5000) * 5000);

  /* net proceeds inputs */
  const [commFirst, setCommFirst] = useState(7);
  const [commRest, setCommRest] = useState(2.5);
  const [legal, setLegal] = useState(1400);
  const [staging, setStaging] = useState(0);
  const [moving, setMoving] = useState(2200);
  const [penaltyStr, setPenaltyStr] = useState("");

  /* advisor message */
  const [msg, setMsg] = useState("");
  const [msgSent, setMsgSent] = useState(false);

  const np = useMemo(() => netProceeds({
    price: listPrice || value,
    mortgages: mortgages.map((m) => ({ balance: m.balance, rate: m.rate, loan_type: m.loan_type })),
    commissionFirstPct: commFirst, commissionRestPct: commRest,
    legal, staging, moving,
    penaltyOverride: penaltyStr.trim() === "" ? null : Math.max(0, Number(penaltyStr) || 0),
  }), [listPrice, value, mortgages, commFirst, commRest, legal, staging, moving, penaltyStr]);

  const todayNet = useMemo(() => netProceeds({
    price: value,
    mortgages: mortgages.map((m) => ({ balance: m.balance, rate: m.rate, loan_type: m.loan_type })),
  }), [value, mortgages]);

  const dom = domEstimate(MARKET.daysOnMarket, listPrice || value, value);
  const expectedSale = Math.round((listPrice || value) * MARKET.listToSale);
  const premium = value ? (listPrice || value) / value - 1 : 0;
  const positioning =
    premium < -0.015
      ? { label: "Priced to spark competition", tone: "text-teal-deep bg-teal-soft", note: "Below the estimate — more showings, more offers, often a better final number." }
      : premium <= 0.015
        ? { label: "At market value", tone: "text-navy bg-[#e8eef4]", note: "Right on the estimate — clean, defensible pricing buyers respect." }
        : { label: "Ambitious", tone: "text-amber-700 bg-amber-100", note: "Above the estimate — expect a longer wait and price-sensitive feedback." };

  /* roadmap */
  const sellerTitles = useMemo(() => new Set(SELLER_TASKS.map((t) => t.title)), []);
  const roadmap = tasks.filter((t) => sellerTitles.has(t.title) && t.status !== "dismissed");
  const roadmapDone = roadmap.filter((t) => t.status === "done").length;
  const riskItems = inventory
    .filter((i) => (i.failure_risk ?? 0) >= 6)
    .sort((a, b) => (b.failure_risk ?? 0) - (a.failure_risk ?? 0));

  /* pre-sale ROI re-rank: fast cosmetic wins vs long builds that don't fit a listing timeline */
  const quickWins = IMPROVEMENTS
    .filter((i) => i.costHigh <= 60000)
    .sort((a, b) => (b.valueAdd - b.costHigh) - (a.valueAdd - a.costHigh))
    .slice(0, 4);
  const skipList = IMPROVEMENTS
    .filter((i) => i.costHigh > 100000)
    .sort((a, b) => b.costHigh - a.costHigh)
    .slice(0, 2);

  async function activate() {
    setStarting(true);
    try { await startSelling(targetMonth || undefined); } finally { setStarting(false); }
  }

  async function sendMsg() {
    await createLead("sell", msg || "Ready to talk about listing — reviewing my selling plan now.");
    setMsgSent(true);
  }

  if (!hub) return null;

  /* ---------------------------------- activation state ---------------------------------- */
  if (!selling) {
    return (
      <div className="container-x py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">Seller mode</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Let&apos;s sell it right.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Selling well isn&apos;t about listing fast — it&apos;s about knowing your numbers before anyone else does.
            Your hub already knows your home. Turn on seller mode and it turns into a selling machine.
          </p>

          <Card className="mt-6 overflow-hidden">
            <div className="dark-panel p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">If you sold today</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="tabular text-3xl font-extrabold text-white sm:text-4xl">≈ {cad(todayNet.net)}</span>
                <span className="text-sm text-white/70">estimated cash in your pocket</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                {compact(value)} estimated value − mortgage payout {compact(todayNet.balances)} − selling costs {compact(todayNet.totalCosts)}.
                Seller mode shows you every line — and how to grow that number before you list.
              </p>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {[
                { icon: TrendingUp, t: "Pricing lab", d: "Test list prices against your estimate and recent nearby sales — see how each choice changes your time on market." },
                { icon: PiggyBank, t: "Net proceeds, to the dollar", d: "Commission, GST, mortgage payout and penalty, legal, moving — the real number, not the sticker price." },
                { icon: Hammer, t: "A roadmap built from your home", d: "Your own inventory and records become the prep checklist — fix what inspectors will find, skip what doesn't pay." },
              ].map((b) => (
                <div key={b.t} className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal-deep"><b.icon size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">{b.t}</p>
                    <p className="text-[13px] leading-relaxed text-gray-500">{b.d}</p>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-400">When would you like to list?</label>
                <select className="input mt-1.5" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)}>
                  <option value="">Not sure yet</option>
                  {monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <button className="btn btn-primary btn-lg mt-2 w-full" disabled={starting} onClick={activate}>
                {starting ? "Setting up your plan…" : "Start my selling plan"} <ArrowRight size={16} />
              </button>
              <p className="text-center text-[11px] leading-relaxed text-gray-400">
                {demo
                  ? "In your real hub, this quietly notifies your advisor so a proper market evaluation is ready when you are."
                  : `${(pro as { first_name?: string | null })?.first_name || "Your advisor"} gets a quiet heads-up so a proper market evaluation is ready when you are. No listing agreement, no obligation.`}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------------------------- selling state ---------------------------------- */
  const marketChips = (market ?? [])
    .slice(0, 3)
    .map((r) => ({ label: classLabel(r.property_class), bits: marketBits(r) }))
    .filter((c) => c.bits.length > 0);
  const marketAsOf = market?.[0]?.snapshot_date ?? null;

  return (
    <div className="container-x space-y-8 py-8">
      {/* header + tracker */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Seller mode</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Your selling plan</h1>
            {hub.buying_started_at && (
              <Link href={`/hub/buying${q}`} className="mt-1 inline-block text-[12px] font-bold text-teal-deep underline underline-offset-2">
                Also buying — open your Buying HQ →
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays size={15} />
            <span>Target:</span>
            <select
              className="rounded-lg border border-line bg-white px-2 py-1 text-sm font-semibold"
              value={hub.target_list_month ?? ""}
              onChange={(e) => updateHub({ target_list_month: e.target.value || null })}
            >
              <option value="">Flexible</option>
              {monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              {hub.target_list_month && !monthOptions().some((m) => m.value === hub.target_list_month) && (
                <option value={hub.target_list_month}>{fmtDate(hub.target_list_month)}</option>
              )}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUSES.map((s, i) => {
            const cur = hub.listing_status ?? "preparing";
            const curIdx = STATUSES.findIndex((x) => x.key === cur);
            const isActive = s.key === cur;
            const isPast = i < curIdx;
            return (
              <button key={s.key} onClick={() => setListingStatus(s.key)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
                  isActive ? "bg-teal text-white shadow-sm"
                  : isPast ? "bg-teal-soft text-teal-deep"
                  : "bg-white text-gray-500 ring-1 ring-line hover:bg-gray-50"}`}>
                {isPast ? <CheckCircle2 size={15} /> : isActive ? <Tag size={14} /> : <Circle size={13} />}
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN */}
        <div className="space-y-8">
          {/* PRICING LAB */}
          <section>
            <SectionLabel>Pricing lab</SectionLabel>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">JULY Value estimate</p>
                  <div className="flex items-center gap-2">
                    <p className="tabular text-2xl font-extrabold">{cad(value)}</p>
                    {hub.value_confidence && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        hub.value_confidence === "high" ? "bg-teal-soft text-teal-deep"
                        : hub.value_confidence === "medium" ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"}`}>
                        {hub.value_confidence} confidence
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Range {compact(hub.value_low ?? value * 0.94)} – {compact(hub.value_high ?? value * 1.06)}
                  {hub.value_updated ? ` · updated ${fmtDate(hub.value_updated)}` : ""}
                  {!demo && (
                    <button
                      className="ml-2 font-bold text-teal-deep underline disabled:opacity-50"
                      disabled={refreshing}
                      onClick={async () => { setRefreshing(true); try { await refreshValue(); } finally { setRefreshing(false); } }}>
                      {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                  )}
                </p>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Try a list price</label>
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${positioning.tone}`}>{positioning.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input type="range" min={sliderMin} max={sliderMax} step={5000} value={listPrice}
                    onChange={(e) => setListPrice(Number(e.target.value))} className="w-full accent-[var(--teal)]" />
                  <span className="tabular w-28 shrink-0 rounded-lg bg-teal-soft px-2 py-1.5 text-center font-extrabold text-teal-deep">{compact(listPrice)}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{positioning.note}</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#f4f6f5] p-3">
                  <p className="tabular text-lg font-extrabold">{cad(listPrice)}</p>
                  <p className="text-[11px] font-semibold text-gray-500">List price</p>
                </div>
                <div className="rounded-xl bg-[#f4f6f5] p-3">
                  <p className="tabular text-lg font-extrabold">≈ {dom} days</p>
                  <p className="text-[11px] font-semibold text-gray-500">Est. time on market</p>
                </div>
                <div className="rounded-xl bg-[#f4f6f5] p-3">
                  <p className="tabular text-lg font-extrabold">{compact(expectedSale)}</p>
                  <p className="text-[11px] font-semibold text-gray-500">Typical sale price*</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                *Based on {MARKET.area} averaging {MARKET.daysOnMarket} days on market and selling at {(MARKET.listToSale * 100).toFixed(1)}% of list.
                {" "}Estimate by JULY Value (julyvalue.com), operated by JULY Realty Inc. Not an appraisal.
              </p>

              <div className="mt-5 border-t border-line pt-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Recent sales near you
                  {compsLive && <span className="rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-extrabold tracking-normal text-teal-deep">Live · JULY</span>}
                </p>
                <ul className="mt-2 space-y-2">
                  {comps.slice(0, 4).map((s) => {
                    const delta = listPrice - s.price;
                    return (
                      <li key={s.address} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold">{s.address}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="tabular font-bold">{compact(s.price)}</span>
                          <span className={`tabular rounded-full px-2 py-0.5 text-[11px] font-bold ${delta >= 0 ? "bg-teal-soft text-teal-deep" : "bg-amber-100 text-amber-700"}`}>
                            {delta >= 0 ? "+" : "−"}{compact(Math.abs(delta))} vs yours
                          </span>
                          {s.date && <span className="hidden text-xs text-gray-400 sm:inline">{fmtDate(s.date)}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* LIVE MARKET STRIP — real snapshot data; hidden entirely when unavailable */}
              {marketChips.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Your market right now — {marketCity}
                    </p>
                    {marketAsOf && <p className="text-[11px] text-gray-400">as of {fmtDate(marketAsOf)}</p>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {marketChips.map((c, i) => (
                      <span key={`${c.label}-${i}`} className="tabular rounded-xl bg-[#f4f6f5] px-3 py-2 text-[12px] leading-relaxed text-gray-600">
                        <span className="font-extrabold text-ink">{c.label}</span> — {c.bits.join(" · ")}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">Live from JULY Search (search.july.ca)</p>
                </div>
              )}
            </Card>
          </section>

          {/* NET PROCEEDS */}
          <section>
            <SectionLabel>What you&apos;d walk away with</SectionLabel>
            <Card className="overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between font-bold">
                    <span>Sale price</span><span className="tabular">{cad(listPrice || value)}</span>
                  </div>
                  <Row label={`Commission (${commFirst}% first $100K + ${commRest}% of rest)`} value={-np.commission} />
                  <Row label="GST on commission (5%)" value={-np.gst} />
                  {np.balances > 0 && <Row label={`Mortgage payout (${mortgages.length > 1 ? `${mortgages.length} loans` : mortgages[0]?.lender || "loan"})`} value={-np.balances} />}
                  {np.balances > 0 && <Row label="Payout penalty (≈ 3 months' interest)" value={-np.penalty} />}
                  <Row label="Legal & conveyancing" value={-np.legal} />
                  {np.staging > 0 && <Row label="Staging" value={-np.staging} />}
                  <Row label="Moving" value={-np.moving} />
                </div>

                {np.balances > 0 && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                    <AlertTriangle size={12} className="mr-1 inline -translate-y-px" />
                    Fixed-rate mortgages may owe an interest-rate-differential (IRD) penalty instead — sometimes much more than 3 months&apos; interest.
                    Your lender quotes the exact figure; enter it below to sharpen this estimate.
                  </p>
                )}

                <details className="mt-4 group">
                  <summary className="cursor-pointer select-none text-sm font-bold text-teal-deep">Adjust the assumptions</summary>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Num label="Commission — first $100K %" v={commFirst} set={setCommFirst} step={0.5} />
                    <Num label="Commission — remainder %" v={commRest} set={setCommRest} step={0.25} />
                    <Num label="Legal ($)" v={legal} set={setLegal} step={100} />
                    <Num label="Staging ($)" v={staging} set={setStaging} step={500} />
                    <Num label="Moving ($)" v={moving} set={setMoving} step={100} />
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Exact penalty ($, from lender)</label>
                      <input className="input mt-1" inputMode="numeric" placeholder="auto" value={penaltyStr} onChange={(e) => setPenaltyStr(e.target.value)} />
                    </div>
                  </div>
                </details>
              </div>
              <div className="dark-panel flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 sm:px-6">
                <span className="text-sm font-bold text-white/80">Estimated net proceeds</span>
                <span className="tabular text-2xl font-extrabold text-white sm:text-3xl">{cad(np.net)}</span>
              </div>
            </Card>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              Estimates for planning only — not an appraisal or legal advice. Property transfer tax applies to your next purchase, not this sale.
            </p>
          </section>

          {/* ROADMAP */}
          <section>
            <SectionLabel>Selling roadmap</SectionLabel>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{roadmapDone} of {roadmap.length} done</p>
                <div className="w-40"><Progress value={roadmap.length ? (roadmapDone / roadmap.length) * 100 : 0} /></div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {roadmap.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setTaskStatus(t.id, t.status === "done" ? "pending" : "done")}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-50">
                      {t.status === "done"
                        ? <CheckCircle2 size={20} className="shrink-0 text-teal" />
                        : <Circle size={20} className="shrink-0 text-gray-300" />}
                      <span className={`min-w-0 flex-1 text-sm font-semibold ${t.status === "done" ? "text-gray-400 line-through" : ""}`}>{t.title}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{t.minutes} min</span>
                    </button>
                  </li>
                ))}
                {roadmap.length === 0 && (
                  <p className="py-2 text-sm text-gray-500">Your roadmap tasks live in <Link href={`/hub/manage${q}`} className="font-bold text-teal-deep underline">Manage Home</Link>.</p>
                )}
              </ul>

              {riskItems.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-800">
                    <AlertTriangle size={15} /> Fix these before the inspector finds them
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-amber-800/80">
                    Buyers&apos; inspections surface aging equipment — and every finding becomes a negotiating chip against your price.
                    Handle these on your terms instead.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {riskItems.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{i.item_type}{i.brand ? ` · ${i.brand}` : ""}{i.age_years != null ? ` · ${i.age_years} yrs` : ""}</span>
                        <span className="tabular shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200">risk {i.failure_risk?.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/hub/manage${q}`} className="btn btn-ghost btn-sm mt-3">Plan the fixes <ArrowRight size={14} /></Link>
                </div>
              )}
            </Card>
          </section>

          {/* PRE-SALE ROI */}
          <section>
            <SectionLabel>Worth doing before you list</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickWins.map((i) => (
                <Card key={i.slug} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold">{i.title}</p>
                    <span className="shrink-0 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-extrabold text-teal-deep">+{compact(i.valueAdd)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-gray-500">Cost {compact(i.costLow)}–{compact(i.costHigh)} · pays back before possession day</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{i.blurb}</p>
                </Card>
              ))}
            </div>
            {skipList.length > 0 && (
              <Card className="mt-3 p-4">
                <p className="text-sm font-extrabold text-gray-700">Skip these for now</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                  {`${skipList.map((i) => i.title.toLowerCase()).join(" and ")} add real value — but they take many months and permits.`}
                  On a selling timeline, buyers won&apos;t pay you back for unfinished plans. Mention the potential in the listing instead.
                </p>
              </Card>
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <section>
            <SectionLabel>Your listing team</SectionLabel>
            <Card className="p-5">
              {pro ? (
                <div className="flex items-center gap-3">
                  <Avatar name={`${(pro as { first_name?: string | null }).first_name ?? "J"} ${(pro as { last_name?: string | null }).last_name ?? "R"}`} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{(pro as { first_name?: string | null }).first_name} {(pro as { last_name?: string | null }).last_name}</p>
                    <p className="text-xs text-gray-500">{(pro as { org_name?: string | null }).org_name || "JULY Realty"} · Listing advisor</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">A JULY advisor will guide your sale.</p>
              )}
              {advisor && (
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                  <Avatar name={`${advisor.first_name} ${advisor.last_name}`} size={38} color="var(--navy)" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{advisor.first_name} {advisor.last_name}</p>
                    <p className="text-xs text-gray-500">{advisor.advisor_type} · payout &amp; port options</p>
                  </div>
                </div>
              )}
              {msgSent ? (
                <div className="mt-4 rounded-xl bg-teal-soft p-3 text-center">
                  <p className="text-sm font-extrabold text-teal-deep">Message sent ✓</p>
                  <p className="mt-0.5 text-[12px] text-teal-deep/80">
                    {demo ? "In your real hub this alerts your advisor instantly." : "Your advisor will reach out shortly."}
                  </p>
                </div>
              ) : (
                <>
                  <textarea className="input mt-4 min-h-20 text-sm" placeholder="Questions about timing, pricing, or prep? (optional)"
                    value={msg} onChange={(e) => setMsg(e.target.value)} />
                  <button className="btn btn-primary btn-md mt-2 w-full" onClick={sendMsg}>
                    Talk it through <ArrowRight size={15} />
                  </button>
                </>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>While you prepare</SectionLabel>
            <Card className="p-5 text-sm leading-relaxed text-gray-600">
              <p className="flex items-center gap-1.5 font-extrabold text-ink"><Sparkles size={15} className="text-gold" /> Small moves, big finish</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4">
                <li>Keep logging maintenance — a documented home sells with confidence.</li>
                <li>Your <Link className="font-bold text-teal-deep underline" href={`/hub/home/documents${q}`}>documents folder</Link> becomes your disclosure package.</li>
                <li>Completed roadmap items show up in your advisor&apos;s listing story.</li>
              </ul>
            </Card>
          </section>

          <section>
            <Card className="p-4 text-center text-[12px] text-gray-400">
              Plans change — you can <button className="font-bold text-gray-500 underline"
                onClick={() => updateHub({ journey: "owning", listing_status: null, selling_started_at: null, target_list_month: null })}>
                pause selling
              </button> anytime and keep your hub as-is.
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-gray-600">
      <span className="min-w-0">{label}</span>
      <span className="tabular shrink-0 font-semibold">− {cad(Math.abs(value))}</span>
    </div>
  );
}

function Num({ label, v, set, step }: { label: string; v: number; set: (n: number) => void; step: number }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</label>
      <input className="input mt-1" type="number" step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
    </div>
  );
}

/* live market strip helpers — property_class values are opaque labels from JULY Search */
function classLabel(cls: string | null): string {
  const s = cls?.trim();
  if (!s) return "Overall";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function marketBits(r: CityMarket): string[] {
  const bits: string[] = [];
  if (r.active_count != null) bits.push(`${r.active_count} active`);
  if (r.median_list_price != null) bits.push(`median ask ${compact(r.median_list_price)}`);
  if (r.avg_ppsf != null) bits.push(`$${Math.round(r.avg_ppsf)}/sqft`);
  if (r.median_dom != null) bits.push(`${Math.round(r.median_dom)} days`);
  return bits;
}
