"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Search, ClipboardCheck, Hammer } from "lucide-react";
import { useHub } from "@/lib/store";
import { PROVIDER_CATEGORIES, PROVIDERS, ARTICLES } from "@/lib/demo";
import { Card, SectionLabel, Pill } from "@/components/ui";
import { fmtDate } from "@/lib/calc";
import { useState } from "react";

export default function ManageHome() {
  const { tasks, setTaskStatus, addTask } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const [newRepair, setNewRepair] = useState("");
  const pending = tasks.filter((t) => t.status === "pending");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Manage Home</h1>
          <p className="mt-1 text-sm text-white/70">Maintenance, repairs, and the people who can help.</p>
        </div>
      </section>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* MAINTENANCE LIST */}
          <section>
            <SectionLabel right={<span className="text-xs text-gray-400">{pending.length} open</span>}>Maintenance</SectionLabel>
            <div className="space-y-2">
              {pending.map((t) => (
                <Card key={t.id} className="flex items-center gap-3 p-4">
                  <button aria-label="Mark done" onClick={() => setTaskStatus(t.id, "done")}
                    className="h-5 w-5 shrink-0 rounded-full border-2 border-teal transition hover:bg-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {t.frequency !== "once" ? `${t.frequency} · ` : ""}{t.due_date ? `due ${fmtDate(t.due_date)}` : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-400"><Clock size={13} /> {t.minutes} min</span>
                  <button onClick={() => setTaskStatus(t.id, "dismissed")} className="shrink-0 text-xs font-bold text-gray-300 hover:text-gray-500">Skip</button>
                </Card>
              ))}
              {pending.length === 0 && <Card className="p-6 text-center text-sm text-gray-500">Nothing due. Add items to your <Link className="link" href={`/hub/home/inventory${q}`}>home inventory</Link> and your plan builds itself.</Card>}
              {done.length > 0 && (
                <p className="pt-1 text-xs font-semibold text-gray-400">{done.length} completed — nice work.</p>
              )}
            </div>
          </section>

          {/* REPAIRS */}
          <section>
            <SectionLabel>Repairs</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <Hammer className="text-teal" size={22} />
                <p className="mt-3 font-bold">Keep track of repairs</p>
                <p className="mt-1 text-sm text-gray-500">Log it now, budget for it properly.</p>
                <div className="mt-3 flex gap-2">
                  <input className="input" placeholder="e.g. Fix fence gate latch" value={newRepair}
                    onChange={(e) => setNewRepair(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newRepair.trim()) { addTask({ title: newRepair.trim() }); setNewRepair(""); } }} />
                  <button className="btn btn-primary btn-sm shrink-0"
                    disabled={!newRepair.trim()}
                    onClick={() => { addTask({ title: newRepair.trim() }); setNewRepair(""); }}>Add</button>
                </div>
              </Card>
              <Card className="p-5">
                <ClipboardCheck className="text-teal" size={22} />
                <p className="mt-3 font-bold">Get an inspection</p>
                <p className="mt-1 text-sm text-gray-500">Every 5–10 years, a professional look-over prevents expensive surprises.</p>
                <Link href={`/hub/services${q}`} className="link mt-3 inline-block text-sm">Find a home inspector</Link>
              </Card>
            </div>
          </section>

          {/* EDUCATION */}
          <section>
            <SectionLabel>Featured guides</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-3">
              {ARTICLES.slice(3, 6).map((a) => (
                <Card key={a.slug} className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{a.tag}</p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug">{a.title}</p>
                  <p className="mt-1.5 line-clamp-3 text-xs text-gray-500">{a.excerpt}</p>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* RAIL */}
        <aside className="space-y-6">
          <section>
            <Card className="p-5">
              <p className="text-center font-bold">Find help when you need it</p>
              <Link href={`/hub/services${q}`} className="mt-3 flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm text-gray-400 hover:border-teal">
                <Search size={15} /> What do you need done?
              </Link>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {PROVIDER_CATEGORIES.slice(0, 5).map((c) => (
                  <Link key={c} href={`/hub/services${q}${q ? "&" : "?"}cat=${encodeURIComponent(c)}`}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-teal-soft hover:text-teal-deep">
                    {c}
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-gray-400">
                Not sure what you need? <Link href={`/hub/services${q}`} className="link">Browse categories</Link>
              </p>
            </Card>
          </section>
          <section>
            <SectionLabel>Recommended professionals</SectionLabel>
            <Card className="p-5">
              <p className="text-sm font-bold">Trusted help is here</p>
              <p className="mt-1 text-sm text-gray-500">
                You have <b>{PROVIDERS.filter((p) => p.recommended).length} pros</b> personally vetted by your advisor
                {" "}and <b>{PROVIDERS.length}</b> verified locals in the network.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PROVIDERS.filter((p) => p.recommended).map((p) => <Pill key={p.id} tone="green">👍 {p.name}</Pill>)}
              </div>
              <Link href={`/hub/services${q}`} className="link mt-3 inline-block text-sm">View recommended pros</Link>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  );
}
