"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Heart, Bell, CalendarDays, MapPin, TrendingUp, ArrowRight, ExternalLink, Link2,
  House, Sparkles, FolderOpen,
} from "lucide-react";
import { useHub } from "@/lib/store";
import { cad, compact, purchasingPower, fmtDate, monthlyPayment } from "@/lib/calc";
import { useAlerts, describeAlert, FREQUENCIES, type Alert } from "@/lib/alerts";
import { Card, SectionLabel, Avatar, Pill, Modal, Field } from "@/components/ui";

/** A fresh alert. Only criteria keys JULY Search's runner is known to read. */
const BLANK_ALERT = {
  id: undefined as string | undefined,
  name: "",
  scope: "area" as Alert["scope"],
  criteria: {} as Record<string, string>,
  alert_new: true,
  alert_sold: false,
  frequency: "daily" as Alert["frequency"],
};

const SEARCH_URL = "https://search.july.ca";
/** watched_items.ref / viewed_items.ref is the MLS number JULY Search routes on. */
const listingUrl = (ref: string) => `${SEARCH_URL}/listings/mls/${encodeURIComponent(ref)}`;
const AIPRO_URL = "https://buyeraipro.com";
const AFF_RATE = 4.19; // 3-yr fixed — mirrors the market rate strip
const AFF_AMORT = 25;

function listingTone(status: string): "teal" | "red" | "gray" {
  const s = status.toLowerCase();
  return s === "active" ? "teal" : s === "sold" ? "red" : "gray";
}

function specLine(beds?: number | null, baths?: number | null, city?: string | null): string {
  return [beds != null ? `${beds} bd` : null, baths != null ? `${baths} ba` : null, city]
    .filter(Boolean).join(" · ");
}

/** DDF photos come as 1600px originals; thumbnails only need the 256px variant. */
function thumbSrc(url: string): string {
  return url.replace("/highres/", "/medres/");
}

