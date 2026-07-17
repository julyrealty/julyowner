"use client";
import { useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import { INVENTORY_CATALOG, findCatalogItem } from "@/lib/demo";
import { Card, Modal, Pill, Field } from "@/components/ui";
import { HomeSubnav } from "@/components/home-subnav";
import { Search, Plus, Check, Trash2 } from "lucide-react";

type WizardState = { itemType: string; step: 1 | 2 | 3 | 4; brand: string; age: number; keepTasks: string[] };

export default function InventoryPage() {
  const { inventory, addInventory, removeInventory } = useHub();
  const [filter, setFilter] = useState<"All" | "Added" | "Missing">("All");
  const [qtext, setQtext] = useState("");
  const [wiz, setWiz] = useState<WizardState | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const added = useMemo(() => new Set(inventory.map((i) => i.item_type)), [inventory]);

  function open(itemType: string) {
    if (added.has(itemType)) { setDetail(itemType); return; }
    const cat = findCatalogItem(itemType);
    setWiz({ itemType, step: 1, brand: "", age: 0, keepTasks: cat?.tasks.map((t) => t.title) ?? [] });
  }

  const detailItem = inventory.find((i) => i.item_type === detail);

  return (
    <div>
      <HomeSubnav current="/hub/home/inventory" />
      <div className="container-x py-8">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">Everything under your roof — with age, risk, and a plan for each item.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-10" placeholder="Search items…" value={qtext} onChange={(e) => setQtext(e.target.value)} />
          </div>
          <div className="flex gap-1.5">
            {(["All", "Added", "Missing"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}>{f}</button>
            ))}
          </div>
        </div>

        {INVENTORY_CATALOG.map((area) => {
          const items = area.items.filter((i) => {
            if (qtext && !i.type.toLowerCase().includes(qtext.toLowerCase())) return false;
            if (filter === "Added") return added.has(i.type);
            if (filter === "Missing") return !added.has(i.type);
            return true;
          });
          if (items.length === 0) return null;
          return (
            <section key={area.area} className="mt-8">
              <p className="section-label mb-3">{area.area}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((i) => {
                  const isAdded = added.has(i.type);
                  const inv = inventory.find((x) => x.item_type === i.type);
                  const risky = (inv?.failure_risk ?? 0) >= 6.5;
                  return (
                    <button key={i.type} onClick={() => open(i.type)}
                      className={`card group relative p-4 text-left transition hover:border-teal ${isAdded ? "border-teal/50 bg-teal-soft/40" : ""}`}>
                      {isAdded ? (
                        <span className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full ${risky ? "bg-coral" : "bg-teal"} text-white`}>
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                      ) : (
                        <span className="absolute right-2.5 top-2.5 text-gray-300 transition group-hover:text-teal"><Plus size={16} /></span>
                      )}
                      <p className="pr-5 text-sm font-bold leading-tight">{i.type}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {isAdded && inv
                          ? `${inv.brand ? inv.brand + " · " : ""}${inv.age_years != null ? inv.age_years + " yrs old" : "age unknown"}`
                          : `typical life ${i.lifeYears[0]}–${i.lifeYears[1]} yrs`}
                      </p>
                      {isAdded && risky && <Pill tone="red">High failure risk</Pill>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <Card className="mt-10 flex flex-col items-center justify-between gap-3 bg-cream p-5 sm:flex-row">
          <p className="text-sm"><b>Don&apos;t want to set this up yourself?</b> Have someone visit your home and do it in about an hour.</p>
          <a className="btn btn-dark btn-md shrink-0" href="mailto:hello@julyrealty.com?subject=JULYOwner inventory visit">Do it for me</a>
        </Card>
      </div>

      {/* ADD WIZARD */}
      <Modal open={!!wiz} onClose={() => setWiz(null)} title={wiz ? `Add ${wiz.itemType}` : ""}>
        {wiz && <Wizard wiz={wiz} setWiz={setWiz} onDone={async () => {
          await addInventory(wiz.itemType, { brand: wiz.brand || undefined, age_years: wiz.age, keepTasks: wiz.keepTasks });
          setWiz(null);
        }} />}
      </Modal>

      {/* ITEM DETAIL */}
      <Modal open={!!detailItem} onClose={() => setDetail(null)} title={detailItem?.item_type}>
        {detailItem && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Brand</span><b>{detailItem.brand || "—"}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">Age</span><b>{detailItem.age_years != null ? `${detailItem.age_years} years` : "—"}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">Typical life</span><b>{detailItem.typical_life || "—"}</b></div>
            <div className="flex justify-between"><span className="text-gray-500">Failure risk</span>
              <b className={(detailItem.failure_risk ?? 0) >= 6.5 ? "text-coral" : (detailItem.failure_risk ?? 0) >= 4 ? "text-amber-600" : "text-emerald-600"}>
                {(detailItem.failure_risk ?? 0).toFixed(1)} / 10
              </b>
            </div>
            <button className="btn btn-ghost btn-md w-full text-coral" onClick={() => { removeInventory(detailItem.id); setDetail(null); }}>
              <Trash2 size={15} /> Remove item
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Wizard({ wiz, setWiz, onDone }: { wiz: WizardState; setWiz: (w: WizardState) => void; onDone: () => Promise<void> }) {
  const cat = findCatalogItem(wiz.itemType);
  const total = 3;
  return (
    <div>
      <p className="mb-4 text-xs font-bold text-gray-400">Step {wiz.step} of {total} <span className="float-right rounded-full bg-gray-100 px-2 py-0.5">{wiz.itemType}</span></p>

      {wiz.step === 1 && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold">The basics</h4>
          <Field label="Brand (optional)" hint="Snap the product label later — model and serial help with repairs and recalls.">
            <input className="input" placeholder="e.g. Carrier, Rheem, Bosch" value={wiz.brand} onChange={(e) => setWiz({ ...wiz, brand: e.target.value })} autoFocus />
          </Field>
          <button className="btn btn-primary btn-lg w-full" onClick={() => setWiz({ ...wiz, step: 2 })}>Next</button>
        </div>
      )}

      {wiz.step === 2 && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold">How old is it?</h4>
          <div className="py-2 text-center">
            <span className="tabular rounded-full bg-teal-soft px-4 py-1.5 text-lg font-extrabold text-teal-deep">
              {wiz.age === 0 ? "New" : `${wiz.age} year${wiz.age > 1 ? "s" : ""}`}
            </span>
            <input type="range" min={0} max={30} value={wiz.age}
              onChange={(e) => setWiz({ ...wiz, age: Number(e.target.value) })}
              className="mt-5 w-full accent-[var(--teal)]" />
            <p className="mt-2 text-xs text-gray-400">Typical life: {cat ? `${cat.lifeYears[0]}–${cat.lifeYears[1]} years` : "varies"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-ghost btn-md" onClick={() => setWiz({ ...wiz, age: Math.round(((cat?.lifeYears[0] ?? 10) + (cat?.lifeYears[1] ?? 20)) / 4), step: 3 })}>Not sure</button>
            <button className="btn btn-primary btn-md" onClick={() => setWiz({ ...wiz, step: 3 })}>Next</button>
          </div>
        </div>
      )}

      {wiz.step === 3 && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold">Your management plan</h4>
          <p className="text-sm text-gray-500">We built these tasks for this item — untick anything you don&apos;t want reminders for.</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {(cat?.tasks ?? []).map((t) => {
              const on = wiz.keepTasks.includes(t.title);
              return (
                <label key={t.title} className="flex cursor-pointer items-center gap-3 p-3.5">
                  <input type="checkbox" checked={on}
                    onChange={() => setWiz({ ...wiz, keepTasks: on ? wiz.keepTasks.filter((k) => k !== t.title) : [...wiz.keepTasks, t.title] })}
                    className="h-4.5 w-4.5 accent-[var(--teal)]" />
                  <span className="flex-1 text-sm font-semibold">{t.title}</span>
                  <span className="text-xs text-gray-400">{t.frequency}</span>
                </label>
              );
            })}
          </div>
          <button className="btn btn-primary btn-lg w-full" onClick={onDone}>Save item</button>
        </div>
      )}
    </div>
  );
}
