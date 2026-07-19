"use client";
import Link from "next/link";
import { usePro } from "@/lib/pro-store";
import { cad, relTime } from "@/lib/calc";
import { Card, SectionLabel, Avatar } from "@/components/ui";
import { Donut } from "@/components/charts";
import { ArrowUpRight, Flame, UserPlus } from "lucide-react";
import { DEMO_HUB } from "@/lib/demo";

export default function ProDashboard() {
  const { profile, contacts, hubs, activities, demo, products, providers, advisors, recommended } = usePro();
  const q = demo ? "?demo=1" : "";

  // Setup gaps, each one something a client actually notices in their hub.
  // Only incomplete items appear, and the whole card disappears once they're done.
  const p = profile as { phone?: string | null; logo_url?: string | null } | null;
  const setup = [
    !p?.phone && {
      title: "Add your phone number",
      why: "Without it your clients can only reach you by email — their hub shows no number at all.",
      href: `/pro/profile${q}`, cta: "Add it",
    },
    recommended.length === 0 && {
      title: "Recommend your first trade",
      why: "Home Services is empty in every client hub until you vouch for someone.",
      href: `/pro/providers${q}`, cta: "Pick your trades",
    },
    advisors.length === 0 && {
      title: "Add a lending partner",
      why: "Mortgage questions have nowhere to go, and renewal conversations stall.",
      href: `/pro/advisors${q}`, cta: "Add an advisor",
    },
    contacts.length > 0 && contacts.every((c) => c.joined === 0 && c.pending === 0) && {
      title: "Invite your first homeowner",
      why: "Contacts only become hubs once they're invited and claim their home.",
      href: `/pro/contacts${q}`, cta: "Send an invite",
    },
  ].filter(Boolean) as { title: string; why: string; href: string; cta: string }[];

  // Real estimated values only — a hub with no valuation yet (e.g. a buyer's
  // search HQ) contributes nothing rather than a made-up average.
  const valued = hubs.filter((h) => (h.home_value ?? 0) > 0);
  const totalValue = demo ? DEMO_HUB.home_value + 1120000 : valued.reduce((s, h) => s + (h.home_value ?? 0), 0);
  const commission = Math.round((totalValue * 0.025) / 1000) * 1000;
  const valueNote = demo
    ? "under management"
    : valued.length === hubs.length
      ? "under management"
      : `across ${valued.length} valued home${valued.length === 1 ? "" : "s"}`;
  // Signal chips are premium: each family shows only with its product entitlement.
  const selling = products.seller ? hubs.filter((h) => h.journey === "selling").length : 0;
  const buying = products.buyer ? hubs.filter((h) => h.journey !== "selling" && h.journey !== "sold" && (h.buying_started_at || h.journey === "buying")).length : 0;
  const joined = contacts.filter((c) => c.joined > 0).length;
  const invited = contacts.filter((c) => c.pending > 0).length;
  const unclaimed = Math.max(0, contacts.length - joined - invited);

  const stats = [
    { label: "Contacts", value: contacts.length, note: "in your book" },
    { label: "Homeowner hubs", value: hubs.length, note: "live properties" },
    { label: "Total home value", value: compactCad(totalValue), note: valueNote },
    { label: "Est. commission potential", value: compactCad(commission), note: "if they all transacted once" },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Good to see you, {profile?.first_name || "there"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Homeowners under management — your future pipeline, compounding quietly.</p>
        </div>
        <Link href={`/pro/contacts${q}`} className="btn btn-dark btn-md"><UserPlus size={16} /> Invite homeowner</Link>
      </div>

      {/* SETUP — only while something a client would notice is still missing */}
      {setup.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="text-sm font-extrabold">Finish setting up your practice</p>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {setup.length} thing{setup.length === 1 ? "" : "s"} your homeowners would notice.
          </p>
          <div className="mt-4 divide-y divide-line">
            {setup.map((s) => (
              <div key={s.title} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{s.why}</p>
                </div>
                <Link href={s.href} className="btn btn-ghost btn-sm shrink-0">{s.cta} <ArrowUpRight size={14} /></Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* STATS */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className="tabular mt-1 text-2xl font-extrabold text-teal-deep">{s.value}</p>
            <p className="text-xs text-gray-400">{s.note}</p>
          </Card>
        ))}
      </div>
      {(selling > 0 || buying > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selling > 0 && (
            <Link href={`/pro/hubs${q}`} className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1.5 text-[12px] font-extrabold text-coral hover:bg-coral/20">
              <Flame size={13} /> {selling} homeowner{selling === 1 ? "" : "s"} in selling mode
            </Link>
          )}
          {buying > 0 && (
            <Link href={`/pro/hubs${q}`} className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1.5 text-[12px] font-extrabold text-teal-deep hover:opacity-80">
              <Flame size={13} /> {buying} shopping for their next home
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ACTIVITY FEED */}
        <section>
          <SectionLabel>What&apos;s happening in your hubs</SectionLabel>
          <Card className="divide-y divide-line">
            {activities.length === 0 && (
              <p className="p-6 text-sm text-gray-500">No activity yet. Invite your first homeowner and this feed comes alive — value checks, project favourites, document uploads, and “Sell my home” clicks.</p>
            )}
            {activities.map((a) => {
              const row = (
                <>
                  <Avatar name={a.member} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><b>{a.member}</b> · {a.action}
                      {a.detail && <span className="text-gray-500"> — {a.detail}</span>}
                    </p>
                    <p className="text-xs text-gray-400">{a.hub} · {relTime(a.when)}</p>
                  </div>
                  {(a.action.includes("Sell") || a.action.includes("Contacted")) && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-coral">HOT LEAD</span>
                  )}
                </>
              );
              // A hot lead you can't act on is a dead end — open that hub's timeline.
              return a.hubId ? (
                <Link key={a.id} href={`/pro/hubs${q ? `${q}&` : "?"}hub=${a.hubId}`}
                  className="flex items-center gap-3 p-4 transition hover:bg-gray-50">
                  {row}
                </Link>
              ) : (
                <div key={a.id} className="flex items-center gap-3 p-4">{row}</div>
              );
            })}
          </Card>
        </section>

        {/* ONBOARDING DONUT */}
        <aside className="space-y-6">
          <section>
            <SectionLabel>Invitation performance</SectionLabel>
            <Card className="flex items-center gap-5 p-5">
              <Donut a={joined} b={Math.max(1, invited + unclaimed)} size={110} stroke={16} />
              <div className="space-y-1.5 text-sm">
                <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-teal" /> <b>{joined}</b> onboarded</p>
                <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#9fd6d5]" /> <b>{invited}</b> invited</p>
                <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-gray-200" /> <b>{unclaimed}</b> not yet invited</p>
              </div>
            </Card>
          </section>
          <section>
            <SectionLabel>Quick actions</SectionLabel>
            <Card className="divide-y divide-line text-sm font-semibold">
              {[
                { href: `/pro/contacts${q}`, label: "Add & invite contacts" },
                { href: `/pro/providers${q}`, label: "Curate your provider list" },
                { href: `/pro/advisors${q}`, label: "Set your default lending partner" },
                { href: `/pro/opportunities${q}`, label: "Review seller signals" },
              ].map((x) => (
                <Link key={x.href + x.label} href={x.href} className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50">
                  {x.label} <ArrowUpRight size={15} className="text-gray-300" />
                </Link>
              ))}
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}

function compactCad(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : cad(n);
}
