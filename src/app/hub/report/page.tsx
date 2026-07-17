"use client";
// Annual Home Report — a one-page year-in-review the homeowner can screenshot,
// print, or hand to their advisor. Real numbers from the hub, zero hype.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Printer, ArrowRight, Circle, Sparkles, AlertTriangle, CalendarDays } from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, compact, fmtDate, valueSeries, tappableEquity } from "@/lib/calc";
import { fetchCityMarket, type CityMarket } from "@/lib/platform";
import { Card, SectionLabel, Avatar } from "@/components/ui";
import { Sparkline, RangeSlider } from "@/components/charts";

const PRINT_CSS = `
@media print {
  header, nav { display: none !important }
  .no-print { display: none !important }
  body { background: #fff }
  .bg-navy, .bg-amber-500 { display: none !important }
  .bg-\\[\\#f7f8f7\\] { background: #fff !important }
  .card { break-inside: avoid }
  .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact }
}
`;

/* Date helpers — anchor date-only strings at noon so western timezones don't slip a day. */
const noon = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d));
const monthYear = (d: string) => noon(d).toLocaleDateString("en-CA", { month: "short", year: "numeric" });
function addMonths(iso: string, months: number): Date {
  const d = noon(iso);
  d.setMonth(d.getMonth() + months);
  return d;
}

/* Live market chips — property_class values are opaque labels from JULY Search. */
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
  return bits;
}

