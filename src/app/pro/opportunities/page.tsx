"use client";
import { useState } from "react";
import Link from "next/link";
import { usePro, type ProductKey } from "@/lib/pro-store";
import { relTime, monthsBetween } from "@/lib/calc";
import { Card, Pill, Avatar, SectionLabel } from "@/components/ui";
import { Star, Flame, Search, CalendarClock } from "lucide-react";

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

const LOCKED_META: { key: ProductKey; title: string; line: string; href: string }[] = [
  { key: "buyer", title: "Buyer signals", line: "Know the moment a client starts their home search.", href: "/buy#agents" },
  { key: "owner", title: "Renewal radar", line: "Every mortgage renewal in your book, a year out.", href: "/own#agents" },
  { key: "seller", title: "Seller signals", line: "Live seller activations plus propensity scores.", href: "/sell#agents" },
  { key: "investor", title: "Lease renewals", line: "Landlord clients' lease deadlines, before they hit.", href: "/invest#agents" },
];

export default function ProOpportunities() {
  const { contacts, activities, hubs, demo, products } = usePro();
  const [onlyLikely, setOnlyLikely] = useState(false);
  const q = demo ? "?demo=1" : "";
  const has = (p: ProductKey) => !!products[p];
  const locked = LOCKED_META.filter((m) => !has(m.key));

  // Homeowners who have actually flipped their hub into selling or buying mode — live, not predicted.
  // Each signal family only renders for professionals entitled to that product.
  const sellers = has("seller") ? hubs.filter((h) => h.journey === "selling") : [];
  const buyers = has("buyer") ? hubs.filter((h) => !!h.buying_started_at && h.journey !== "selling" && h.journey !== "sold") : [];
  const liveNames = new Set([...sellers, ...buyers].map((h) => h.contact));

  const scored = (has("seller") ? contacts : [])
    .filter((c) => typeof c.propensity === "number")
    .filter((c) => !liveNames.has(`${c.first_name} ${c.last_name}`)) // already live above — no score needed
    .sort((a, b) => (b.propensity ?? 0) - (a.propensity ?? 0))
    .filter((c) => !onlyLikely || (c.propensity ?? 0) >= 65);

  const hot = activities.filter((a) => a.action.includes("Sell") || a.action.includes("Contacted"));

  // Renewal radar: any mortgage whose term ends inside 12 months — one card per hub, soonest first.
  const renewalRows = hubs
    .flatMap((h) =>
      (h.mortgages ?? []).map((m) => {
        const renewsOn = renewalDateOf(m.start_date, m.term_months ?? 60);
        return { hub: h, mtg: m, renewsOn, monthsLeft: monthsUntil(renewsOn) };
      }),
    )
    .filter((r) => r.monthsLeft >= 0 && r.monthsLeft <= 12)
    .sort((a, b) => +a.renewsOn - +b.renewsOn);
  const radar = renewalRows.filter((r, i) => renewalRows.findIndex((x) => x.hub.id === r.hub.id) === i);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Signals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Who&apos;s most likely to move next — blended from hub engagement, tenure, equity, and market pace.
          </p>
        </div>
        <button className={`btn btn-sm ${onlyLikely ? "btn-primary" : "btn-ghost"}`} onClick={() => setOnlyLikely(!onlyLikely)}>
          <Flame size={14} /> Likely sellers only
        </button>
      </div>

      {(sellers.length > 0 || buyers.length > 0) && (
        <div className="mt-5 space-y-2">
          {sellers.map((h) => (
            <Card key={h.id} className="flex items-center gap-3 border-coral/40 bg-red-50/50 p-4">
              <Flame size={16} className="shrink-0 text-coral" />
              <Avatar name={h.contact} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {h.contact}
                  <span className="ml-2 rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-extrabold text-coral">Active seller</span>
                </p>
                <p className="truncate text-xs text-gray-500">
                  Started their selling plan{h.selling_started_at ? ` ${relTime(h.selling_started_at)}` : ""} · {h.address}
                </p>
              </div>
              <div className="hidden w-24 shrink-0 text-right sm:block">
                <p className="text-xl font-extrabold text-coral">Live</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Not a prediction</p>
              </div>
              <Link href={`/hub${q}`} className="btn btn-coral btn-sm shrink-0">Open hub</Link>
            </Card>
          ))}
          {buyers.map((h) => (
            <Card key={`buyer-${h.id}`} className="flex items-center gap-3 border-teal/40 bg-teal-soft/50 p-4">
              <Search size={16} className="shrink-0 text-teal" />
              <Avatar name={h.contact} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {h.contact}
                  <span className="ml-2 rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-extrabold text-teal-deep">Active buyer</span>
                </p>
                <p className="truncate text-xs text-gray-500">
                  Started their buying plan{h.buying_started_at ? ` ${relTime(h.buying_started_at)}` : ""} · {h.address}
                </p>
              </div>
              <div className="hidden w-24 shrink-0 text-right sm:block">
                <p className="text-xl font-extrabold text-teal">Live</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Not a prediction</p>
              </div>
              <Link href={`/hub${q}`} className="btn btn-primary btn-sm shrink-0">Open hub</Link>
            </Card>
          ))}
        </div>
      )}

      {hot.length > 0 && (
        <Card className="mt-5 border-coral/40 bg-red-50/50 p-4">
          <p className="text-sm font-extrabold text-coral">🔥 Act today</p>
          {hot.map((h) => (
            <p key={h.id} className="mt-1 text-sm"><b>{h.member}</b> — {h.action}{h.detail ? ` (${h.detail})` : ""}. Call while it&apos;s warm.</p>
          ))}
        </Card>
      )}

      {has("owner") && radar.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Renewal radar</SectionLabel>
          <div className="space-y-2">
            {radar.map(({ hub: h, mtg, renewsOn, monthsLeft }) => (
              <Card key={`renew-${h.id}`} className="flex items-center gap-3 p-4">
                <CalendarClock size={16} className="shrink-0 text-gray-300" />
                <Avatar name={h.contact} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {h.contact}
                    <span className={`tabular ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${monthsLeft <= 6 ? "bg-amber-50 text-amber-700" : "bg-teal-soft text-teal-deep"}`}>
                      {monthsLeft === 0 ? "This month" : `${monthsLeft} mo away`}
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-500">{h.address}</p>
                  <p className="truncate text-xs font-semibold text-gray-600">
                    {mtg.loan_type ?? "Mortgage"}{mtg.lender ? ` · ${mtg.lender}` : ""} renews {renewsOn.toLocaleDateString("en-CA", { month: "short", year: "numeric" })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Their lender calls 4–6 months out. Call first.</p>
                </div>
                <Link href={`/hub${q}`} className="btn btn-primary btn-sm shrink-0">Open hub</Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LEASE RENEWALS — landlord hubs with leases ending inside 120 days */}
      {has("investor") && (() => {
        const now = Date.now();
        const leases = hubs
          .filter((h) => h.is_rental && h.lease_end)
          .map((h) => ({ h, end: new Date(`${h.lease_end}T12:00:00`), days: Math.ceil((new Date(`${h.lease_end}T12:00:00`).getTime() - now) / 86400000) }))
          .filter((x) => x.days > -30 && x.days <= 120)
          .sort((a, b) => a.days - b.days);
        if (!leases.length) return null;
        return (
          <div className="mt-6">
            <p className="section-label">Lease renewals</p>
            <div className="mt-2 space-y-2">
              {leases.map(({ h, end, days }) => (
                <Card key={`lease-${h.id}`} className="flex items-center gap-3 p-4">
                  <Avatar name={h.contact} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{h.contact} — landlord</p>
                    <p className="truncate text-xs text-gray-500">{h.address}</p>
                    <p className="truncate text-xs font-semibold text-gray-600">
                      Lease {days <= 0 ? "ended" : "ends"} {end.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      {h.monthly_rent ? ` · $${Number(h.monthly_rent).toLocaleString("en-CA")}/mo` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">Renewal, rent review, or re-list — they need a plan before notice deadlines.</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${days <= 60 ? "bg-amber-100 text-amber-700" : "bg-teal-soft text-teal-deep"}`}>
                    {days <= 0 ? "now" : `${days}d`}
                  </span>
                  <Link href={`/hub${q}`} className="btn btn-primary btn-sm shrink-0">Open hub</Link>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mt-5 space-y-2">
        {scored.map((c) => {
          const p = c.propensity ?? 0;
          const tone = p >= 70 ? "text-coral" : p >= 60 ? "text-amber-600" : "text-gray-500";
          return (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <Star size={16} className="shrink-0 text-gray-300" />
              <Avatar name={`${c.first_name} ${c.last_name}`} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.first_name} {c.last_name}</p>
                <p className="truncate text-xs text-gray-400">{c.addr || c.email}</p>
              </div>
              <div className="hidden shrink-0 sm:block">
                {c.joined > 0 ? <Pill tone="green">Hub active</Pill> : <Pill>No hub yet</Pill>}
              </div>
              <div className="w-24 shrink-0 text-right">
                <p className={`tabular text-xl font-extrabold ${tone}`}>{p}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Propensity to sell</p>
              </div>
              <a className="btn btn-primary btn-sm shrink-0" href={`mailto:${c.email}?subject=Quick question about your place`}>Reach out</a>
            </Card>
          );
        })}
        {scored.length === 0 && sellers.length === 0 && buyers.length === 0 && radar.length === 0 && (
          <Card className="p-10 text-center text-sm text-gray-500">
            Signals build as your homeowners engage with their hubs — invite more contacts to light this up.
          </Card>
        )}
      </div>

      {locked.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Unlock more signals</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {locked.map((m) => (
              <Card key={m.key} className="p-4">
                <p className="text-sm font-extrabold">{m.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{m.line}</p>
                <Link href={m.href} className="btn btn-ghost btn-sm mt-3">From $29/mo</Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-gray-400">
        Scores are directional estimates from engagement and property factors — a reason to call, not a promise.
      </p>
    </div>
  );
}
