"use client";
import { useMemo, useState } from "react";
import { usePro } from "@/lib/pro-store";
import { PROVIDER_CATEGORIES } from "@/lib/demo";
import { Card, Modal, Field, Pill } from "@/components/ui";
import { Search, ThumbsUp, Plus, ShieldCheck } from "lucide-react";

export default function ProProviders() {
  const { recommended, toggleRecommend, providers, addProvider } = usePro();
  const [qtext, setQtext] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [requested, setRequested] = useState<string[]>([]);

  const list = useMemo(() => {
    let l = providers;
    if (cat) l = l.filter((p) => p.category === cat);
    if (qtext) l = l.filter((p) => (p.name + p.category).toLowerCase().includes(qtext.toLowerCase()));
    return [...l].sort((a, b) => Number(recommended.includes(b.id)) - Number(recommended.includes(a.id)));
  }, [providers, cat, qtext, recommended]);

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
        {providers.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm font-bold">Your directory is empty</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-gray-500">
              Add the trades you actually use — the plumber who answers, the electrician who shows up.
              Whoever you recommend appears in every client&apos;s hub under Home Services, with your
              thumbs-up on it. Until then your clients see an empty list, not strangers.
            </p>
            <button className="btn btn-primary btn-md mt-4" onClick={() => setAddOpen(true)}><Plus size={15} /> Add your first provider</button>
          </Card>
        )}
        {list.map((p) => {
          const on = recommended.includes(p.id);
          return (
            <Card key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.name}</p>
                  {p.verified
                    ? <Pill tone="teal"><ShieldCheck size={11} /> Verified</Pill>
                    : <Pill tone="gold">Pending verification</Pill>}
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
        <AddProviderForm onAdd={async (p) => {
          await addProvider(p);
          setRequested((r) => [...r, p.name]);
          setAddOpen(false);
        }} />
      </Modal>
    </div>
  );
}

function AddProviderForm({ onAdd }: { onAdd: (p: { name: string; category: string; phone: string; email: string }) => void | Promise<void> }) {
  const [f, setF] = useState({ name: "", category: PROVIDER_CATEGORIES[0], phone: "", email: "" });
  const [saving, setSaving] = useState(false);
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
      <button className="btn btn-primary btn-lg w-full" disabled={!f.name.trim() || saving}
        onClick={async () => {
          setSaving(true);
          try { await onAdd({ ...f, name: f.name.trim() }); } finally { setSaving(false); }
        }}>
        {saving ? "Submitting…" : "Submit for verification"}
      </button>
    </div>
  );
}
