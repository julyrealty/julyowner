"use client";
import Link from "next/link";
import { usePro } from "@/lib/pro-store";
import { cad, relTime } from "@/lib/calc";
import { Card, SectionLabel, Avatar } from "@/components/ui";
import { Donut } from "@/components/charts";
import { ArrowUpRight, Flame, UserPlus } from "lucide-react";
import { DEMO_HUB } from "@/lib/demo";

export default function ProDashboard() {
  const { profile, contacts, hubs, activities, demo } = usePro();
  const q = demo ? "?demo=1" : "";

  const totalValue = demo ? DEMO_HUB.home_value + 1120000 : hubs.length * 1200000;
  const commission = Math.round((totalValue * 0.025) / 1000) * 1000;
  const selling = hubs.filter((h) => h.journey === "selling").length;
  const joined = contacts.filter((c) => c.joined > 0).length;
  const invited = contacts.filter((c) => c.pending > 0).length;
  const unclaimed = Math.max(0, contacts.length - joined - invited);

  const stats = [
    { label: "Contacts", value: contacts.length, note: "in your book" },
    { label: "Homeowner hubs", value: hubs.length, note: "live properties" },
    { label: "Total home value", value: compactCad(totalValue), note: "under management" },
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
      {selling > 0 && (
        <Link href={`/pro/hubs${q}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1.5 text-[12px] font-extrabold text-coral hover:bg-coral/20">
          <Flame size={13} /> {selling} homeowner{selling === 1 ? "" : "s"} in selling mode
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ACTIVITY FEED */}
        <section>
          <SectionLabel>What&apos;s happening in your hubs</SectionLabel>
          <Card className="divide-y divide-line">
            {activities.length === 0 && (
              <p className="p-6 text-sm text-gray-500">No activity yet. Invite your first homeowner and this feed comes alive — value checks, project favourites, document uploads, and “Sell my home” clicks.</p>
            )}
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
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
              </div>
            ))}
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
