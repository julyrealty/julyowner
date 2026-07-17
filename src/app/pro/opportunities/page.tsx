"use client";
import { useState } from "react";
import { usePro } from "@/lib/pro-store";
import { Card, Pill, Avatar } from "@/components/ui";
import { Star, Flame } from "lucide-react";

export default function ProOpportunities() {
  const { contacts, activities } = usePro();
  const [onlyLikely, setOnlyLikely] = useState(false);

  const scored = contacts
    .filter((c) => typeof c.propensity === "number")
    .sort((a, b) => (b.propensity ?? 0) - (a.propensity ?? 0))
    .filter((c) => !onlyLikely || (c.propensity ?? 0) >= 65);

  const hot = activities.filter((a) => a.action.includes("Sell") || a.action.includes("Contacted"));

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

      {hot.length > 0 && (
        <Card className="mt-5 border-coral/40 bg-red-50/50 p-4">
          <p className="text-sm font-extrabold text-coral">🔥 Act today</p>
          {hot.map((h) => (
            <p key={h.id} className="mt-1 text-sm"><b>{h.member}</b> — {h.action}{h.detail ? ` (${h.detail})` : ""}. Call while it&apos;s warm.</p>
          ))}
        </Card>
      )}

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
        {scored.length === 0 && (
          <Card className="p-10 text-center text-sm text-gray-500">
            Signals build as your homeowners engage with their hubs — invite more contacts to light this up.
          </Card>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-gray-400">
        Scores are directional estimates from engagement and property factors — a reason to call, not a promise.
      </p>
    </div>
  );
}
