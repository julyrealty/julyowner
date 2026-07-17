"use client";
import { useMemo, useState } from "react";
import { useHub, Mortgage } from "@/lib/store";
import { cad, paidBreakdown, extraPaymentSavings, refiScenario, monthlyPayment } from "@/lib/calc";
import { MARKET, REFI_PRODUCTS } from "@/lib/demo";
import { Card, SectionLabel, Modal, Field, Progress } from "@/components/ui";
import { Donut, Sparkline } from "@/components/charts";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export default function SaveMoney() {
  const { mortgages, updateMortgage, addMortgage } = useHub();
  const primary = mortgages.find((m) => m.is_primary) || mortgages[0];
  const [extra, setExtra] = useState(250);
  const [years, setYears] = useState(10);
  const [edit, setEdit] = useState<Mortgage | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [looksRight, setLooksRight] = useState<null | boolean>(null);

  const breakdown = useMemo(
    () => (primary ? paidBreakdown(primary.original_amount, primary.rate, primary.amort_years, primary.start_date) : null),
    [primary],
  );
  const savings = useMemo(
    () => (primary ? extraPaymentSavings(primary.balance, primary.rate, primary.amort_years, extra) : null),
    [primary, extra],
  );

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
            <section>
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
              <div className="flex items-center justify-between p-4 text-sm">
                <span className="font-semibold text-gray-500">Does this look right?</span>
                <div className="flex gap-2">
                  <button onClick={() => setLooksRight(true)} className={`btn btn-sm ${looksRight === true ? "btn-primary" : "btn-ghost"}`}><ThumbsUp size={14} /> Yes</button>
                  <button onClick={() => setLooksRight(false)} className={`btn btn-sm ${looksRight === false ? "btn-dark" : "btn-ghost"}`}><ThumbsDown size={14} /> No</button>
                </div>
              </div>
              {looksRight === false && (
                <p className="px-5 pb-4 text-xs text-gray-500">Tap <b>Update</b> on any loan to correct the balance or rate — the math updates instantly.</p>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Improve cash flow</SectionLabel>
            <Card className="divide-y divide-line text-sm font-semibold">
              {["Renew at a better rate", "Increase your home value", "Rent out a suite", "Downsize on your timeline"].map((x) => (
                <div key={x} className="flex items-center justify-between p-4 text-gray-700">
                  {x} <span className="text-gray-300">›</span>
                </div>
              ))}
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