export default function AnnualReport() {
  const { hub, mortgages, tasks, docs, inventory, pro, advisor } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const year = new Date().getFullYear();
  const value = hub?.home_value ?? 0;
  const balance = mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const equity = Math.max(0, value - balance);
  const tap = tappableEquity(value, balance);

  const purchasePrice = hub?.purchase_price ?? null;
  const purchaseDate = hub?.purchase_date ?? null;
  const purchaseYear = purchaseDate ? purchaseDate.slice(0, 4) : null;
  const gain = purchasePrice != null ? value - purchasePrice : null;
  const gainPct = purchasePrice ? Math.round(((value - purchasePrice) / purchasePrice) * 100) : null;

  const low = hub?.value_low ?? Math.round(value * 0.94);
  const high = hub?.value_high ?? Math.round(value * 1.06);

  const series = useMemo(
    () => (purchasePrice && purchaseDate && value ? valueSeries(purchasePrice, purchaseDate, value) : []),
    [purchasePrice, purchaseDate, value],
  );

  const done = tasks.filter((t) => t.status === "done");
  const minutesInvested = done.reduce((s, t) => s + (t.minutes || 0), 0);
  const watch = [...inventory]
    .filter((i) => (i.failure_risk ?? 0) >= 6)
    .sort((a, b) => (b.failure_risk ?? 0) - (a.failure_risk ?? 0));
  const upcoming = [...tasks]
    .filter((t) => t.status === "pending")
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"))
    .slice(0, 3);

  /* Mortgage renewal inside the next 18 months → worth a line in the plan. */
  const renewal = useMemo(() => {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setMonth(horizon.getMonth() + 18);
    for (const m of mortgages) {
      if (!m.start_date) continue;
      const end = addMonths(m.start_date, m.term_months ?? 60);
      if (end >= now && end <= horizon) {
        return { lender: m.lender, month: end.toLocaleDateString("en-CA", { month: "long", year: "numeric" }) };
      }
    }
    return null;
  }, [mortgages]);

  /* Live market snapshot — null (fetch failed / no data) hides the section entirely. */
  const city = hub?.city || "";
  const [market, setMarket] = useState<CityMarket[] | null>(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    fetchCityMarket(city).then((rows) => { if (!cancelled) setMarket(rows); });
    return () => { cancelled = true; };
  }, [city]);

  const proFirst = pro?.first_name || "your advisor";
  const proName = [pro?.first_name, pro?.last_name].filter(Boolean).join(" ");
  const proOrg = pro?.company || pro?.org_name || "JULY Realty";

  if (!hub) return null;

  const marketChips = (market ?? [])
    .slice(0, 3)
    .map((r) => ({ label: classLabel(r.property_class), bits: marketBits(r) }))
    .filter((c) => c.bits.length > 0);
  const marketAsOf = market?.[0]?.snapshot_date ?? null;

  return (
    <div className="print-exact">
      <style>{PRINT_CSS}</style>

      <button
        onClick={() => window.print()}
        title="Print or save as PDF"
        className="no-print btn btn-ghost btn-sm fixed bottom-24 right-4 z-30 shadow-lg sm:bottom-auto sm:right-6 sm:top-24"
      >
        <Printer size={15} /> Print / save PDF
      </button>

      <div className="container-x py-8 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* 1 · HERO */}
          <Card className="overflow-hidden">
            <div className="dark-panel p-6 sm:p-8">
              <p className="eyebrow text-gold">Annual Home Report</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Your home&apos;s year — {year}
              </h1>
              <p className="mt-2 text-sm font-semibold text-white/80">
                {hub.unit ? `${hub.unit} – ` : ""}{hub.address1}
                {city ? ` · ${city}` : ""}{hub.region ? `, ${hub.region}` : ""}
              </p>
              <p className="mt-1 text-xs text-white/50">Prepared by {proName ? `${proName} · ` : ""}{proOrg}</p>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">Estimated value today</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="tabular text-4xl font-extrabold text-white sm:text-5xl">{cad(value)}</span>
                  {hub.value_confidence && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#bfe8e0]">
                      JULY Value · {hub.value_confidence} confidence
                    </span>
                  )}
                </div>
                {purchaseYear && gain != null && (
                  gain > 0 ? (
                    <p className="mt-2 text-sm font-bold text-[#bfe8e0]">
                      ▲ {cad(gain)}{gainPct ? ` (+${gainPct}%)` : ""} since you bought in {purchaseYear}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-white/60">You bought in {purchaseYear} for {cad(purchasePrice!)}</p>
                  )
                )}
              </div>
            </div>
          </Card>

          {/* 2 · VALUE JOURNEY */}
          <section>
            <SectionLabel>Value journey</SectionLabel>
            <Card className="p-5 sm:p-6">
              {series.length > 1 && purchaseDate && purchasePrice != null ? (
                <>
                  <Sparkline data={series} height={96} />
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Bought · {monthYear(purchaseDate)}</p>
                      <p className="tabular text-lg font-extrabold">{compact(purchasePrice)}</p>
                    </div>
                    {gain != null && gain > 0 && (
                      <p className="hidden pb-0.5 text-center text-[11px] text-gray-400 sm:block">
                        {compact(gain)} of growth, one address
                      </p>
                    )}
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-teal-deep">Today</p>
                      <p className="tabular text-lg font-extrabold text-teal-deep">{compact(value)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your purchase price and date in <Link href={`/hub/home${q}`} className="link">My Home</Link> to draw the full journey.
                </p>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-baseline justify-between text-[11px] text-gray-400">
                  <span>Low {compact(low)}</span>
                  <span className="font-bold uppercase tracking-wide text-gray-500">JULY Value range</span>
                  <span>High {compact(high)}</span>
                </div>
                <RangeSlider low={low} high={high} value={value} />
                {hub.value_updated && (
                  <p className="mt-1 text-right text-[11px] text-gray-400">updated {fmtDate(hub.value_updated)}</p>
                )}
              </div>
            </Card>
          </section>

          {/* 3 · EQUITY POSITION */}
          <section>
            <SectionLabel>Equity position</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile
                label="Equity today"
                value={cad(equity)}
                tone="text-teal-deep"
                note="Home value minus everything you owe — the part that's already yours."
              />
              <Tile
                label="Mortgage balance"
                value={cad(balance)}
                note={balance > 0
                  ? `Left on ${mortgages.length > 1 ? `${mortgages.length} loans` : mortgages[0]?.lender || "your loan"} — every payment moves value to your side.`
                  : "Mortgage-free — every dollar of value here is yours."}
              />
              <Tile
                label="Tappable equity"
                value={cad(tap)}
                note="What lenders would typically extend against your home at 80% loan-to-value."
              />
            </div>
          </section>

          {/* 4 · WHAT YOU ACCOMPLISHED */}
          <section>
            <SectionLabel>What you accomplished</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              <CountTile
                n={done.length}
                label={done.length === 1 ? "task completed" : "tasks completed"}
                note={minutesInvested > 0 ? `${minutesInvested} minutes invested in this home` : "your record starts with the first check-off"}
              />
              <CountTile
                n={docs.length}
                label={docs.length === 1 ? "document stored" : "documents stored"}
                note="warranties, insurance, receipts — findable in seconds"
              />
              <CountTile
                n={inventory.length}
                label={inventory.length === 1 ? "system tracked" : "systems tracked"}
                note="ages and lifespans on record, surprises off the calendar"
              />
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-[13px] leading-relaxed text-gray-600">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-gold" />
              <span>A documented home is a confident sale — buyers pay for provenance.</span>
            </p>
          </section>

          {/* 5 · WATCH LIST */}
          <section>
            <SectionLabel>Watch list</SectionLabel>
            {watch.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-800">
                  <AlertTriangle size={15} /> Aging systems worth watching
                </p>
                <ul className="mt-3 space-y-2.5">
                  {watch.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 font-semibold text-amber-900">
                        {[i.item_type, i.brand, i.age_years != null ? `${i.age_years} yrs` : null].filter(Boolean).join(" · ")}
                      </span>
                      <span className="tabular shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200">
                        risk {(i.failure_risk ?? 0).toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-amber-800/80">
                  Nothing here is an emergency — that&apos;s the advantage. Plan the fix on your terms, before it picks the timing for you.
                </p>
              </div>
            ) : (
              <Card className="p-5 text-sm leading-relaxed text-gray-600">
                Every tracked system is comfortably inside its expected life. That&apos;s not luck — that&apos;s a well-kept home.
              </Card>
            )}
          </section>

          {/* 6 · YOUR MARKET — live rows only; hidden entirely when unavailable */}
          {marketChips.length > 0 && (
            <section>
              <SectionLabel right={marketAsOf ? <span className="text-[11px] text-gray-400">as of {fmtDate(marketAsOf)}</span> : undefined}>
                Your market — {city}
              </SectionLabel>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {marketChips.map((c, i) => (
                    <span key={`${c.label}-${i}`} className="tabular rounded-xl bg-[#f4f6f5] px-3 py-2 text-[12px] leading-relaxed text-gray-600">
                      <span className="font-extrabold text-ink">{c.label}</span> — {c.bits.join(" · ")}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Live from JULY Search (search.july.ca)</p>
              </Card>
            </section>
          )}

          {/* 7 · THE YEAR AHEAD */}
          <section>
            <SectionLabel>The year ahead</SectionLabel>
            <Card className="p-5 sm:p-6">
              {upcoming.length > 0 ? (
                <ul className="space-y-2.5">
                  {upcoming.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <Circle size={18} className="shrink-0 text-gray-300" />
                      <span className="min-w-0 flex-1 font-semibold">{t.title}</span>
                      {t.due_date && <span className="hidden shrink-0 text-xs text-gray-400 sm:inline">{fmtDate(t.due_date)}</span>}
                      <span className="tabular shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{t.minutes} min</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Your checklist is clear — seasonal tasks will appear here as they come due.</p>
              )}

              {renewal && (
                <div className="mt-4 rounded-2xl bg-teal-soft px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-teal-deep">
                    <CalendarDays size={14} className="shrink-0" />
                    {renewal.lender ? `Your mortgage with ${renewal.lender} renews in ${renewal.month}.` : `Your mortgage renews in ${renewal.month}.`}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-teal-deep/80">
                    Renewal is the one moment your rate is truly negotiable —{" "}
                    {advisor?.first_name
                      ? `${advisor.first_name} can run your options months before the paperwork arrives.`
                      : "the best conversations start months before the paperwork arrives."}
                  </p>
                </div>
              )}

              <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                <Link href={`/hub/manage${q}`} className="btn btn-primary btn-md">Review my plan <ArrowRight size={15} /></Link>
                <Link href={`/hub${q}`} className="btn btn-ghost btn-md">Talk to {proFirst}</Link>
              </div>
            </Card>
          </section>

          {/* 8 · FOOTER */}
          <footer className="space-y-4">
            <p className="text-center text-[13px] text-gray-500">Here&apos;s to another good year under this roof.</p>
            <Card className="p-5 sm:p-6">
              {pro && (
                <div className="flex items-center gap-3">
                  <Avatar name={proName || "J R"} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{proName || "Your JULY advisor"}</p>
                    <p className="truncate text-xs text-gray-500">{pro.job_title || "Real Estate Advisor"} · {proOrg}</p>
                  </div>
                </div>
              )}
              {advisor && (
                <div className={`flex items-center gap-3 ${pro ? "mt-3 border-t border-line pt-3" : ""}`}>
                  <Avatar name={[advisor.first_name, advisor.last_name].filter(Boolean).join(" ")} size={38} color="var(--navy)" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{advisor.first_name} {advisor.last_name}</p>
                    <p className="text-xs text-gray-500">{advisor.advisor_type}{advisor.company ? ` · ${advisor.company}` : ""}</p>
                  </div>
                </div>
              )}
              <p className={`text-[11px] leading-relaxed text-gray-400 ${pro || advisor ? "mt-4 border-t border-line pt-3" : ""}`}>
                Prepared {fmtDate(new Date())} · Estimates for information only — not an appraisal.
                {hub.value_confidence && " Estimate by JULY Value (julyvalue.com), operated by JULY Realty Inc."}
              </p>
            </Card>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`tabular mt-1 text-2xl font-extrabold ${tone ?? ""}`}>{value}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{note}</p>
    </Card>
  );
}

function CountTile({ n, label, note }: { n: number; label: string; note: string }) {
  return (
    <Card className="p-4 text-center sm:p-5">
      <p className="tabular text-3xl font-extrabold text-teal-deep">{n}</p>
      <p className="mt-0.5 text-[12px] font-extrabold">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{note}</p>
    </Card>
  );
}
