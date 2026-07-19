"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHub } from "@/lib/store";
import { PROVIDER_CATEGORIES, BUYER_PROVIDER_CATEGORIES } from "@/lib/demo";
import { Card, Modal, Pill } from "@/components/ui";
import { Search, ThumbsUp, Phone, ShieldCheck } from "lucide-react";

function ServicesInner() {
  const params = useSearchParams();
  const { pro, createLead, providers, demo, hub } = useHub();
  // A buyer needs lawyers, lenders and inspectors — not gutter cleaners.
  const isBuyer = hub?.journey === "buying";
  const categories = isBuyer ? BUYER_PROVIDER_CATEGORIES : PROVIDER_CATEGORIES;
  const [cat, setCat] = useState<string | null>(params.get("cat"));
  const [qtext, setQtext] = useState("");
  const [req, setReq] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const list = useMemo(() => {
    let l = providers;
    if (cat) l = l.filter((p) => p.category === cat);
    if (qtext) l = l.filter((p) => (p.name + p.category + p.blurb).toLowerCase().includes(qtext.toLowerCase()));
    return [...l].sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false));
  }, [providers, cat, qtext]);
  const proName = (pro as { first_name?: string })?.first_name || "your advisor";
  const directoryEmpty = providers.length === 0;

  return (
    <div>
      <section className="bg-gradient-to-r from-teal-deep to-teal text-white">
        <div className="container-x py-8 sm:py-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Home Services</h1>
          <p className="mt-1 text-sm text-white/70">{isBuyer ? "The people you will need between offer and possession day." : "Find help when you need it — starting with pros your advisor trusts."}</p>
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
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c === cat ? null : c)} className={`btn btn-sm shrink-0 ${cat === c ? "btn-primary" : "btn-ghost"}`}>{c}</button>
          ))}
        </div>

        {!directoryEmpty && (
          <Card className="mt-5 flex items-center gap-3 bg-emerald-50/60 p-4">
            <ThumbsUp size={18} className="shrink-0 text-emerald-600" />
            <p className="text-sm"><b>Look for the thumbs-up.</b> Those pros were personally added by {proName} — people they&apos;ve actually hired or vouched for. Nobody pays to be on this list.</p>
          </Card>
        )}

        {/* No invented businesses for real clients — an empty directory says so plainly. */}
        {directoryEmpty && (
          <Card className="mt-5 p-6 text-center">
            <p className="text-sm font-bold">No trusted pros listed yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-gray-500">
              {proName} hasn&apos;t added their trusted trades to your hub yet. Tell them what you need
              and they&apos;ll point you at someone they actually use — that&apos;s the whole idea.
            </p>
            <button className="btn btn-primary btn-md mt-4" onClick={() => { setSent(false); setReq("a trusted pro"); }}>
              Ask {proName} for a referral
            </button>
          </Card>
        )}

        <div className="mt-5 space-y-3">
          {!directoryEmpty && list.length === 0 && (
            <Card className="p-6 text-center text-sm text-gray-500">
              Nothing matches that search. Try another category, or ask {proName} directly.
            </Card>
          )}
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

        {/* Provenance must match reality: every row here was added by a pro.
            There is no public-records sourcing and no independent vetting step. */}
        <p className="mt-6 text-center text-[11px] text-gray-400">
          These pros were added by {proName} from their own network. Always confirm licensing and get written quotes.
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
