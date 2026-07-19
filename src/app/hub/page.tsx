"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Clock, Mail, Phone, ArrowRight } from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, compact, fmtDate, valueSeries } from "@/lib/calc";
import { fetchCityMarket, type CityMarket } from "@/lib/platform";
import { MARKET, ARTICLES } from "@/lib/demo";
import { Card, SectionLabel, Progress, Avatar, Modal } from "@/components/ui";
import { Sparkline, CompareBars } from "@/components/charts";
import { useEffect, useMemo, useState } from "react";

export default function HubDashboard() {
  const { hub, mortgages, tasks, profile, pro, advisor, setTaskStatus, createLead, demo } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const [leadModal, setLeadModal] = useState<null | "sell" | "loan">(null);
  const [leadDone, setLeadDone] = useState(false);
  const [leadMsg, setLeadMsg] = useState("");
  const [liveMarket, setLiveMarket] = useState<CityMarket[] | null>(null);
  useEffect(() => {
    if (demo || !hub?.city) return;
    let cancelled = false;
    fetchCityMarket(hub.city).then((rows) => { if (!cancelled) setLiveMarket(rows); });
    return () => { cancelled = true; };
  }, [demo, hub?.city]);

  // Buyer hubs (search HQs) have no home to dashboard — their home base is Buying HQ.
  useEffect(() => {
    if (hub?.journey === "buying") window.location.replace(`/hub/buying${q}`);
  }, [hub?.journey, q]);

  const value = hub?.home_value ?? 0;
  const balance = mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const equity = Math.max(0, value - balance);
  const equityPct = value ? equity / value : 0;
  const gain = value - (hub?.purchase_price ?? value);
  const nextTasks = tasks.filter((t) => t.status === "pending").slice(0, 3);
  // A freshly claimed hub has never had a task — that's "not set up yet", not "all done".
  const freshHub = tasks.length === 0;
  const noMortgage = mortgages.length === 0;
  // Without a purchase date there is no real trend to draw; don't invent a decade of it.
  const canChart = !!hub?.purchase_date && !!hub?.purchase_price;
  const series = useMemo(
    () => (hub && hub.purchase_date && hub.purchase_price ? valueSeries(hub.purchase_price, hub.purchase_date, value) : []),
    [hub, value],
  );
  const potential = Math.round(value * 1.11);

  async function sendLead() {
    if (!leadModal) return;
    await createLead(leadModal, leadMsg || (leadModal === "sell" ? "Interested in selling" : "Interested in financing"));
    setLeadDone(true);
  }

  return (
    <div>
      {/* Teal welcome banner */}
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x flex flex-col gap-6 py-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome home, <span className="text-[#bfe8e0]">{profile?.first_name || "friend"}</span>
            </h1>
            <p className="mt-1 text-sm text-white/70">Here&apos;s what your home has been up to.</p>
          </div>
          <Card className="w-full max-w-sm p-5 text-ink">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-bold">{hub?.unit ? `#${hub.unit} – ` : ""}{hub?.address1}</p>
              {(hub?.journey === "selling" || hub?.journey === "sold") && (
                <span className="shrink-0 rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-extrabold text-coral">
                  {hub?.journey === "sold" ? "Sold" : "Selling"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{[hub?.city, hub?.region, hub?.postal].filter(Boolean).join(", ")}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/hub/sell${q}`} className="btn btn-primary btn-sm">
                {hub?.journey === "selling" || hub?.journey === "sold" ? "My selling plan" : "Sell my home"}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={() => { setLeadDone(false); setLeadModal("loan"); }}>Get a loan</button>
            </div>
            <Link href={`/hub/buying${q}`} className="link mt-3 block text-center text-xs">
              Shopping for your next home? → Buying HQ
            </Link>
          </Card>
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        {/* MAIN COLUMN */}
        <div className="space-y-6">
          {/* WHAT'S NEXT */}
          <section>
            <SectionLabel right={<Link href={`/hub/manage${q}`} className="link text-xs">View all</Link>}>What&apos;s next</SectionLabel>
            <div className="space-y-2">
              {nextTasks.length === 0 && (freshHub ? (
                <Card className="p-5">
                  <p className="text-sm font-bold">Let&apos;s get your home set up</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                    Add your furnace, water heater, and appliances and this list fills itself — each item
                    brings its own maintenance schedule, so nothing creeps up on you.
                  </p>
                  <Link href={`/hub/home/inventory${q}`} className="btn btn-primary btn-sm mt-3">
                    Start my home inventory <ArrowRight size={14} />
                  </Link>
                </Card>
              ) : (
                <Card className="p-5 text-sm text-gray-500">All caught up. Your home thanks you. 🏡</Card>
              ))}
              {nextTasks.map((t) => (
                <Card key={t.id} className="flex items-center gap-3 p-4">
                  <button
                    aria-label="Mark done"
                    onClick={() => setTaskStatus(t.id, "done")}
                    className="h-5 w-5 shrink-0 rounded-full border-2 border-teal transition hover:bg-teal"
                    title="Mark done"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{t.title}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-400">
                    <Clock size={13} /> {t.minutes} min
                  </span>
                  <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 sm:block">{t.difficulty}</span>
                  <ChevronRight size={16} className="shrink-0 text-gray-300" />
                </Card>
              ))}
              <p className="pt-1 text-center text-xs text-gray-400">
                Want someone to do these for you? <Link href={`/hub/services${q}`} className="link">Find help</Link>
              </p>
            </div>
          </section>

          {/* MARKET FEED — demo shows the seeded Arbutus story; live hubs get their own city */}
          <section>
            <SectionLabel>Your market — {demo ? MARKET.area : (hub?.city || "your area")}</SectionLabel>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold">Home values in {demo ? MARKET.cityLine : (hub?.city || "your area")}</p>
                  {demo ? (
                    <p className="mt-0.5 text-sm text-gray-500">
                      Homes here are selling in about <b>{MARKET.daysOnMarket} days</b> at <b>{(MARKET.listToSale * 100).toFixed(1)}%</b> of asking.
                    </p>
                  ) : liveMarket && liveMarket.length > 0 ? (
                    <p className="mt-0.5 text-sm text-gray-500">
                      {liveMarket.slice(0, 2).map((r, i) => (
                        <span key={r.property_class ?? i}>
                          {i > 0 && " · "}
                          <b>{r.active_count ?? "—"}</b> {(r.property_class && r.property_class !== "all" ? r.property_class : "homes")} active
                          {r.median_list_price ? <> at a <b>{compact(r.median_list_price)}</b> median ask</> : null}
                        </span>
                      ))}
                      <span className="text-gray-400"> · live from JULY Search</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-gray-500">Your value trend since purchase.</p>
                  )}
                </div>
              </div>
              {canChart && (
                <>
                  <div className="mt-3"><Sparkline data={series} /></div>
                  <p className="mt-1 text-right text-[11px] text-gray-400">since you bought in {fmtDate(hub!.purchase_date!).split(",")[1]}</p>
                </>
              )}
            </Card>
            {demo && (
              <Card className="mt-3 p-5">
                <p className="font-bold">Recent sales nearby</p>
                <div className="mt-3 divide-y divide-line">
                  {MARKET.recentSales.slice(0, 4).map((s) => (
                    <div key={s.address} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-[74px] shrink-0 rounded-md bg-red-50 px-2 py-1 text-center text-[12px] font-extrabold text-coral tabular">
                        {compact(s.price)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{s.address}</span>
                      <span className="shrink-0 text-xs text-gray-400">{fmtDate(s.date)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>

          {/* IMPROVE */}
          <section>
            <SectionLabel right={<Link href={`/hub/wealth${q}`} className="link text-xs">View improvements</Link>}>Get stuff done</SectionLabel>
            <Card className="flex items-center gap-5 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-bold">Improve your home</p>
                <div className="mt-2 flex gap-8 text-sm">
                  <div><p className="text-gray-400">Current value</p><p className="tabular font-extrabold">{cad(value)}</p></div>
                  <div><p className="text-gray-400">Potential value</p><p className="tabular font-extrabold text-emerald-600">{cad(potential)}</p></div>
                </div>
                <Link href={`/hub/wealth${q}`} className="link mt-2 inline-block text-sm">See improvements</Link>
              </div>
              <CompareBars current={value} potential={potential} height={92} />
            </Card>
          </section>

          {/* EDUCATION */}
          <section>
            <SectionLabel right={<Link className="link text-xs" href={`/hub/guides${q}`}>All guides</Link>}>
              Featured guides
            </SectionLabel>
            <div className="no-bar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {ARTICLES.slice(0, 4).map((a) => (
                <Link key={a.slug} href={`/hub/guides${q ? `${q}&` : "?"}a=${a.slug}`}
                  className="card w-[240px] shrink-0 p-4 transition hover:border-teal">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{a.tag}</p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug">{a.title}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{a.excerpt}</p>
                  <p className="mt-2 text-[11px] font-semibold text-gray-400">{a.minutes} min read</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT RAIL */}
        <aside className="space-y-6">
          <section>
            <SectionLabel right={<Link href={`/hub/wealth${q}`} className="link text-xs">View more</Link>}>Build wealth</SectionLabel>
            <Card className="divide-y divide-line">
              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-gray-500">Home value</p>
                  {hub?.purchase_price ? (
                    <p className={`text-xs font-bold ${gain >= 0 ? "text-emerald-600" : "text-coral"}`}>
                      {gain >= 0 ? "▲" : "▼"} {cad(Math.abs(gain))} since purchase
                    </p>
                  ) : null}
                </div>
                <p className="tabular mt-1 text-3xl font-extrabold text-teal-deep">{cad(value)}</p>
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-gray-500">Equity</p>
                  {!noMortgage && <p className="text-xs font-bold text-gray-400">{Math.round(equityPct * 100)}% of home value</p>}
                </div>
                <p className="tabular mt-1 text-3xl font-extrabold">{cad(equity)}</p>
                {noMortgage ? (
                  // No loan on file yet — don't imply they own outright.
                  <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
                    Assumes nothing owed. <Link href={`/hub/save${q}`} className="link">Add your mortgage</Link> and
                    this becomes your real equity — plus a renewal reminder before your lender&apos;s offer lands.
                  </p>
                ) : (
                  <Progress value={equityPct * 100} className="mt-3" />
                )}
              </div>
            </Card>
          </section>

          <section>
            <SectionLabel>Connect with advisors</SectionLabel>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={`${pro?.first_name} ${pro?.last_name}`} size={46} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{pro?.first_name} {pro?.last_name}</p>
                  <p className="truncate text-xs text-gray-500">{(pro as { job_title?: string })?.job_title || "Real Estate Advisor"} · {(pro as { company?: string })?.company || "JULY Realty"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1"><Phone size={12} /> {(pro as { phone?: string })?.phone || "(604) 555-0100"}</span>
                <a className="link flex items-center gap-1 text-xs" href={`mailto:${pro?.email}`}><Mail size={12} /> Email</a>
              </div>
              {advisor && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${advisor.first_name} ${advisor.last_name}`} size={38} color="var(--navy)" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{advisor.first_name} {advisor.last_name}</p>
                      <p className="text-xs text-gray-500">{advisor.advisor_type} · {(advisor as { company?: string })?.company || "Partner"}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn btn-primary btn-sm" onClick={() => { setLeadDone(false); setLeadModal("sell"); }}>
                  Let&apos;s connect
                </button>
                <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm">Messages</Link>
              </div>
            </Card>
          </section>

          <section>
            <Link href={`/hub/report${q}`} className="block rounded-2xl border border-teal/30 bg-teal-soft p-4 transition hover:border-teal">
              <p className="text-sm font-extrabold text-teal-deep">📄 Your {new Date().getFullYear()} Home Report is ready</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-teal-deep/80">Value, equity, wins, and the year ahead — one page. View it →</p>
            </Link>
          </section>

          <section>
            <SectionLabel>Leave feedback</SectionLabel>
            <Card className="p-5 text-sm">
              <p className="font-bold">How are we doing?</p>
              <p className="mt-1 text-gray-500">Tell {pro?.first_name || "your advisor"} what would make this hub more useful.</p>
              <a className="link mt-2 inline-block text-sm" href={`mailto:${pro?.email}?subject=JULYOwner feedback`}>Send a note</a>
            </Card>
          </section>
        </aside>
      </div>

      <p className="container-x pb-8 text-center text-[11px] leading-relaxed text-gray-400">
        Values, rates, and figures are estimates for information only — not an appraisal, lending commitment, or financial advice.
      </p>

      {/* Lead modal */}
      <Modal open={leadModal !== null} onClose={() => setLeadModal(null)}
        title={leadModal === "sell" ? "Thinking about selling?" : "Explore financing"}>
        {leadDone ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold">Message sent ✓</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              {demo ? "In your real hub, this instantly notifies your advisor with your home report attached." :
                `${pro?.first_name || "Your advisor"} just got a heads-up and will reach out shortly.`}
            </p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => setLeadModal(null)}>Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {leadModal === "sell"
                ? `No pressure, no obligation — ${pro?.first_name || "your advisor"} will prepare a real market evaluation and walk you through timing.`
                : `Tell us what you're exploring — renewal, refinance, or a purchase — and ${advisor ? `${advisor.first_name} at ${(advisor as { company?: string })?.company || "our lending partner"}` : "our lending partner"} will run your numbers.`}
            </p>
            <textarea className="input min-h-24" placeholder="Anything specific on your mind? (optional)" value={leadMsg} onChange={(e) => setLeadMsg(e.target.value)} />
            <button className="btn btn-coral btn-lg w-full" onClick={sendLead}>Send</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
