"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useHub, Mortgage } from "@/lib/store";
import { cad, paidBreakdown, extraPaymentSavings, refiScenario, monthlyPayment, monthsBetween } from "@/lib/calc";
import { MARKET, REFI_PRODUCTS } from "@/lib/demo";
import { Card, SectionLabel, Modal, Field, Progress } from "@/components/ui";
import { Donut, Sparkline } from "@/components/charts";
import { ThumbsUp, ThumbsDown, Plus } from "lucide-react";

/* Renewal math — Canadian fixed mortgages end at the TERM, not the amortization.
   Explicit Date parts (noon anchor, fmtDate convention) so date-only strings
   never drift a day in Pacific time. */
function renewalDateOf(startDate: string, termMonths: number): Date {
  const [y, m, d] = startDate.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1 + termMonths, d || 1, 12);
}
/** Full months from `from` until `target` (day-aware, so Jul 17 → Mar 1 = 7, not 8). */
function monthsUntil(target: Date, from = new Date()): number {
  let months = monthsBetween(from, target);
  if (target.getDate() < from.getDate()) months -= 1;
  return months;
}

export default function SaveMoney() {
  const { mortgages, updateMortgage, addMortgage, createLead, demo } = useHub();
  const qs = demo ? "?demo=1" : "";
  const primary = mortgages.find((m) => m.is_primary) || mortgages[0];
  const [extra, setExtra] = useState(250);
  const [years, setYears] = useState(10);
  const [edit, setEdit] = useState<Mortgage | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [looksRight, setLooksRight] = useState<null | boolean>(null);
  const [renewalSent, setRenewalSent] = useState(false);

  const breakdown = useMemo(
    () => (primary ? paidBreakdown(primary.original_amount, primary.rate, primary.amort_years, primary.start_date) : null),
    [primary],
  );
  const savings = useMemo(
    () => (primary ? extraPaymentSavings(primary.balance, primary.rate, primary.amort_years, extra) : null),
    [primary, extra],
  );
  // Radar only lights up when a renewal is actually on the horizon (≤18 months out).
  const renewal = useMemo(() => {
    if (!primary?.term_months || !primary.start_date) return null;
    const date = renewalDateOf(primary.start_date, primary.term_months);
    const monthsLeft = monthsUntil(date);
    if (monthsLeft < 0 || monthsLeft > 18) return null;
    const elapsedYears = Math.max(0, monthsBetween(renewalDateOf(primary.start_date, 0), new Date())) / 12;
    const amortLeft = Math.max(5, primary.amort_years - elapsedYears);
    const best = MARKET.rates.reduce((lo, r) => (r.rate < lo.rate ? r : lo));
    const payNow = monthlyPayment(primary.balance, primary.rate, amortLeft);
    const payBest = monthlyPayment(primary.balance, best.rate, amortLeft);
    return { date, monthsLeft, best, payNow, payBest, saves: payNow - payBest };
  }, [primary]);

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Save Money</h1>
          <p className="mt-1 text-sm text-white/70">Your mortgage, decoded — and every honest way to pay less.</p>
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* NO MORTGAGE YET — set up, or celebrate being mortgage-free */}
          {!primary && (
            <section>
              <Card className="p-6">
                <p className="font-bold">Add your mortgage and this page comes alive</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  Rate, balance, lender — that&apos;s all it takes. You&apos;ll get your renewal radar,
                  a principal-vs-interest breakdown, and what an extra $100/mo actually saves you.
                </p>
                <button className="btn btn-primary btn-md mt-4" onClick={() => setAddOpen(true)}>
                  <Plus size={15} /> Add my mortgage
                </button>
                <p className="mt-3 text-xs text-gray-400">
                  Mortgage-free? Beautiful — nothing to do here. A HELOC counts too, if you carry one.
                </p>
              </Card>
            </section>
          )}

          {/* RENEWAL RADAR */}
          {primary && renewal && (
            <section>
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow text-teal-deep">Renewal radar</p>
                  <span className={`tabular inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${renewal.monthsLeft <= 6 ? "bg-amber-50 text-amber-700" : "bg-teal-soft text-teal-deep"}`}>
                    {renewal.monthsLeft === 0 ? "Renews this month" : `Renews in ${renewal.monthsLeft} month${renewal.monthsLeft === 1 ? "" : "s"}`}
                    {" · "}{renewal.date.toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Your <b>{primary.loan_type ?? "mortgage"}</b>{primary.lender ? <> with <b>{primary.lender}</b></> : null} renews{" "}
                  <b>{renewal.date.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</b>. Lenders send their offer
                  4–6 months early — but their first offer is rarely their best.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Payment today</p>
                    <p className="tabular mt-0.5 text-2xl font-extrabold">{cad(renewal.payNow)}<span className="text-xs font-bold text-gray-400">/mo</span></p>
                    <p className="text-xs text-gray-400">at your {primary.rate.toFixed(2)}%</p>
                  </div>
                  <div className="rounded-xl border border-line p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Best posted rate</p>
                    <p className="tabular mt-0.5 text-2xl font-extrabold text-teal">{cad(renewal.payBest)}<span className="text-xs font-bold text-gray-400">/mo</span></p>
                    <p className="text-xs text-gray-400">at {renewal.best.rate.toFixed(2)}% · {renewal.best.label}</p>
                  </div>
                </div>
                <p className={`mt-3 text-sm font-bold ${renewal.saves >= 1 ? "text-emerald-600" : "text-amber-600"}`}>
                  {renewal.saves >= 1
                    ? `≈ ${cad(renewal.saves)}/mo less at today's best posted rate`
                    : "Rates are higher now — locking early could protect you."}
                </p>
                {renewalSent ? (
                  <div className="mt-4 rounded-xl bg-teal-soft p-3 text-center">
                    <p className="text-sm font-extrabold text-teal-deep">Message sent ✓</p>
                    <p className="mt-0.5 text-[12px] text-teal-deep/80">
                      {demo ? "In your real hub this alerts your advisor instantly." : "Your advisor will reach out with a renewal game plan."}
                    </p>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-md mt-4 w-full sm:w-auto"
                    onClick={async () => { await createLead("loan", "Renewal coming up — wants a renewal strategy"); setRenewalSent(true); }}
                  >
                    Plan my renewal
                  </button>
                )}
              </Card>
            </section>
          )}

          {/* PAYMENT BREAKDOWN */}
          {primary && breakdown && (
            <section>
              <SectionLabel right={<button className="link text-xs" onClick={() => setEdit(primary)}>Update mortgage</button>}>
                Mortgage payment breakdown
              </SectionLabel>
              <Card className="p-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
                  <div className="text-center sm:text-right">
                    <p className="text-sm font-semibold text-gray-500">Toward principal</p>
                    <p className="tabular text-3xl font-extrabold text-teal">{cad(breakdown.principalPaid)}</p>
                    <p className="mx-auto mt-1 max-w-[180px] text-xs text-gray-400 sm:mx-0">what you&apos;ve actually paid off so far</p>
                  </div>
                  <Donut a={breakdown.principalPaid} b={breakdown.interestPaid} />
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-semibold text-gray-500">Toward interest</p>
                    <p className="tabular text-3xl font-extrabold text-teal-deep">{cad(breakdown.interestPaid)}</p>
                    <p className="mx-auto mt-1 max-w-[180px] text-xs text-gray-400 sm:mx-0">what borrowing has cost you so far</p>
                  </div>
                </div>
                <p className="mt-5 border-t border-line pt-4 text-center text-sm text-gray-600">
                  At this pace you&apos;ll pay about <b>{cad(breakdown.lifetimeInterest)}</b> in interest over the life of this loan.
                  Extra payments or a sharper renewal rate can shrink that number dramatically.
                </p>
              </Card>
            </section>
          )}

          {/* EXTRA PAYMENTS */}
          {primary && savings && (
            <section>
              <SectionLabel>Make extra payments &amp; save</SectionLabel>
              <Card className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold">Pay a little more each month</p>
                  <p className="mt-1 text-sm text-gray-500">Extra payments go straight at the principal — no interest, no mercy.</p>
                  <div className="mt-4">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Extra payment amount</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <input type="range" min={50} max={1000} step={50} value={extra}
                        onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[var(--teal)]" />
                      <span className="tabular w-20 shrink-0 rounded-lg bg-teal-soft px-2 py-1 text-center font-extrabold text-teal-deep">{cad(extra)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-8 sm:flex-col sm:gap-4 sm:text-right">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Interest saved</p>
                    <p className="tabular text-2xl font-extrabold text-emerald-600">{cad(savings.moneySaved)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Paid off</p>
                    <p className="tabular text-2xl font-extrabold">{Math.floor(savings.monthsFaster / 12)}y {savings.monthsFaster % 12}m faster</p>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* RATES */}
          <section>
            <SectionLabel>Today&apos;s rates</SectionLabel>
            <Card className="grid gap-6 p-6 sm:grid-cols-[1fr_200px]">
              <div><Sparkline data={MARKET.rateHistory} color="var(--navy)" /></div>
              <div className="space-y-2 text-sm">
                {MARKET.rates.map((r) => (
                  <div key={r.label} className="flex items-center justify-between border-b border-line pb-1.5 last:border-0">
                    <span className="font-semibold text-gray-600">{r.label}</span>
                    <span className="tabular font-extrabold">{r.rate.toFixed(2)}%</span>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-gray-400">Sample posted rates for planning — your broker will beat the sticker.</p>
              </div>
            </Card>
          </section>

          {/* RENEWAL / REFI SCENARIOS */}
          {primary && (
            <section id="scenarios" className="scroll-mt-20">
              <SectionLabel>Renewal scenarios</SectionLabel>
              <Card className="p-6">
                <p className="font-bold">If you renewed or refinanced today…</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-500">I plan to stay</span>
                  <input type="range" min={1} max={25} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-40 accent-[var(--teal)]" />
                  <span className="tabular rounded-lg bg-teal-soft px-2 py-1 text-sm font-extrabold text-teal-deep">{years} years</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {REFI_PRODUCTS.map((p) => {
                    const s = refiScenario(primary.balance, primary.rate, primary.amort_years, p, years);
                    const good = s.delta > 0;
                    return (
                      <div key={p.label} className="rounded-xl border border-line p-4">
                        <p className="text-sm font-bold">{p.label}</p>
                        <p className={`tabular mt-1 text-2xl font-extrabold ${good ? "text-emerald-600" : "text-coral"}`}>
                          {cad(s.newPayment)}<span className="text-xs font-bold text-gray-400">/mo</span>
                        </p>
                        <p className="text-xs text-gray-400">{p.rate.toFixed(2)}% · 25-yr amortization</p>
                        <p className={`mt-2 text-xs font-bold ${good ? "text-emerald-600" : "text-coral"}`}>
                          {good ? `Saves ~${cad(Math.abs(s.delta))} over ${years} yrs` : `Costs ~${cad(Math.abs(s.delta))} more over ${years} yrs`}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-xs text-gray-400">
                  Comparisons vs. keeping your current {primary.rate.toFixed(2)}% loan. Estimates only — real quotes come from a human.
                </p>
              </Card>
            </section>
          )}
        </div>

        {/* RAIL */}
        <aside className="space-y-6">
          <section>
            <SectionLabel right={<button className="link text-xs" onClick={() => setAddOpen(true)}>+ Add a loan</button>}>My mortgage</SectionLabel>
            <Card className="divide-y divide-line">
              {mortgages.length === 0 && (
                <div className="p-5">
                  <p className="text-sm font-bold">No loans tracked yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Add your mortgage or HELOC and we&apos;ll track the payoff, watch your renewal window,
                    and flag when a better rate is worth a call.
                  </p>
                  <button className="btn btn-ghost btn-sm mt-3" onClick={() => setAddOpen(true)}><Plus size={14} /> Add a loan</button>
                </div>
              )}
              {mortgages.map((m) => {
                const paid = m.original_amount - m.balance;
                return (
                  <div key={m.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{m.loan_type}</p>
                      <span className="tabular rounded-md bg-gray-100 px-2 py-0.5 text-sm font-extrabold">{m.rate.toFixed(2)}%</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.lender}</p>
                    <Progress value={(paid / (m.original_amount || 1)) * 100} className="mt-3" />
                    <div className="mt-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-teal-deep">{cad(paid)} paid</span>
                      <span className="text-gray-400">{cad(m.balance)} balance</span>
                    </div>
                    <button className="link mt-2 text-xs" onClick={() => setEdit(m)}>Update</button>
                  </div>
                );
              })}
              {mortgages.length > 0 && (
                <div className="flex items-center justify-between p-4 text-sm">
                  <span className="font-semibold text-gray-500">Does this look right?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setLooksRight(true)} className={`btn btn-sm ${looksRight === true ? "btn-primary" : "btn-ghost"}`}><ThumbsUp size={14} /> Yes</button>
                    <button onClick={() => setLooksRight(false)} className={`btn btn-sm ${looksRight === false ? "btn-dark" : "btn-ghost"}`}><ThumbsDown size={14} /> No</button>
                  </div>
                </div>
              )}
              {looksRight === false && (
                <p className="px-5 pb-4 text-xs text-gray-500">Tap <b>Update</b> on any loan to correct the balance or rate — the math updates instantly.</p>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Improve cash flow</SectionLabel>
            <Card className="divide-y divide-line text-sm font-semibold">
              {/* "Renew at a better rate": jump to the scenarios below — or start by adding the loan. */}
              {primary ? (
                <a href="#scenarios" className="flex items-center justify-between p-4 text-gray-700 transition hover:bg-gray-50">
                  <span>Renew at a better rate<span className="block text-[11px] font-normal text-gray-400">compare today&apos;s rates against yours</span></span>
                  <span className="text-gray-300">›</span>
                </a>
              ) : (
                <button onClick={() => setAddOpen(true)} className="flex w-full items-center justify-between p-4 text-left text-gray-700 transition hover:bg-gray-50">
                  <span>Renew at a better rate<span className="block text-[11px] font-normal text-gray-400">add your mortgage to compare rates</span></span>
                  <span className="text-gray-300">›</span>
                </button>
              )}
              <Link href={`/hub/manage${qs}`} className="flex items-center justify-between p-4 text-gray-700 transition hover:bg-gray-50">
                <span>Increase your home value<span className="block text-[11px] font-normal text-gray-400">upkeep now beats repairs later</span></span>
                <span className="text-gray-300">›</span>
              </Link>
              <Link href={`/hub/wealth${qs}`} className="flex items-center justify-between p-4 text-gray-700 transition hover:bg-gray-50">
                <span>Rent out a suite<span className="block text-[11px] font-normal text-gray-400">what your space could earn monthly</span></span>
                <span className="text-gray-300">›</span>
              </Link>
              <Link href={`/hub/sell${qs}`} className="flex items-center justify-between p-4 text-gray-700 transition hover:bg-gray-50">
                <span>Downsize on your timeline<span className="block text-[11px] font-normal text-gray-400">see what selling would free up</span></span>
                <span className="text-gray-300">›</span>
              </Link>
            </Card>
          </section>
        </aside>
      </div>

      {/* EDIT MORTGAGE */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Update mortgage">
        {edit && (
          <MortgageForm
            initial={edit}
            onSave={async (vals) => { await updateMortgage({ ...vals, id: edit.id }); setEdit(null); }}
          />
        )}
      </Modal>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a loan">
        <MortgageForm
          initial={{ id: "", lender: "", loan_type: "HELOC", rate: 5.45, amort_years: 25, start_date: new Date().toISOString().slice(0, 10), original_amount: 50000, balance: 50000, is_primary: false }}
          onSave={async (vals) => { await addMortgage(vals); setAddOpen(false); }}
        />
      </Modal>
    </div>
  );
}

function MortgageForm({ initial, onSave }: { initial: Mortgage; onSave: (m: Omit<Mortgage, "id" | "is_primary">) => Promise<void> }) {
  const [f, setF] = useState({ ...initial });
  const est = monthlyPayment(f.balance || 0, f.rate || 0, f.amort_years || 25);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lender"><input className="input" value={f.lender ?? ""} onChange={(e) => setF({ ...f, lender: e.target.value })} /></Field>
        <Field label="Type">
          <select className="input" value={f.loan_type ?? ""} onChange={(e) => setF({ ...f, loan_type: e.target.value })}>
            {["5-Year Fixed", "3-Year Fixed", "1-Year Fixed", "5-Year Variable", "HELOC"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rate %"><input className="input tabular" type="number" step="0.01" value={f.rate} onChange={(e) => setF({ ...f, rate: Number(e.target.value) })} /></Field>
        <Field label="Amortization (yrs)"><input className="input tabular" type="number" value={f.amort_years} onChange={(e) => setF({ ...f, amort_years: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Original amount"><input className="input tabular" type="number" value={f.original_amount} onChange={(e) => setF({ ...f, original_amount: Number(e.target.value) })} /></Field>
        <Field label="Current balance"><input className="input tabular" type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Start date"><input className="input" type="date" value={f.start_date?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-sm text-gray-600">Estimated payment: <b className="tabular">{cad(est)}/mo</b></p>
      <button className="btn btn-primary btn-lg w-full" onClick={() => onSave(f)}>Save</button>
    </div>
  );
}
