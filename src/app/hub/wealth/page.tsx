"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHub } from "@/lib/store";
import { cad, compact, equityUses, purchasingPower, tappableEquity, monthlyPayment, monthlyRate } from "@/lib/calc";
import { fetchCityRents, type RentCell } from "@/lib/platform";
import { IMPROVEMENTS, Improvement, ARTICLES } from "@/lib/demo";
import { Card, SectionLabel, Modal, Pill, Progress, Field } from "@/components/ui";
import { CompareBars, RangeSlider } from "@/components/charts";
import { Hammer, Ruler, LineChart as LC, Wallet, Car, Home as HomeIc, Sun, CreditCard, Heart, KeyRound } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  hammer: Hammer, ruler: Ruler, chart: LC, wallet: Wallet, car: Car, home: HomeIc, sun: Sun, card: CreditCard,
};

export default function BuildWealth() {
  const { hub, mortgages, updateHub, logActivity, rentalEntries, addRentalEntry, removeRentalEntry } = useHub();
  const [ledgerKind, setLedgerKind] = useState<"income" | "expense">("income");
  const [ledgerAmt, setLedgerAmt] = useState("");
  const [ledgerNote, setLedgerNote] = useState("");
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const [proj, setProj] = useState<Improvement | null>(null);
  const [editValue, setEditValue] = useState(false);
  const [fav, setFav] = useState<string[]>([]);

  /* investor slice — live median rents from JULY Search's rent model */
  const [rents, setRents] = useState<RentCell[] | null>(null);
  const [beds, setBeds] = useState(3);
  useEffect(() => {
    let cancelled = false;
    fetchCityRents(hub?.city || "Vancouver").then((r) => { if (!cancelled) setRents(r); });
    return () => { cancelled = true; };
  }, [hub?.city]);

  const value = hub?.home_value ?? 0;
  const balance = mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const equity = Math.max(0, value - balance);
  const equityPct = value ? equity / value : 0;
  const uses = useMemo(() => equityUses(value, balance), [value, balance]);
  const power = useMemo(() => purchasingPower(value, balance), [value, balance]);
  const gain = value - (hub?.purchase_price ?? value);
  const gainPct = hub?.purchase_price ? (gain / hub.purchase_price) * 100 : 0;
  const potential = Math.round(value * 1.11);

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Build Wealth</h1>
          <p className="mt-1 text-sm text-white/70">Your home is an investment. Here&apos;s the statement.</p>
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* VALUE ESTIMATE */}
          <section>
            <SectionLabel right={<button className="link text-xs" onClick={() => setEditValue(true)}>Update</button>}>Home value estimate</SectionLabel>
            <Card className="p-6 text-center">
              <p className="tabular text-4xl font-extrabold text-teal sm:text-5xl">{cad(value)}</p>
              <RangeSlider low={hub?.value_low ?? value * 0.92} high={hub?.value_high ?? value * 1.08} value={value} />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Low {compact(hub?.value_low ?? value * 0.92)}</span>
                <span>High {compact(hub?.value_high ?? value * 1.08)}</span>
              </div>
              <p className="mt-3 text-sm">
                <span className="font-bold text-emerald-600">▲ {gainPct.toFixed(0)}% ({cad(gain)})</span>
                <span className="text-gray-500"> since purchase</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-400">Estimate refreshed monthly from nearby sales · not an appraisal</p>
            </Card>
          </section>

          {/* USE AS INVESTMENT */}
          <section>
            <SectionLabel>Use your home as an investment</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="flex items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Improve your home</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-400">Current <span className="tabular float-right font-bold text-ink">{cad(value)}</span></p>
                    <p className="text-gray-400">Potential <span className="tabular float-right font-bold text-emerald-600">{cad(potential)}</span></p>
                  </div>
                  <a href="#projects" className="link mt-2 inline-block text-sm">See improvements</a>
                </div>
                <CompareBars current={value} potential={potential} height={84} />
              </Card>
              <Card className="p-5">
                <p className="font-bold">Budget accurately</p>
                <p className="mt-1 text-sm text-gray-500">Every project below uses localized Vancouver cost ranges — no wishful thinking.</p>
                <a href="#projects" className="link mt-3 inline-block text-sm">Get project estimates</a>
              </Card>
            </div>
          </section>

          {/* PURCHASING POWER */}
          <section>
            <SectionLabel>Purchasing power</SectionLabel>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {power.map((p) => (
                <Card key={p.key} className="p-4 text-center">
                  <p className="tabular text-xl font-extrabold text-teal-deep">{compact(p.amount)}</p>
                  <p className="mt-1 text-[13px] font-bold leading-tight">{p.label}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{p.note}</p>
                </Card>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              These show how far your <b>equity</b> could stretch as a down payment — they don&apos;t account for
              income, debts, or the stress test, which is what a lender actually approves on. Treat them as the
              ceiling, not the number. A pre-approval sets the real one.
            </p>
          </section>

          {/* RENT IT INSTEAD — investor slice, hidden when no live rent data */}
          {rents && rents.length > 0 && (() => {
            const cell = rents.find((r) => r.beds === beds) ?? rents[rents.length - 1];
            const rent = cell.median_rent ?? 0;
            const primary = mortgages[0];
            const pay = primary ? monthlyPayment(primary.balance, primary.rate, primary.amort_years) : 0;
            const tax = (value * 0.0028) / 12;
            const ins = 165;
            const maint = (value * 0.005) / 12;
            const vac = rent * 0.03;
            const cashFlow = rent - pay - tax - ins - maint - vac;
            const principal = primary ? Math.max(0, pay - primary.balance * monthlyRate(primary.rate)) : 0;
            const trueCost = cashFlow + principal;
            const grossYield = value ? ((rent * 12) / value) * 100 : 0;
            const availableBeds = rents.map((r) => r.beds).filter((b) => b >= 1);
            return (
              <section>
                <SectionLabel>Rent it instead</SectionLabel>
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-soft text-teal-deep"><KeyRound size={17} /></span>
                      <div>
                        <p className="text-sm font-extrabold">If this were your rental</p>
                        <p className="text-[11px] text-gray-400">Median asking rent · {hub?.city || "Vancouver"} · live from JULY Search</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {availableBeds.map((b) => (
                        <button key={b} onClick={() => setBeds(b)}
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${b === beds ? "bg-teal text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {b} bd
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-[#f4f6f5] p-3">
                      <p className="tabular text-lg font-extrabold">{cad(rent)}<span className="text-xs font-bold text-gray-400">/mo</span></p>
                      <p className="text-[11px] font-semibold text-gray-500">Median rent ({cell.sample ?? 0} listings)</p>
                    </div>
                    <div className="rounded-xl bg-[#f4f6f5] p-3">
                      <p className={`tabular text-lg font-extrabold ${cashFlow >= 0 ? "text-emerald-600" : "text-coral"}`}>
                        {cashFlow >= 0 ? "+" : "−"}{cad(Math.abs(cashFlow))}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-500">Monthly cash flow</p>
                    </div>
                    <div className="rounded-xl bg-[#f4f6f5] p-3">
                      <p className="tabular text-lg font-extrabold">{grossYield.toFixed(1)}%</p>
                      <p className="text-[11px] font-semibold text-gray-500">Gross yield</p>
                    </div>
                  </div>

                  <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
                    After the mortgage ({cad(pay)}), taxes, insurance, a maintenance reserve, and vacancy, this rents
                    {cashFlow >= 0 ? " cash-flow positive" : ` at ${cad(Math.abs(cashFlow))}/mo out of pocket`} — but your tenant also pays down
                    ≈ <b>{cad(principal)}</b> of principal every month. True monthly {trueCost >= 0 ? "gain" : "cost"}:
                    <b className={trueCost >= 0 ? " text-emerald-600" : " text-coral"}> {cad(Math.abs(trueCost))}</b>
                    {" "}— before appreciation.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-400">Planning estimate only — taxes, rates, and rules vary. Not investment advice.</p>
                    <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm shrink-0">Ask about renting it out</Link>
                  </div>
                </Card>
              </section>
            );
          })()}

          {/* LANDLORD MODE — lease tracking for hubs that ARE rentals */}
          <section>
            <SectionLabel>Landlord mode</SectionLabel>
            {!hub?.is_rental ? (
              <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">Already renting this home out?</p>
                  <p className="mt-0.5 text-[13px] text-gray-500">Track the lease, spot renewal dates early, and compare your rent to the market.</p>
                </div>
                <button className="btn btn-primary btn-sm shrink-0"
                  onClick={() => { updateHub({ is_rental: true }); logActivity("Turned on landlord mode"); }}>
                  Turn on landlord mode
                </button>
              </Card>
            ) : (() => {
              const leaseEnd = hub.lease_end ? new Date(`${hub.lease_end}T12:00:00`) : null;
              const daysLeft = leaseEnd ? Math.ceil((leaseEnd.getTime() - Date.now()) / 86400000) : null;
              const marketCell = rents?.find((r) => r.beds === beds) ?? (rents ? rents[rents.length - 1] : null);
              const market = marketCell?.median_rent ?? null;
              const myRent = hub.monthly_rent ?? null;
              const headroom = market && myRent ? market - Number(myRent) : null;
              return (
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold">Your lease</p>
                    {daysLeft != null && (
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        daysLeft <= 0 ? "bg-coral/10 text-coral"
                        : daysLeft <= 90 ? "bg-amber-100 text-amber-700"
                        : "bg-teal-soft text-teal-deep"}`}>
                        {daysLeft <= 0 ? "Lease ended — month-to-month?" : `Lease ends in ${daysLeft} days`}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Monthly rent ($)</label>
                      <input className="input mt-1" inputMode="numeric" value={hub.monthly_rent ?? ""}
                        onChange={(e) => updateHub({ monthly_rent: e.target.value === "" ? null : Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tenant (optional)</label>
                      <input className="input mt-1" value={hub.tenant_name ?? ""}
                        onChange={(e) => updateHub({ tenant_name: e.target.value || null })} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Lease start</label>
                      <input className="input mt-1" type="date" value={hub.lease_start ?? ""}
                        onChange={(e) => updateHub({ lease_start: e.target.value || null })} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Lease end</label>
                      <input className="input mt-1" type="date" value={hub.lease_end ?? ""}
                        onChange={(e) => updateHub({ lease_end: e.target.value || null })} />
                    </div>
                  </div>
                  {myRent != null && market != null && (
                    <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
                      You charge <b>{cad(Number(myRent))}</b> vs a <b>{cad(market)}</b> market median for {marketCell?.beds ?? beds}-bed homes here —{" "}
                      {headroom != null && headroom > 100
                        ? <span className="font-bold text-emerald-600">≈ {cad(headroom)}/mo of headroom at renewal.</span>
                        : headroom != null && headroom < -100
                          ? <span className="font-bold text-amber-700">above market — plan the renewal conversation carefully.</span>
                          : <span className="font-bold">right at market.</span>}
                    </p>
                  )}
                  {daysLeft != null && daysLeft <= 90 && daysLeft > 0 && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                      Renewal window: BC requires proper notice for rent increases and lease changes — talk it through before the clock runs out.
                    </p>
                  )}
                  {/* RENT LEDGER */}
                  {(() => {
                    const year = new Date().getFullYear();
                    const thisYear = rentalEntries.filter((e) => e.entry_date.startsWith(String(year)));
                    const income = thisYear.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0);
                    const expenses = thisYear.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0);
                    const net = income - expenses;
                    return (
                      <div className="mt-5 border-t border-line pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-extrabold">Rent ledger — {year}</p>
                          <p className="text-[12px] font-semibold text-gray-500">
                            <span className="text-emerald-600">{cad(income)}</span> in ·{" "}
                            <span className="text-coral">{cad(expenses)}</span> out ·{" "}
                            <b className={net >= 0 ? "text-emerald-600" : "text-coral"}>{net >= 0 ? "+" : "−"}{cad(Math.abs(net))} net</b>
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="flex overflow-hidden rounded-full ring-1 ring-line">
                            {(["income", "expense"] as const).map((k) => (
                              <button key={k} onClick={() => setLedgerKind(k)}
                                className={`px-3 py-1.5 text-xs font-extrabold ${ledgerKind === k ? (k === "income" ? "bg-teal text-white" : "bg-coral text-white") : "bg-white text-gray-500"}`}>
                                {k === "income" ? "Rent in" : "Expense"}
                              </button>
                            ))}
                          </div>
                          <input className="input h-9 w-28" inputMode="decimal" placeholder="$"
                            value={ledgerAmt} onChange={(e) => setLedgerAmt(e.target.value)} />
                          <input className="input h-9 min-w-0 flex-1" placeholder={ledgerKind === "income" ? "e.g. July rent" : "e.g. Plumber visit"}
                            value={ledgerNote} onChange={(e) => setLedgerNote(e.target.value)} />
                          <button className="btn btn-primary btn-sm shrink-0" disabled={!(Number(ledgerAmt) > 0)}
                            onClick={async () => {
                              await addRentalEntry({ kind: ledgerKind, amount: Number(ledgerAmt), note: ledgerNote });
                              setLedgerAmt(""); setLedgerNote("");
                              logActivity("Logged a rental " + ledgerKind);
                            }}>
                            Add
                          </button>
                        </div>
                        {rentalEntries.length > 0 && (
                          <ul className="mt-3 max-h-44 space-y-1 overflow-y-auto pr-1">
                            {rentalEntries.slice(0, 24).map((e) => (
                              <li key={e.id} className="flex min-w-0 items-center gap-2 text-[13px]">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${e.kind === "income" ? "bg-emerald-500" : "bg-coral"}`} />
                                <span className="tabular shrink-0 font-bold">{e.kind === "income" ? "+" : "−"}{cad(e.amount)}</span>
                                <span className="min-w-0 flex-1 truncate text-gray-500">{e.note ?? (e.kind === "income" ? "Rent" : "Expense")}</span>
                                <span className="shrink-0 text-[11px] text-gray-400">{e.entry_date.slice(5)}</span>
                                <button className="shrink-0 text-[11px] font-bold text-gray-300 hover:text-coral" aria-label="Delete entry"
                                  onClick={() => removeRentalEntry(e.id)}>✕</button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-2 text-[11px] text-gray-400">
                          Tax time: {year} totals above are what your accountant asks for first. Records only — not tax advice.
                        </p>
                      </div>
                    );
                  })()}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button className="text-[11px] font-bold text-gray-400 underline"
                      onClick={() => { updateHub({ is_rental: false }); logActivity("Turned off landlord mode"); }}>
                      Not a rental anymore
                    </button>
                    <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm shrink-0">Talk renewal strategy</Link>
                  </div>
                </Card>
              );
            })()}
          </section>

          {/* PROJECTS */}
          <section id="projects">
            <SectionLabel>Improvement projects — cost vs. value added</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPROVEMENTS.map((im) => (
                <Card key={im.slug} className="cursor-pointer p-5 transition hover:border-teal" >
                  <button className="w-full text-left" onClick={() => { setProj(im); logActivity("Viewed a project", im.title); }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-snug">{im.title}</p>
                      {im.recommended && <Pill tone="green">Recommended</Pill>}
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div className="text-xs text-gray-400">
                        Typical cost<br /><span className="tabular text-sm font-bold text-ink">{compact(im.costLow)}–{compact(im.costHigh)}</span>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        Value added<br />
                        <span className="tabular text-sm font-extrabold text-emerald-600">+{compact(im.valueAdd)} ({im.pctAdd.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          </section>

          {/* EDUCATION */}
          <section>
            <SectionLabel right={<Link className="link text-xs" href={`/hub/guides${q}`}>All guides</Link>}>
              Featured guides
            </SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {[ARTICLES[5], ARTICLES[3], ARTICLES[7]].map((a) => (
                <Link key={a.slug} href={`/hub/guides${q ? `${q}&` : "?"}a=${a.slug}`}
                  className="card p-4 transition hover:border-teal">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{a.tag}</p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug">{a.title}</p>
                  <p className="mt-1.5 line-clamp-3 text-xs text-gray-500">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* RAIL */}
        <aside className="space-y-6">
          <section>
            <SectionLabel>Current home equity</SectionLabel>
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="tabular text-3xl font-extrabold">{cad(equity)}</p>
                <span className="text-xs font-bold text-gray-400">{Math.round(equityPct * 100)}% of value</span>
              </div>
              <Progress value={equityPct * 100} className="mt-3" />
              <p className="mt-3 text-xs text-gray-400">
                Equity = home value − everything you owe. Lenders typically let you borrow to 80% of value.
              </p>
            </Card>
          </section>
          <section>
            <SectionLabel>Tap home equity</SectionLabel>
            <Card className="divide-y divide-line">
              {uses.map((u) => {
                const Icon = ICONS[u.icon] ?? Hammer;
                const tone = u.tone === "bad" ? "text-coral" : u.tone === "warn" ? "text-amber-600" : "text-ink";
                return (
                  <div key={u.key} className="flex items-center gap-3 p-3.5">
                    <Icon size={17} className="shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 text-sm font-semibold">{u.label}</span>
                    <span className={`tabular text-sm font-extrabold ${tone}`}>{compact(u.amount)}</span>
                  </div>
                );
              })}
              <p className="p-3.5 text-[11px] leading-relaxed text-gray-400">
                Colour is a rough guide to return on investment — <span className="font-bold text-ink">black</span> tends to build wealth,{" "}
                <span className="font-bold text-amber-600">amber</span> depends, <span className="font-bold text-coral">red</span> rarely pays you back.
                Up to {compact(tappableEquity(value, balance))} available at 80% LTV.
              </p>
            </Card>
          </section>
        </aside>
      </div>

      {/* PROJECT DETAIL */}
      <Modal open={!!proj} onClose={() => setProj(null)} title={proj?.title} wide>
        {proj && (
          <div>
            <div className="flex items-center gap-2">
              <Pill tone="teal">{proj.tag}</Pill>
              {proj.recommended && <Pill tone="green">Recommended for your home</Pill>}
            </div>
            <div className="mt-4 rounded-xl bg-cream p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-600">Potential value added</p>
                <p className="tabular text-2xl font-extrabold text-emerald-600">+{cad(proj.valueAdd)} <span className="text-sm">({proj.pctAdd.toFixed(1)}%)</span></p>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-600">Typical cost in Vancouver</p>
                <p className="tabular text-sm font-bold">{cad(proj.costLow)} – {cad(proj.costHigh)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{proj.blurb}</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button className="btn btn-ghost btn-md" onClick={() => { setFav((f) => f.includes(proj.slug) ? f : [...f, proj.slug]); logActivity("Favorited a project", proj.title); }}>
                <Heart size={15} className={fav.includes(proj.slug) ? "fill-coral text-coral" : ""} /> {fav.includes(proj.slug) ? "Saved" : "Save project"}
              </button>
              <button className="btn btn-primary btn-md" onClick={() => { logActivity("Requested contractor intro", proj.title); setProj(null); }}>
                Talk to a contractor
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-gray-400">Cost and value figures are planning estimates, refreshed quarterly.</p>
          </div>
        )}
      </Modal>

      {/* EDIT VALUE */}
      <Modal open={editValue} onClose={() => setEditValue(false)} title="Update home value">
        <ValueForm current={value} onSave={async (v) => { await updateHub({ home_value: v, value_low: Math.round(v * 0.92), value_high: Math.round(v * 1.08) }); setEditValue(false); }} />
      </Modal>
    </div>
  );
}

function ValueForm({ current, onSave }: { current: number; onSave: (v: number) => Promise<void> }) {
  const [v, setV] = useState(current);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Know something the estimate doesn&apos;t — a renovation, an appraisal? Set your own number; we&apos;ll keep tracking from there.</p>
      <Field label="Your estimate"><input type="number" className="input tabular" value={v} onChange={(e) => setV(Number(e.target.value))} /></Field>
      <button className="btn btn-primary btn-lg w-full" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}
