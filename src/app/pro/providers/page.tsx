"use client";
import { useMemo, useState } from "react";
import { usePro } from "@/lib/pro-store";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/demo";
import { Card, Modal, Field, Pill } from "@/components/ui";
import { Search, ThumbsUp, Plus, ShieldCheck } from "lucide-react";

export default function ProProviders() {
  const { recommended, toggleRecommend } = usePro();
  const [qtext, setQtext] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [requested, setRequested] = useState<string[]>([]);

  const list = useMemo(() => {
    let l = PROVIDERS;
    if (cat) l = l.filter((p) => p.category === cat);
    if (qtext) l = l.filter((p) => (p.name + p.category).toLowerCase().includes(qtext.toLowerCase()));
    return [...l].sort((a, b) => Number(recommended.includes(b.id)) - Number(recommended.includes(a.id)));
  }, [cat, qtext, recommended]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Service providers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your recommendations surface first in every client hub — your network is part of your value.
          </p>
        </div>
        <button className="btn btn-dark btn-md" onClick={() => setAddOpen(true)}><Plus size={16} /> Add provider</button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input input-lead" placeholder="Search providers…" value={qtext} onChange={(e) => setQtext(e.target.value)} />
        </div>
        <select className="input sm:w-56" value={cat ?? ""} onChange={(e) => setCat(e.target.value || null)}>
          <option value="">All categories</option>
          {PROVIDER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {list.map((p) => {
          const on = recommended.includes(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.name}</p>
                  <Pill tone="teal"><ShieldCheck size={11} /> Verified</Pill>
                  {on && <Pill tone="green"><ThumbsUp size={11} /> Recommended by you</Pill>}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">{p.category} · {p.city} · {p.phone}</p>
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{p.blurb}</p>
              </div>
              <button className={`btn btn-sm shrink-0 ${on ? "btn-primary" : "btn-ghost"}`} onClick={() => toggleRecommend(p.id)}>
                <ThumbsUp size={14} /> {on ? "Recommended" : "Recommend"}
              </button>
            </Card>
          );
        })}
      </div>

      {requested.length > 0 && (
        <Card className="mt-5 bg-cream p-4 text-sm">
          <b>Pending verification:</b> {requested.join(", ")} — we confirm licensing and contact details before a provider goes live for clients.
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a service provider">
        <AddProviderForm onAdd={(name) => { setRequested((r) => [...r, name]); setAddOpen(false); }} />
      </Modal>
    </div>
  );
}

function AddProviderForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [f, setF] = useState({ name: "", category: PROVIDER_CATEGORIES[0], phone: "", email: "" });
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Know someone great who isn&apos;t listed? Submit them — once verified, you can recommend them to every client.</p>
      <Field label="Business name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
      <Field label="Category">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {PROVIDER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      </div>
      <button className="btn btn-primary btn-lg w-full" disabled={!f.name.trim()} onClick={() => onAdd(f.name.trim())}>Submit for verification</button>
    </div>
  );
}
