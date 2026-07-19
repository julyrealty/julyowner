"use client";
// Buyer-side mortgage tools.
//
// Rates shown here come from the Bank of Canada (via ho_market_rates, refreshed
// daily) and are labelled for what they are. The conventional-mortgage series
// are POSTED rates — bank sticker prices — and are never presented as a rate
// anyone would be offered. The page still refuses to invent an insurance
// premium: CMHC publishes a range, and the exact band comes from the broker.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight, Info, TrendingDown, Calculator, ShieldAlert,
  ChevronDown, ExternalLink, Landmark, Percent,
} from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, monthlyPayment, minDownPayment, isInsurable, stressRate } from "@/lib/calc";
import { useMarketRates, rateDate } from "@/lib/rates";
import { Card, SectionLabel, Field, Pill } from "@/components/ui";

const AMORTS = [15, 20, 25, 30];

export default function MortgageTools() {
  const { createLead, demo } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const rates = useMarketRates();

  const [price, setPrice] = useState(850000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.19);
  const [amort, setAmort] = useState(25);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState<string | null>("stress-test");

  const down = Math.round((price * downPct) / 100);
  const loan = Math.max(0, price - down);
  const payment = useMemo(() => monthlyPayment(loan, rate, amort), [loan, rate, amort]);
  const insured = downPct < 20;

  // Federal minimums, so the slider can say when a down payment is not merely
  // small but not legal at this price.
  const minDown = minDownPayment(price);
  const belowMinimum = down < Math.floor(minDown);
  const insurable = isInsurable(price);

  // You pay `rate`; you have to prove you could pay this one.
  const qualRate = stressRate(rate);
  const qualPayment = useMemo(() => monthlyPayment(loan, qualRate, amort), [loan, qualRate, amort]);

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

  /* ---------------------------------------------------------------- */
  /* The knowledge section. Every threshold names the authority that   */
  /* sets it, because these are policy numbers and policy changes.     */
  /* ---------------------------------------------------------------- */
  const TOPICS: { id: string; q: string; body: React.ReactNode }[] = [
    {
      id: "stress-test",
      q: "Why the bank qualifies you at a rate you'll never pay",
      body: (
        <>
          <p>
            Lenders have to check you could still carry the mortgage if rates rose. They rerun your
            application at the <strong>higher of your contract rate plus two points, or 5.25%</strong>,
            and your debt ratios have to work at that payment — not the one you actually make.
          </p>
          <p className="mt-2">
            At the {rate.toFixed(2)}% you have modelled above, you would be assessed at{" "}
            <strong>{qualRate.toFixed(2)}%</strong> — a payment of{" "}
            <strong>{cad(qualPayment)}/mo</strong> rather than {cad(payment)}. That gap is the whole
            reason approvals come back smaller than buyers expect.
          </p>
        </>
      ),
    },
    {
      id: "down-payment",
      q: "The minimum down payment is tiered, and there's a cliff",
      body: (
        <>
          <p>
            It is not one percentage. CMHC sets the minimum at <strong>5% of the first $500,000</strong>,{" "}
            <strong>10% of the portion above that</strong>, and <strong>20% once the price reaches
            $1.5 million</strong> — because default insurance stops being available at that point.
          </p>
          <p className="mt-2">
            That last step is a cliff, not a slope. A <strong>$1,499,999</strong> home can be bought
            with about <strong>$125,000</strong> down. A <strong>$1,500,000</strong> home needs{" "}
            <strong>$300,000</strong>. One dollar of price adds $175,000 to what you must have in cash.
            If you are shopping near that line, it is worth knowing exactly where it sits.
          </p>
          <p className="mt-2 text-gray-500">
            At {cad(price)}, the minimum is <strong>{cad(minDown)}</strong>.
          </p>
        </>
      ),
    },
    {
      id: "insurance",
      q: "What mortgage default insurance actually is",
      body: (
        <>
          <p>
            Under 20% down it is mandatory, and it protects <em>the lender</em>, not you. CMHC prices it
            as a percentage of the mortgage — it publishes a range of roughly{" "}
            <strong>0.6% to 4.5%</strong>, with the exact band set by how much you put down. It is
            normally added to the loan rather than paid up front, so you pay interest on it for the
            life of the mortgage.
          </p>
          <p className="mt-2">
            The counterintuitive part: because the lender&apos;s risk is covered, insured mortgages often
            carry <em>lower</em> rates than uninsured ones. Putting down 20% avoids the premium but can
            mean a slightly higher rate. Worth pricing both ways rather than assuming.
          </p>
        </>
      ),
    },
    {
      id: "amortization",
      q: "25 years or 30 — and who is allowed 30",
      body: (
        <>
          <p>
            Amortization is how long the whole loan takes to reach zero. With default insurance the
            standard maximum is <strong>25 years</strong>. CMHC allows <strong>30 years</strong> if you
            are a first-time buyer or buying a newly built home.
          </p>
          <p className="mt-2">
            Thirty years lowers the monthly payment and raises the total interest, often by a lot. The
            table above shows the trade-off on your own numbers rather than in the abstract.
          </p>
        </>
      ),
    },
    {
      id: "fixed-variable",
      q: "Fixed or variable — and the question to ask about variable",
      body: (
        <>
          <p>
            Fixed locks your rate for the term. Variable is quoted against <strong>prime</strong>
            {rates?.prime ? <> — currently <strong>{rates.prime.value.toFixed(2)}%</strong></> : null} as
            &ldquo;prime minus a discount&rdquo;, so it moves when the Bank of Canada moves.
          </p>
          <p className="mt-2">
            The question almost nobody asks: <strong>when prime rises, does my payment rise, or does
            more of my payment go to interest?</strong> Some variable products hold the payment steady
            and shift the split; others change the payment itself. They feel very different in a rising
            market, and the difference is not always obvious in the paperwork.
          </p>
        </>
      ),
    },
    {
      id: "term",
      q: "Term and amortization are not the same number",
      body: (
        <>
          <p>
            The <strong>term</strong> is how long your contract lasts — commonly five years. The{" "}
            <strong>amortization</strong> is how long until the balance is gone — commonly twenty-five.
            When the term ends you renew whatever is left, at whatever rates exist then.
          </p>
          <p className="mt-2">
            So most buyers renew four or five times before owning the place outright. The rate you
            renew at matters as much as the one you sign, which is what the strip above is showing you.
          </p>
        </>
      ),
    },
    {
      id: "penalty",
      q: "Breaking early: the cost most buyers find out about too late",
      body: (
        <>
          <p>
            Most closed mortgages charge a penalty to break. On a variable it is usually{" "}
            <strong>three months&apos; interest</strong>. On a fixed it is the greater of three
            months&apos; interest or the <strong>interest rate differential</strong> — roughly the
            lender&apos;s lost interest over the rest of your term.
          </p>
          <p className="mt-2">
            Here is the trap. The Financial Consumer Agency of Canada notes that lenders may calculate
            that differential using the <strong>posted rate at the time you signed, minus the discount
            you were given</strong> — not the rate you actually pay. A large discount at signing can
            quietly mean a much larger penalty later.
          </p>
          <p className="mt-2">
            Ask, before you sign, exactly how the lender calculates it, and get the answer in writing.
            Life happens inside a five-year term more often than people plan for.
          </p>
        </>
      ),
    },
    {
      id: "pre-approval",
      q: "Pre-qualified, pre-approved, and actually approved",
      body: (
        <>
          <p>
            A <strong>pre-qualification</strong> is an estimate based on numbers you told someone. A{" "}
            <strong>pre-approval</strong> means a lender verified your income, down payment and credit,
            and usually holds a rate for a set window — ask yours how long, as it varies.
          </p>
          <p className="mt-2">
            Neither is final approval. That depends on the specific property: the appraisal has to
            support the price, and for a strata the building&apos;s finances get reviewed too. A
            pre-approval tells you what you can offer; it does not promise the lender will fund every
            home you might pick.
          </p>
        </>
      ),
    },
    {
      id: "ratios",
      q: "The two ratios that decide your number",
      body: (
        <>
          <p>
            Lenders test how much of your gross income the housing costs eat (the gross debt service
            ratio), then how much <em>all</em> your debt payments eat (total debt service). Housing
            costs include the mortgage, property tax, heat, and half of any strata fee. CMHC&apos;s
            guidelines put the usual ceilings near <strong>39%</strong> and <strong>44%</strong>,
            though lenders differ — your broker knows which apply to you.
          </p>
          <p className="mt-2">
            The practical consequence: clearing a car payment can raise your approval more than saving
            another few thousand for the down payment. If you are close to the edge, ask your broker
            which lever moves your number most before you do either.
          </p>
        </>
      ),
    },
  ];

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

              {/* The number that decides the approval, next to the one you pay. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line p-3">
                <span className="min-w-0 text-[12px] leading-relaxed text-gray-600">
                  <strong>Qualifies at {qualRate.toFixed(2)}%</strong> — lenders test you at your rate
                  plus two points (floor 5.25%).
                </span>
                <span className="tabular shrink-0 text-sm font-extrabold">{cad(qualPayment)}<span className="text-[11px] font-bold text-gray-400">/mo</span></span>
              </div>

              <p className="mt-3 flex gap-2 text-[12px] leading-relaxed text-gray-500">
                <Info size={14} className="mt-0.5 shrink-0 text-teal-deep" />
                Principal and interest only. Property tax, strata fees, heat and insurance are on top —
                and lenders count those when they qualify you.
              </p>

              {belowMinimum && (
                <p className="mt-2 flex gap-2 rounded-xl bg-coral/10 p-3 text-[12px] leading-relaxed text-coral">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                  <span>
                    At {cad(price)} the minimum down payment is <strong>{cad(minDown)}</strong>
                    {insurable ? " (5% of the first $500K, 10% above)" : " — 20%, because default insurance is not available at $1.5M or more"}.
                    {" "}This scenario is below it, so no lender could write it.
                  </span>
                </p>
              )}

              {insured && !belowMinimum && (
                <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                  <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                  Under 20% down, mortgage default insurance is required and gets added to the loan, so
                  your real payment is higher than this. The premium depends on your down payment band —
                  your broker gives you the exact figure.
                </p>
              )}
            </Card>
          </section>

          {/* LIVE PUBLISHED RATES */}
          <section>
            <SectionLabel>Published rates</SectionLabel>
            <Card className="p-5">
              {rates === null ? (
                <p className="text-[13px] text-gray-400">Loading the latest published rates…</p>
              ) : !rates.prime && rates.posted.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-gray-500">
                  Published rates aren&apos;t available right now. Your broker has today&apos;s real
                  numbers either way.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[13px] font-bold">
                      <Landmark size={15} className="text-teal-deep" /> Bank of Canada
                    </p>
                    <Pill tone="gray">as at {rateDate(rates.observedOn)}</Pill>
                  </div>

                  {rates.prime && (
                    <div className="mt-4 rounded-xl bg-teal-soft p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-extrabold text-teal-deep">Prime rate</p>
                        <p className="tabular text-2xl font-extrabold text-teal-deep">{rates.prime.value.toFixed(2)}%</p>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-teal-deep/80">
                        Variable mortgages are quoted against this, as &ldquo;prime minus a discount&rdquo;.
                        When the Bank of Canada moves, this moves, and so does a variable payment.
                      </p>
                    </div>
                  )}

                  {rates.posted.length > 0 && (
                    <>
                      <p className="section-label mt-5 mb-2">Posted fixed rates</p>
                      <div className="grid grid-cols-3 gap-2">
                        {rates.posted.map((r) => (
                          <div key={r.series_id} className="min-w-0 rounded-xl border border-line p-3 text-center">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{r.term_years}-year</p>
                            <p className="tabular mt-1 text-lg font-extrabold">{r.value.toFixed(2)}%</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
                        <Percent size={15} className="mt-0.5 shrink-0" />
                        <span>
                          <strong>These are not the rates you would be offered.</strong> Posted rates are
                          the sticker price chartered banks advertise; negotiated rates run well below
                          them. They still matter twice: your discount is quoted off this number, and if
                          you break the mortgage early your penalty may be calculated from the posted
                          rate at signing minus that discount.
                        </span>
                      </p>
                    </>
                  )}

                  <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                    Published by the Bank of Canada and refreshed here daily. Not an offer of credit.
                    For what a lender would actually give <em>you</em>, ask your broker — or compare the
                    market yourself at{" "}
                    <a href="https://www.ratehub.ca/mortgages" target="_blank" rel="noopener noreferrer" className="link">
                      Ratehub <ExternalLink size={10} className="inline" />
                    </a>.
                  </p>
                </>
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

          {/* KNOWLEDGE */}
          <section>
            <SectionLabel>How mortgages actually work here</SectionLabel>
            <Card className="divide-y divide-line">
              {TOPICS.map((t) => {
                const isOpen = open === t.id;
                return (
                  <div key={t.id}>
                    <button
                      onClick={() => setOpen(isOpen ? null : t.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-gray-50"
                    >
                      <span className="min-w-0 text-sm font-bold">{t.q}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-[13px] leading-relaxed text-gray-600">{t.body}</div>
                    )}
                  </div>
                );
              })}
            </Card>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              Thresholds here are federal policy set by CMHC and the Financial Consumer Agency of
              Canada, current as at July 2026. They do change — your broker confirms what applies on
              the day you apply.
            </p>
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
          guarantee of approval. Your lender&apos;s numbers are the ones that count.
        </p>
      </div>
    </div>
  );
}
