"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Heart, Bell, CalendarDays, MapPin, TrendingUp, ArrowRight, ExternalLink, Link2,
} from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, compact, purchasingPower, fmtDate } from "@/lib/calc";
import { Card, SectionLabel, Avatar, Pill } from "@/components/ui";

const SEARCH_URL = "https://search.july.ca";

function listingTone(status: string): "teal" | "red" | "gray" {
  const s = status.toLowerCase();
  return s === "active" ? "teal" : s === "sold" ? "red" : "gray";
}

export default function BuyingPage() {
  const {
    hub, mortgages, profile, pro, advisor, demo, buyer,
    loadBuyer, startBuying, stopBuying, createLead,
  } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const value = hub?.home_value ?? 0;
  const balance = mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const equity = Math.max(0, value - balance);
  const buyPower = purchasingPower(value, balance).find((p) => p.key === "buy")?.amount ?? 0;
  const buying = !!hub?.buying_started_at;

  /* activation */
  const [starting, setStarting] = useState(false);

  /* advisor message */
  const [msg, setMsg] = useState("");
  const [msgSent, setMsgSent] = useState(false);

  /* load the JULY Search snapshot once, whichever path turned buying on */
  const fetched = useRef(false);
  useEffect(() => {
    if (!buying || fetched.current) return;
    fetched.current = true;
    void loadBuyer();
  }, [buying, loadBuyer]);

  async function activate() {
    setStarting(true);
    try {
      await startBuying();
      if (!fetched.current) { fetched.current = true; await loadBuyer(); }
    } finally { setStarting(false); }
  }

  async function sendMsg() {
    await createLead("general", msg || "Starting to look at my next home — let's talk timing and strategy.");
    setMsgSent(true);
  }

  if (!hub) return null;

  /* ---------------------------------- activation state ---------------------------------- */
  if (!buying) {
    return (
      <div className="container-x py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">Buying HQ</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Your next home, planned from this one.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
            Most people shop like they don&apos;t already own a home. You do — and it changes everything:
            your budget, your timing, your leverage. Buying HQ runs the search from a position of strength.
          </p>

          <Card className="mt-6 overflow-hidden">
            <div className="dark-panel p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Your buying power</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="tabular text-3xl font-extrabold text-white sm:text-4xl">≈ {cad(buyPower)}</span>
                <span className="text-sm text-white/70">next home your equity could carry</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                {compact(equity)} of equity in {hub.address1}, working as the down payment on your next move.
                A planning estimate — your advisor and lender confirm the real number.
              </p>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {[
                { icon: Heart, t: "Your search, in one place", d: <>Homes you watch and searches you save on JULY Search show up here automatically — one shortlist, no lost tabs.</> },
                { icon: CalendarDays, t: "Tours, planned with your advisor", d: <>Request a showing and your advisor lines it up — and preps what to look for before you walk in.</> },
                { icon: TrendingUp, t: "Your equity is the down payment", d: <>This home funds the next one. See exactly how in <Link href={`/hub/wealth${q}`} className="font-bold text-teal-deep underline">Build Wealth</Link>.</> },
              ].map((b) => (
                <div key={b.t} className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal-deep"><b.icon size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">{b.t}</p>
                    <p className="text-[13px] leading-relaxed text-gray-500">{b.d}</p>
                  </div>
                </div>
              ))}

              <button className="btn btn-primary btn-lg mt-2 w-full" disabled={starting} onClick={activate}>
                {starting ? "Setting up your plan…" : "Start my buying plan"} <ArrowRight size={16} />
              </button>
              <p className="text-center text-[11px] leading-relaxed text-gray-400">
                {demo
                  ? "In your real hub, this quietly notifies your advisor so a game plan is ready before your first tour."
                  : `${(pro as { first_name?: string | null })?.first_name || "Your advisor"} gets a quiet heads-up so a game plan is ready before your first tour. No commitment, no obligation.`}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------------------------------- buying state ---------------------------------- */
  return (
    <div className="container-x space-y-8 py-8">
      {/* header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Buying HQ</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Your buying plan</h1>
        </div>
        <button
          className="text-[12px] font-bold text-gray-400 underline underline-offset-2 transition hover:text-gray-600"
          title="Turns buying mode off — your hub stays exactly as-is."
          onClick={() => stopBuying()}>
          pause this plan
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN */}
        <div className="space-y-8">
          {/* connect card — live hubs with no JULY Search account under this email */}
          {buyer.loaded && !buyer.linked && (
            <Card className="overflow-hidden">
              <div className="cream-panel p-5 sm:p-6">
                <p className="flex items-center gap-1.5 text-sm font-extrabold">
                  <Link2 size={15} className="text-teal-deep" /> Link your JULY Search account
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
                  Save homes and searches on JULY Search using the same email as this hub
                  {profile?.email ? <> — <span className="font-bold">{profile.email}</span></> : null} — and they
                  appear on this page automatically. Nothing else to set up.
                </p>
                <a href={SEARCH_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-md mt-3">
                  Search homes on JULY Search <ExternalLink size={14} />
                </a>
              </div>
            </Card>
          )}

          {!buyer.loaded ? (
            <Card className="p-6 text-sm text-gray-500">Syncing with JULY Search…</Card>
          ) : (
            <>
              {/* WATCHED HOMES */}
              <section>
                <SectionLabel right={
                  <a className="link text-xs" href={SEARCH_URL} target="_blank" rel="noopener noreferrer">Open JULY Search</a>
                }>Watched homes</SectionLabel>
                {buyer.watched.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-sm font-bold">No watched homes yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-gray-500">
                      Tap the heart on any listing at JULY Search and it lands here — price and status stay in sync.
                    </p>
                    <a className="btn btn-ghost btn-sm mt-3" href={SEARCH_URL} target="_blank" rel="noopener noreferrer">
                      Browse listings <ExternalLink size={13} />
                    </a>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {buyer.watched.map((w) => (
                      <Card key={w.ref} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-sm font-extrabold leading-snug">{w.label || "Saved listing"}</p>
                          {w.last_status && <Pill tone={listingTone(w.last_status)}>{w.last_status}</Pill>}
                        </div>
                        <div className="mt-2 flex items-baseline justify-between gap-2">
                          <span className="tabular text-lg font-extrabold">{w.last_price != null ? compact(w.last_price) : "—"}</span>
                          <span className="text-[11px] text-gray-400">saved {fmtDate(w.created_at)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* SAVED SEARCHES */}
              <section>
                <SectionLabel>Saved searches</SectionLabel>
                <Card className="divide-y divide-line">
                  {buyer.searches.length === 0 && (
                    <p className="p-5 text-sm text-gray-500">
                      Save a search on JULY Search and new matches will find you — no daily scrolling required.
                    </p>
                  )}
                  {buyer.searches.map((s, i) => (
                    <div key={`${s.name ?? "search"}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-deep"><Search size={15} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{s.name || "Saved search"}</p>
                          <p className="text-[11px] text-gray-400">since {fmtDate(s.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {s.alert_new && <Pill tone="teal"><Bell size={11} /> New listings</Pill>}
                        {s.alert_sold && <Pill tone="gray"><Bell size={11} /> Solds</Pill>}
                      </div>
                    </div>
                  ))}
                </Card>
              </section>

              {/* TOUR REQUESTS */}
              <section>
                <SectionLabel>Tour requests</SectionLabel>
                <Card className="divide-y divide-line">
                  {buyer.tours.length === 0 && (
                    <p className="p-5 text-sm text-gray-500">
                      Found one worth walking through? Request a tour on JULY Search — or just ask your advisor here.
                    </p>
                  )}
                  {buyer.tours.map((t, i) => (
                    <div key={`${t.address ?? "tour"}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-deep"><MapPin size={15} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{[t.address, t.city].filter(Boolean).join(", ") || "Tour request"}</p>
                          <p className="text-[11px] text-gray-400">
                            {t.list_price != null ? `${compact(t.list_price)} · ` : ""}
                            {t.preferred_times ? `prefers ${t.preferred_times}` : `requested ${fmtDate(t.created_at)}`}
                          </p>
                        </div>
                      </div>
                      {t.status && <Pill tone={t.status.toLowerCase() === "confirmed" ? "teal" : "gold"}>{t.status}</Pill>}
                    </div>
                  ))}
                </Card>
              </section>
            </>
          )}

          <p className="text-[11px] leading-relaxed text-gray-400">
            Powered by JULY Search (search.july.ca) — watched homes, saved searches, and tour requests sync automatically.
          </p>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <section>
            <SectionLabel>Your buying team</SectionLabel>
            <Card className="p-5">
              {pro ? (
                <div className="flex items-center gap-3">
                  <Avatar name={`${(pro as { first_name?: string | null }).first_name ?? "J"} ${(pro as { last_name?: string | null }).last_name ?? "R"}`} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{(pro as { first_name?: string | null }).first_name} {(pro as { last_name?: string | null }).last_name}</p>
                    <p className="text-xs text-gray-500">{(pro as { org_name?: string | null }).org_name || "JULY Realty"} · Buying advisor</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">A JULY advisor will guide your search.</p>
              )}
              {advisor && (
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
                  <Avatar name={`${advisor.first_name} ${advisor.last_name}`} size={38} color="var(--navy)" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{advisor.first_name} {advisor.last_name}</p>
                    <p className="text-xs text-gray-500">{advisor.advisor_type} · pre-approval &amp; rates</p>
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
                  <textarea className="input mt-4 min-h-20 text-sm" placeholder="Questions about neighbourhoods, budget, or timing? (optional)"
                    value={msg} onChange={(e) => setMsg(e.target.value)} />
                  <button className="btn btn-primary btn-md mt-2 w-full" onClick={sendMsg}>
                    Talk it through <ArrowRight size={15} />
                  </button>
                </>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>Your buying power</SectionLabel>
            <Card className="p-5">
              <p className="text-sm font-semibold text-gray-500">Next home, using your equity</p>
              <p className="tabular mt-1 text-3xl font-extrabold text-teal-deep">≈ {cad(buyPower)}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
                Built on {compact(equity)} of equity in {hub.address1}. Sell first, port the mortgage,
                or hold and rent — compare every path in Build Wealth.
              </p>
              <Link href={`/hub/wealth${q}`} className="btn btn-ghost btn-sm mt-3">
                Explore your equity <ArrowRight size={14} />
              </Link>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