/** Listing photo: small variant first, then the original, then a tile. */
function ListingThumb({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [step, setStep] = useState(0); // 0 = medres, 1 = original, 2 = give up
  const url = src ? (step === 0 ? thumbSrc(src) : src) : null;
  if (!url || step > 1) {
    return (
      <div className={`flex items-center justify-center bg-teal-soft text-teal-deep ${className}`}>
        <House size={24} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={step} src={url} alt={alt} loading="lazy" onError={() => setStep((s) => s + 1)}
      className={`object-cover ${className}`} />
  );
}

export default function BuyingPage() {
  const {
    hub, mortgages, profile, pro, advisor, demo, buyer,
    loadBuyer, startBuying, stopBuying, createLead,
  } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const isPureBuyer = hub?.journey === "buying";
  const value = hub?.home_value ?? 0;
  const balance = mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const equity = Math.max(0, value - balance);
  const buyPower = purchasingPower(value, balance).find((p) => p.key === "buy")?.amount ?? 0;
  const buying = !!hub?.buying_started_at || isPureBuyer;

  /* activation */
  const [starting, setStarting] = useState(false);

  /* alerts — live in JULY Search, managed from here */
  const { alerts, save: saveAlert, remove: removeAlert, busy: alertBusy } = useAlerts(hub?.id, !demo);
  const [editing, setEditing] = useState<typeof BLANK_ALERT | Alert | null>(null);
  const [alertErr, setAlertErr] = useState<string | null>(null);

  async function submitAlert(draft: typeof BLANK_ALERT) {
    if (!draft.criteria.city?.trim()) { setAlertErr("Give it a city or area to watch."); return; }
    const res = await saveAlert({
      id: draft.id,
      name: draft.name.trim() || draft.criteria.city.trim(),
      criteria: draft.criteria,
      scope: draft.scope,
      alert_new: draft.alert_new,
      alert_sold: draft.alert_sold,
      frequency: draft.frequency,
    });
    if (res.ok) { setEditing(null); setAlertErr(null); return; }
    setAlertErr(
      res.error === "demo"
        ? "This is the demo hub — in your real one this creates a live JULY Search alert."
        : res.error === "not_linked"
          ? "Connect your JULY Search account first — alerts live there."
          : res.error === "limit_reached"
            ? "That's the maximum number of alerts. Delete one to add another."
            : "Couldn't save that alert. Try again in a moment.",
    );
  }

  /* advisor message */
  const [msg, setMsg] = useState("");
  const [msgSent, setMsgSent] = useState(false);

  /* affordability (pure buyers) */
  const [monthly, setMonthly] = useState(3500);
  const [affSent, setAffSent] = useState(false);
  const per100k = monthlyPayment(100000, AFF_RATE, AFF_AMORT);
  const borrow = Math.max(0, Math.round(((monthly / per100k) * 100000) / 10000) * 10000);
  const price20 = Math.round((borrow / 0.8) / 10000) * 10000;

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

  async function askPreApproval() {
    await createLead("loan", `Pre-approval check: I'm budgeting about ${cad(monthly)}/mo — what price range does that support?`);
    setAffSent(true);
  }

  if (!hub) return null;

  /* ---------------------------------- activation state (owners only) ---------------------------------- */
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
          <p className="eyebrow">{isPureBuyer ? "Home Search HQ" : "Buying HQ"}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {isPureBuyer ? "Your home search" : "Your buying plan"}
          </h1>
          {(hub?.journey === "selling" || hub?.journey === "sold") && (
            <Link href={`/hub/sell${q}`} className="mt-1 inline-block text-[12px] font-bold text-coral underline underline-offset-2">
              Also selling — open your selling plan →
            </Link>
          )}
        </div>
        {!isPureBuyer && (
          <button
            className="text-[12px] font-bold text-gray-400 underline underline-offset-2 transition hover:text-gray-600"
            title="Turns buying mode off — your hub stays exactly as-is."
            onClick={() => stopBuying()}>
            pause this plan
          </button>
        )}
      </section>

      {/* min-w-0: grid children default to min-width:auto, so a wide listing
          card or photo pushes the column past the viewport on mobile. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN */}
        <div className="min-w-0 space-y-8">
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
                      <a key={w.ref} href={listingUrl(w.ref)} target="_blank" rel="noopener noreferrer"
                        className="card overflow-hidden transition hover:border-teal">
                        <ListingThumb src={w.photo} alt={w.label || "Watched home"} className="h-32 w-full" />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 text-sm font-extrabold leading-snug">{w.label || "Saved listing"}</p>
                            {w.last_status && <Pill tone={listingTone(w.last_status)}>{w.last_status}</Pill>}
                          </div>
                          {specLine(w.beds, w.baths, w.city) && (
                            <p className="mt-0.5 text-[12px] text-gray-500">{specLine(w.beds, w.baths, w.city)}</p>
                          )}
                          <div className="mt-2 flex items-baseline justify-between gap-2">
                            <span className="tabular text-lg font-extrabold">
                              {(w.last_price ?? w.list_price) != null ? compact((w.last_price ?? w.list_price)!) : "—"}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              saved {fmtDate(w.created_at)} <ExternalLink size={11} />
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* RECENTLY VIEWED */}
              <section>
                <SectionLabel>Recently viewed</SectionLabel>
                {buyer.viewed.length === 0 ? (
                  <Card className="p-5">
                    <p className="text-sm text-gray-500">
                      Listings you open on JULY Search show up here — so the one you half-remember from
                      Tuesday is never lost.
                    </p>
                  </Card>
                ) : (
                  <Card className="divide-y divide-line">
                    {buyer.viewed.map((v) => (
                      <a key={v.ref} href={listingUrl(v.ref)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 transition hover:bg-gray-50">
                        <ListingThumb src={v.photo} alt={v.label || "Viewed home"} className="h-12 w-16 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{v.label || "Viewed listing"}</p>
                          <p className="text-[11px] text-gray-400">
                            {specLine(v.beds, v.baths, null) ? `${specLine(v.beds, v.baths, null)} · ` : ""}viewed {fmtDate(v.viewed_at)}
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-sm font-extrabold">
                          {v.list_price != null ? compact(v.list_price) : ""}
                        </span>
                        <ExternalLink size={13} className="shrink-0 text-gray-300" />
                      </a>
                    ))}
                  </Card>
                )}
              </section>

              {/* ALERTS — created here, delivered by JULY Search's own runner. */}
              <section>
                <SectionLabel right={
                  alerts !== null && buyer.linked ? (
                    <button className="link text-xs font-bold" onClick={() => { setEditing(BLANK_ALERT); setAlertErr(null); }}>
                      + New alert
                    </button>
                  ) : undefined
                }>
                  Alerts
                </SectionLabel>
                <Card className="divide-y divide-line">
                  {alerts === null && <p className="p-5 text-sm text-gray-400">Loading your alerts…</p>}

                  {alerts !== null && alerts.length === 0 && (
                    <div className="p-5">
                      <p className="text-sm font-bold">Nothing watching for you yet</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                        Set an alert for an area and JULY Search will tell you when something new comes
                        up, instead of you checking every day.
                      </p>
                      <button className="btn btn-primary btn-sm mt-3" onClick={() => { setEditing(BLANK_ALERT); setAlertErr(null); }}>
                        <Bell size={14} /> Set up an alert
                      </button>
                    </div>
                  )}

                  {(alerts ?? []).map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          a.frequency === "off" ? "bg-gray-100 text-gray-400" : "bg-teal-soft text-teal-deep"}`}>
                          {a.scope === "area" ? <MapPin size={15} /> : <Search size={15} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{a.name || "Saved search"}</p>
                          <p className="truncate text-[11px] text-gray-400">{describeAlert(a)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {a.alert_new && a.frequency !== "off" && <Pill tone="teal"><Bell size={11} /> New</Pill>}
                        {a.alert_sold && a.frequency !== "off" && <Pill tone="gray"><Bell size={11} /> Solds</Pill>}
                        {a.frequency === "off" && <Pill tone="gray">Paused</Pill>}
                        <button className="rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-gray-500 transition hover:border-teal hover:text-teal-deep"
                          onClick={() => { setEditing(a); setAlertErr(null); }}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </Card>
                {alerts !== null && alerts.length > 0 && (
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                    Alerts are sent by JULY Search — the same ones you&apos;d get from search.july.ca.
                  </p>
                )}
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
            Powered by JULY Search (search.july.ca) — watched homes, recently viewed, saved searches, and tour requests sync automatically.
          </p>
        </div>

        {/* SIDEBAR */}
        <aside className="min-w-0 space-y-6">
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

          {isPureBuyer ? (
            /* Pure buyers: affordability, not equity (they don't own yet). */
            <section>
              <SectionLabel>What can I afford?</SectionLabel>
              <Card className="p-5">
                <label className="text-sm font-semibold text-gray-500" htmlFor="aff-monthly">Comfortable monthly payment</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-lg font-extrabold text-gray-400">$</span>
                  <input id="aff-monthly" type="number" min={500} step={100} className="input tabular text-lg font-extrabold"
                    value={monthly} onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))} />
                  <span className="shrink-0 text-sm text-gray-400">/mo</span>
                </div>
                <div className="mt-3 rounded-xl bg-teal-soft p-3">
                  <p className="text-[12px] font-bold text-teal-deep/80">carries a mortgage of about</p>
                  <p className="tabular text-2xl font-extrabold text-teal-deep">≈ {cad(borrow)}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-teal-deep/80">
                    ≈ {cad(price20)} home with 20% down, at {AFF_RATE}% over {AFF_AMORT} years.
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                  A planning estimate — lenders stress-test about 2% higher. A pre-approval pins down the real number.
                </p>
                {affSent ? (
                  <p className="mt-3 rounded-xl bg-teal-soft p-2.5 text-center text-sm font-extrabold text-teal-deep">Request sent ✓</p>
                ) : (
                  <button className="btn btn-ghost btn-sm mt-3" onClick={askPreApproval}>
                    Ask about pre-approval <ArrowRight size={14} />
                  </button>
                )}
              </Card>
            </section>
          ) : (
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
          )}

          <section>
            <SectionLabel>AI on your side</SectionLabel>
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-sm font-extrabold">
                <Sparkles size={15} className="text-gold" /> Buyer AiPro
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
                Before you tour, run any listing through Buyer AiPro — pricing history, days on market,
                and red flags, read by AI in seconds.
              </p>
              <a href={AIPRO_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm mt-3 w-full">
                Scan a listing <ExternalLink size={13} />
              </a>
              <p className="mt-3 border-t border-line pt-3 text-[13px] leading-relaxed text-gray-500">
                Got strata docs, disclosures, or an inspection report? Keep them together here and your
                advisor reviews them with you before you offer.
              </p>
              <Link href={`/hub/home/documents${q}`} className="btn btn-ghost btn-sm mt-2 w-full">
                <FolderOpen size={14} /> My documents
              </Link>
            </Card>
          </section>
        </aside>
      </div>

      {/* ALERT EDITOR. Only offers filters JULY Search's runner is known to
          apply — a field it silently ignored would tell the buyer they were
          filtered when they weren't. */}
      <Modal open={!!editing} onClose={() => { setEditing(null); setAlertErr(null); }}
        title={editing && "id" in editing && editing.id ? "Edit alert" : "New alert"}>
        {editing && (
          <AlertEditor
            draft={editing}
            busy={alertBusy}
            error={alertErr}
            onSubmit={submitAlert}
            onDelete={"id" in editing && editing.id
              ? async () => { await removeAlert(editing.id as string); setEditing(null); }
              : undefined}
          />
        )}
      </Modal>
    </div>
  );
}

function AlertEditor({ draft, busy, error, onSubmit, onDelete }: {
  draft: typeof BLANK_ALERT | Alert;
  busy: boolean;
  error: string | null;
  onSubmit: (d: typeof BLANK_ALERT) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<typeof BLANK_ALERT>({
    id: "id" in draft ? draft.id : undefined,
    name: draft.name ?? "",
    scope: draft.scope ?? "area",
    criteria: { ...(draft.criteria ?? {}) },
    alert_new: draft.alert_new ?? true,
    alert_sold: draft.alert_sold ?? false,
    frequency: draft.frequency ?? "daily",
  });
  const setCrit = (k: string, v: string) =>
    setD((p) => {
      const c = { ...p.criteria };
      if (v.trim()) c[k] = v.trim(); else delete c[k];
      return { ...p, criteria: c };
    });

  return (
    <div className="space-y-4">
      <Field label="City or area">
        <input className="input" placeholder="Burnaby" value={d.criteria.city ?? ""}
          onChange={(e) => setCrit("city", e.target.value)} autoFocus />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Bedrooms (min)">
          <input className="input tabular" inputMode="numeric" placeholder="Any"
            value={d.criteria.beds ?? ""} onChange={(e) => setCrit("beds", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Bathrooms (min)">
          <input className="input tabular" inputMode="numeric" placeholder="Any"
            value={d.criteria.baths ?? ""} onChange={(e) => setCrit("baths", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </div>

      <Field label="Name (optional)">
        <input className="input" placeholder="Defaults to the area" value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>

      <Field label="Tell me about">
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => setD({ ...d, alert_new: !d.alert_new })}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
              d.alert_new ? "border-teal bg-teal-soft text-teal-deep" : "border-line text-gray-500"}`}>
            New listings
          </button>
          <button type="button" onClick={() => setD({ ...d, alert_sold: !d.alert_sold })}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
              d.alert_sold ? "border-teal bg-teal-soft text-teal-deep" : "border-line text-gray-500"}`}>
            Sold prices
          </button>
        </div>
      </Field>

      <Field label="How often">
        <select className="input" value={d.frequency}
          onChange={(e) => setD({ ...d, frequency: e.target.value as Alert["frequency"] })}>
          {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </Field>

      <p className="text-[11px] leading-relaxed text-gray-400">
        Price and finer filters live on JULY Search — build the search there and its alert appears
        here too. Sent by JULY Search, so it arrives the same way as any other alert you have.
      </p>

      {error && <p className="text-[13px] text-coral">{error}</p>}

      <div className="flex gap-2">
        <button className="btn btn-primary btn-lg flex-1" disabled={busy} onClick={() => onSubmit(d)}>
          {busy ? "Saving…" : d.id ? "Save changes" : "Create alert"}
        </button>
        {onDelete && (
          <button className="btn btn-ghost btn-lg text-coral" disabled={busy} onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
