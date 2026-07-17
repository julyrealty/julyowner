"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHub } from "@/lib/store";
import { cad, fmtDate } from "@/lib/calc";
import { Card, SectionLabel, Modal, Field } from "@/components/ui";
import { Gauge } from "@/components/charts";
import { Umbrella, ShieldCheck, FolderOpen, AlertTriangle, Grid2x2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { HomeSubnav } from "@/components/home-subnav";

export default function MyHomeOverview() {
  const { hub, inventory, tasks, updateHub } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  const [edit, setEdit] = useState(false);

  const highRisk = inventory.filter((i) => (i.failure_risk ?? 0) >= 6.5).length;
  const itemTasks = tasks.filter((t) => t.item_id).length;
  const avgRisk = inventory.length
    ? inventory.reduce((s, i) => s + (i.failure_risk ?? 0), 0) / inventory.length
    : 0;
  const timeline = [...tasks].filter((t) => t.status === "pending" && t.due_date).slice(0, 3);

  return (
    <div>
      <HomeSubnav current="/hub/home" />
      <div className="container-x py-8">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Home</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* PROPERTY CARD */}
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex h-24 items-center justify-center rounded-xl bg-teal-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal text-white shadow-lg">🏠</span>
              </div>
              <p className="mt-4 text-center text-lg font-extrabold">{hub?.address1}</p>
              <p className="text-center text-sm text-gray-500">{[hub?.city, hub?.region, hub?.postal].filter(Boolean).join(", ")}</p>
              <div className="mt-5 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between py-2.5"><span className="text-gray-500">Purchase price</span><span className="tabular font-bold">{hub?.purchase_price ? cad(hub.purchase_price) : "—"}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-gray-500">Purchase date</span><span className="font-bold">{hub?.purchase_date ? fmtDate(hub.purchase_date) : "—"}</span></div>
              </div>
              <button className="link mx-auto mt-3 block text-sm" onClick={() => setEdit(true)}>Update home details</button>
            </Card>

            <section>
              <SectionLabel>Documents</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Umbrella, label: "Insurance" },
                  { icon: ShieldCheck, label: "Warranty" },
                  { icon: FolderOpen, label: "Everything else" },
                ].map((d) => (
                  <Link key={d.label} href={`/hub/home/documents${q}`} className="card flex flex-col items-center gap-1.5 p-3.5 text-center hover:border-teal">
                    <d.icon size={20} className="text-teal" />
                    <span className="text-[11px] font-bold leading-tight">{d.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* INVENTORY + TIMELINE */}
          <div className="space-y-6">
            <section>
              <SectionLabel right={<Link href={`/hub/home/inventory${q}`} className="link text-xs">Manage</Link>}>Inventory</SectionLabel>
              <Card className="grid grid-cols-3 divide-x divide-line p-0 text-center">
                <div className="p-4">
                  <AlertTriangle size={18} className={`mx-auto ${highRisk ? "text-coral" : "text-gray-300"}`} />
                  <p className={`tabular mt-1 text-2xl font-extrabold ${highRisk ? "text-coral" : ""}`}>{highRisk}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">High failure risk</p>
                </div>
                <div className="p-4">
                  <Grid2x2 size={18} className="mx-auto text-gray-300" />
                  <p className="tabular mt-1 text-2xl font-extrabold">{inventory.length}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Items</p>
                </div>
                <div className="p-4">
                  <CheckCircle2 size={18} className="mx-auto text-gray-300" />
                  <p className="tabular mt-1 text-2xl font-extrabold">{itemTasks}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Item tasks</p>
                </div>
              </Card>
            </section>

            <section>
              <SectionLabel>Take inventory of your home</SectionLabel>
              <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Know what&apos;s under your roof</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Add your furnace, water heater, and appliances to see each item&apos;s age and failure risk —
                    and get a maintenance plan generated automatically from what you actually own.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/hub/home/inventory${q}`} className="btn btn-primary btn-md">Set up home inventory</Link>
                    <a href="mailto:hello@julyrealty.com?subject=JULYOwner home inventory visit" className="btn btn-ghost btn-md">Do it for me</a>
                  </div>
                </div>
                <div className="shrink-0 text-center">
                  <Gauge value={avgRisk} />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Failure risk</p>
                </div>
              </Card>
            </section>

            <section>
              <SectionLabel right={<Link href={`/hub/home/timeline${q}`} className="link text-xs">See more</Link>}>Timeline</SectionLabel>
              <Card className="p-5">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-teal-soft" />
                  {timeline.map((t) => (
                    <div key={t.id} className="relative z-10 w-1/3 px-1 text-center">
                      <div className="mx-auto h-3 w-3 rounded-full border-2 border-teal bg-white" />
                      <p className="mt-2 text-[11px] font-bold text-gray-400">{t.due_date ? fmtDate(t.due_date) : ""}</p>
                      <p className="truncate text-xs font-semibold">{t.title}</p>
                    </div>
                  ))}
                  {timeline.length === 0 && <p className="relative z-10 w-full bg-white text-center text-sm text-gray-400">Add inventory to build your timeline</p>}
                </div>
              </Card>
            </section>
          </div>
        </div>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Update home details">
        <HomeDetailsForm
          price={hub?.purchase_price ?? 0}
          date={hub?.purchase_date ?? ""}
          onSave={async (price, date) => { await updateHub({ purchase_price: price || null, purchase_date: date || null }); setEdit(false); }}
        />
      </Modal>
    </div>
  );
}

function HomeDetailsForm({ price, date, onSave }: { price: number; date: string; onSave: (p: number, d: string) => Promise<void> }) {
  const [p, setP] = useState(price);
  const [d, setD] = useState(date?.slice(0, 10) ?? "");
  return (
    <div className="space-y-4">
      <Field label="Purchase price"><input type="number" className="input tabular" value={p || ""} onChange={(e) => setP(Number(e.target.value))} /></Field>
      <Field label="Purchase date"><input type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} /></Field>
      <button className="btn btn-primary btn-lg w-full" onClick={() => onSave(p, d)}>Save</button>
    </div>
  );
}
