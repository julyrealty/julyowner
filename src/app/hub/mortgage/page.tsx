"use client";
// Buyer-side mortgage tools. Deliberately does NOT invent an insurance premium
// or quote a live rate — it models principal and interest, shows the sample
// rate strip honestly, and hands the exact numbers to a broker.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info, TrendingDown, Calculator, ShieldAlert } from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, monthlyPayment } from "@/lib/calc";
import { MARKET } from "@/lib/demo";
import { Card, SectionLabel, Field, Pill } from "@/components/ui";

const AMORTS = [15, 20, 25, 30];

export default function MortgageTools() {
  const { createLead, demo } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const [price, setPrice] = useState(850000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.19);
  const [amort, setAmort] = useState(25);
  const [sent, setSent] = useState(false);

  const down = Math.round((price * downPct) / 100);
  const loan = Math.max(0, price - down);
  const payment = useMemo(() => monthlyPayment(loan, rate, amort), [loan, rate, amort]);
  const insured = downPct < 20;

  // Same loan at each amortization — the trade-off people never see laid out.
  const byAmort = useMemo(
    () => AMORTS.map((a) => ({ years: a, pay: monthlyPayment(loan, rate, a) })),
    [loan, rate],
  );
  // What a rate move actually costs, in dollars per month on this loan.
  const byRate = useMemo(() => {
    const steps = [-1, -0.5, 0, 0.5, 1, 1.5, 2];
    return steps.map((d) => ({ delta: d, r: Math.max(0.5, rate + d), pay: monthlyPayment(loan, Math.max(0.5, rate + d), amort) }));
  }, [loan, rate, amort]);

  async function askBroker() {
    await createLead("loan",
      `Mortgage question — modelling ${cad(price)} with ${downPct}% down (${cad(down)}), ${rate}% over ${amort} years ≈ ${cad(payment)}/mo. Would like a real pre-approval.`);
    setSent(true);
  }

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">Mortgage</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">What it actually costs per month.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Move the numbers around until the payment feels right. Then take it to a broker and get the
            real one — this is the map, not the territory.
          </p>
        </div>
      </section>

      {/* min-w-0: grid items default to min-width:auto, which lets the rate
          strip and number inputs blow the column past the viewport on mobile. */}
      <div className="container-x grid min-w-0 gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* CALCULATOR */}
          <section>
            <SectionLabel>Payment calculator</SectionLabel>
            <Card className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Purchase price">
                  <input type="number" min={100000} step={5000} className="input tabular" value={price}
                    onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
                </Field>
                <Field label={`Down payment — ${downPct}% (${cad(down)})`}>
                  <input type="range" min={5} max={50} step={1} value={downPct}
                    onChange={(e) => setDownPct(Number(e.target.value))}
                    className="mt-3 w-full accent-[var(--teal)]" />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={`Rate — ${rate.toFixed(2)}%`}>
                  <input type="range" min={2} max={9} step={0.05} value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="mt-3 w-full accent-[var(--teal)]" />
                </Field>
                <Field label="Amortization">
                  <select className="input" value={amort} onChange={(e) => setAmort(Number(e.target.value))}>
                    {AMORTS.map((a) => <option key={a} value={a}>{a} years</option>)}
                  </select>
                </Field>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-teal-soft p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal-deep/70">Monthly payment</p>
                  <p className="tabular mt-1 text-2xl font-extrabold text-teal-deep">{cad(payment)}</p>
                </div>
                <div className="rounded-xl border border-line p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Mortgage amount</p>
                  <p className="tabular mt-1 text-2xl font-extrabold">{cad(loan)}</p>
                </div>
                <div className="rounded-xl border border-line p-4 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Down payment</p>
                  <p className="tabular mt-1 text-2xl font-extrabold">{cad(down)}</p>
                </div>
              </div>

              <p className="mt-3 flex gap-2 text-[12px] leading-relaxed text-gray-500">
                <Info size={14} className="mt-0.5 shrink-0 text-teal-deep" />
                Principal and interest only. Property tax, strata fees, heat and insurance are on top —
                and lenders count those when they qualify you.
              </p>

              {insured && (
                <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                  Under 20% down, mortgage default insurance is required and gets added to the loan, so
                  your real payment is higher than this. The premium depends on your down payment band —
                  your broker gives you the exact figure.
                </p>
              )}
            </Card>
          </section>

          {/* AMORTIZATION TRADE-OFF */}
          <section>
            <SectionLabel>Same loan, different amortization</SectionLabel>
            <Card className="divide-y divide-line">
              {byAmort.map((a) => {
                const diff = a.pay - payment;
                return (
                  <div key={a.years} className="flex items-center justify-between gap-3 p-4">
                    <span className="text-sm font-bold">{a.years} years</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular text-sm font-extrabold">{cad(a.pay)}<span className="text-[11px] font-bold text-gray-400">/mo</span></span>
                      {a.years !== amort && (
                        <span className={`tabular w-24 text-right text-[12px] font-bold ${diff < 0 ? "text-emerald-600" : "text-coral"}`}>
                          {diff < 0 ? "−" : "+"}{cad(Math.abs(diff))}
                        </span>
                      )}
                      {a.years === amort && <span className="w-24 text-right text-[12px] font-bold text-gray-400">selected</span>}
                    </span>
                  </div>
                );
              })}
            </Card>
            <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
              A longer amortization lowers the payment and raises the total interest — sometimes by a
              lot. Shorter is cheaper overall if the payment is comfortable.
            </p>
          </section>

          {/* RATE SENSITIVITY — the scroll */}
          <section>
            <SectionLabel>If rates move</SectionLabel>
            <Card className="p-5">
              <p className="text-[13px] leading-relaxed text-gray-600">
                Your term ends long before the mortgage does, so the rate you renew at matters as much as
                the one you start with. On a {cad(loan)} loan over {amort} years:
              </p>
              <div className="no-bar mt-4 flex gap-3 overflow-x-auto pb-1">
                {byRate.map((b) => {
                  const diff = b.pay - payment;
                  const now = b.delta === 0;
                  return (
                    <div key={b.delta} className={`min-w-[130px] shrink-0 rounded-xl border p-4 text-center ${now ? "border-teal bg-teal-soft" : "border-line"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wide ${now ? "text-teal-deep/70" : "text-gray-400"}`}>
                        {now ? "Your rate" : `${b.delta > 0 ? "+" : ""}${b.delta}%`}
                      </p>
                      <p className="tabular mt-1 text-lg font-extrabold">{b.r.toFixed(2)}%</p>
                      <p className="tabular text-sm font-bold">{cad(b.pay)}</p>
                      {!now && (
                        <p className={`tabular mt-1 text-[11px] font-bold ${diff < 0 ? "text-emerald-600" : "text-coral"}`}>
                          {diff < 0 ? "−" : "+"}{cad(Math.abs(diff))}/mo
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                Lenders qualify you at a rate above the one you pay — the stress test exists to check you
                could absorb exactly this kind of move.
              </p>
            </Card>
          </section>

          {/* SAMPLE RATES */}
          <section>
            <SectionLabel>Rates for planning</SectionLabel>
            <Card className="p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {MARKET.rates.map((r) => (
                  <button key={r.label} onClick={() => setRate(r.rate)}
                    className="flex items-center justify-between rounded-xl border border-line p-3 text-left transition hover:border-teal">
                    <span className="text-sm font-semibold text-gray-600">{r.label}</span>
                    <span className="tabular text-sm font-extrabold">{r.rate.toFixed(2)}%</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                Sample rates for planning only — not a live quote and not an offer. Tap one to model it.
                A broker shops the real number and it is usually better than anything posted.
              </p>
            </Card>
          </section>
        </div>

        {/* RAIL */}
        <aside className="min-w-0 space-y-6">
          <section>
            <SectionLabel>Get the real number</SectionLabel>
            <Card className="p-5">
              {sent ? (
                <div className="rounded-xl bg-teal-soft p-3 text-center">
                  <p className="text-sm font-extrabold text-teal-deep">Request sent ✓</p>
                  <p className="mt-0.5 text-[12px] text-teal-deep/80">
                    {demo ? "In your real hub this reaches your advisor instantly." : "Your advisor will be in touch."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-gray-600">
                    A pre-approval turns all of this into a number you can actually offer on — and tells
                    you what would break it.
                  </p>
                  <button className="btn btn-primary btn-md mt-3 w-full" onClick={askBroker}>
                    Ask about pre-approval <ArrowRight size={15} />
                  </button>
                  <p className="mt-2 text-[11px] text-gray-400">Sends your current numbers along so nobody starts from scratch.</p>
                </>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Worth reading</SectionLabel>
            <Card className="divide-y divide-line">
              {[
                { slug: "mortgage-basics", t: "Rate, term, amortization", d: "The three numbers people mix up" },
                { slug: "down-payment", t: "What you need for a down payment", d: "Sources, and proving them" },
                { slug: "closing-costs", t: "Closing costs", d: "The bill on top of your down payment" },
                { slug: "buyer-programs", t: "Programmes and rebates", d: "FHSA, HBP, BC exemptions" },
              ].map((g) => (
                <Link key={g.slug} href={`/hub/guides${q ? `${q}&` : "?"}a=${g.slug}`}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-gray-50">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{g.t}</span>
                    <span className="block text-[11px] text-gray-400">{g.d}</span>
                  </span>
                  <span className="shrink-0 text-gray-300">›</span>
                </Link>
              ))}
            </Card>
          </section>

          <section>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <TrendingDown size={15} className="text-teal-deep" /> Buying to rent it out?
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                Investment purchases work differently — bigger down payment, rental income counted
                toward qualifying, different tax treatment.
              </p>
              <a href="https://julyinvestor.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm mt-3">
                JULY Investor <ArrowRight size={14} />
              </a>
            </Card>
          </section>
        </aside>
      </div>

      <div className="container-x pb-10">
        <p className="flex items-center gap-2 text-[11px] leading-relaxed text-gray-400">
          <Calculator size={13} className="shrink-0" />
          Estimates for planning only — not an offer of credit, not financial advice, and not a
          guarantee of approval. Your lender's numbers are the ones that count.
        </p>
      </div>
    </div>
  );
}
