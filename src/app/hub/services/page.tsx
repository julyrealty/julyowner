"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHub } from "@/lib/store";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/demo";
import { Card, Modal, Pill } from "@/components/ui";
import { Search, ThumbsUp, Phone, ShieldCheck } from "lucide-react";

function ServicesInner() {
  const params = useSearchParams();
  const { pro, createLead } = useHub();
  const [cat, setCat] = useState<string | null>(params.get("cat"));
  const [qtext, setQtext] = useState("");
  const [req, setReq] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const list = useMemo(() => {
    let l = PROVIDERS;
    if (cat) l = l.filter((p) => p.category === cat);
    if (qtext) l = l.filter((p) => (p.name + p.category + p.blurb).toLowerCase().includes(qtext.toLowerCase()));
    return [...l].sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false));
  }, [cat, qtext]);

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Home Services</h1>
          <p className="mt-1 text-sm text-white/70">Find help when you need it — starting with pros your advisor trusts.</p>
        </div>
      </section>

      <div className="container-x py-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input input-lead" placeholder="What do you need done?" value={qtext} onChange={(e) => setQtext(e.target.value)} />
          </div>
        </div>
        <div className="no-bar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCat(null)} className={`btn btn-sm shrink-0 ${!cat ? "btn-primary" : "btn-ghost"}`}>All</button>
          {PROVIDER_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`btn btn-sm shrink-0 ${cat === c ? "btn-primary" : "btn-ghost"}`}>{c}</button>
          ))}
        </div>

        <Card className="mt-5 flex items-center gap-3 bg-emerald-50/60 p-4">
          <ThumbsUp size={18} className="shrink-0 text-emerald-600" />
          <p className="text-sm"><b>Look for the thumbs-up.</b> Those pros were personally added by {(pro as { first_name?: string })?.first_name || "your advisor"} — people they&apos;ve actually hired or vouched for. Nobody pays to be on this list.</p>
        </Card>

        <div className="mt-5 space-y-3">
          {list.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.name}</p>
                  {p.recommended && <Pill tone="green"><ThumbsUp size={11} /> Recommended</Pill>}
                  {p.verified && <Pill tone="teal"><ShieldCheck size={11} /> Verified</Pill>}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">{p.category} · {p.city}</p>
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-600">{p.blurb}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a className="btn btn-ghost btn-sm" href={`tel:${p.phone.replace(/[^0-9]/g, "")}`}><Phone size={14} /> {p.phone}</a>
                <button className="btn btn-primary btn-sm" onClick={() => { setSent(false); setReq(p.name); }}>Request service</button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">No pros match — try another category.</Card>}
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          Providers are sourced from your advisor&apos;s network and public business records. Always confirm licensing and get written quotes.
        </p>
      </div>

      <Modal open={!!req} onClose={() => setReq(null)} title={`Request ${req}`}>
        {sent ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold">Request sent ✓</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">We passed your details along — expect a call or email shortly. Your advisor was cc&apos;d so nothing falls through the cracks.</p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => setReq(null)}>Done</button>
          </div>
        ) : (
          <RequestForm onSend={async (msg) => { await createLead("service", `${req}: ${msg}`); setSent(true); }} />
        )}
      </Modal>
    </div>
  );
}

function RequestForm({ onSend }: { onSend: (msg: string) => Promise<void> }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-4">
      <textarea className="input min-h-28" placeholder="What needs doing? When works for you?" value={msg} onChange={(e) => setMsg(e.target.value)} autoFocus />
      <button className="btn btn-coral btn-lg w-full" disabled={!msg.trim()} onClick={() => onSend(msg.trim())}>Send request</button>
    </div>
  );
}

export default function ServicesPage() {
  return <Suspense><ServicesInner /></Suspense>;
}
