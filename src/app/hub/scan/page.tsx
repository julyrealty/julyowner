"use client";
// AI Review — the document scanners, presented as a first-class part of the hub.
// White-labelled: the buyer picks what they want read, drops the file in, and
// stays here throughout. Nothing to sign up for, no second account.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileSearch, Building2, ScrollText, ClipboardCheck, FileSignature,
  UploadCloud, Sparkles, ArrowRight, ShieldCheck, Clock, Check, AlertTriangle, Loader2, Coins,
} from "lucide-react";
import { useHub, type Doc } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { relTime } from "@/lib/calc";
import { useCredits, useHelcimScript, buyCredits } from "@/lib/credits";
import { Card, SectionLabel, Modal, Pill } from "@/components/ui";
import { ScanFlow } from "@/components/scan-flow";

/** A persisted review — survives closing the dialog, or the whole browser. */
type ScanRow = {
  id: string; document_name: string | null; scan_type: string;
  status: "pending" | "complete" | "failed";
  summary: string | null; findings: string[]; items: { item_type: string; brand: string | null; age_years: number | null }[];
  error: string | null; created_at: string; completed_at: string | null;
};

type Scanner = {
  key: string; label: string; icon: typeof FileSearch;
  tag: string; pitch: string; finds: string[];
};

/** Scanner ids match BuyerAiPro's, and ho-scan's SCAN_TYPES allow-list. */
const SCANNERS: Scanner[] = [
  {
    key: "strata", label: "Strata documents", icon: Building2, tag: "Condos & townhomes",
    pitch: "Hundreds of pages of minutes, and the one paragraph that matters is on page 214.",
    finds: ["Special levies — passed or looming", "Contingency fund health", "Building repairs and their history", "Bylaws that affect pets, rentals, age"],
  },
  {
    key: "inspection", label: "Inspection report", icon: FileSearch, tag: "Every property",
    pitch: "Separates the scary-sounding from the genuinely expensive.",
    finds: ["Aging systems and what they cost to replace", "Safety and structural flags", "What to negotiate on", "What is normal for the age"],
  },
  {
    key: "title", label: "Title search", icon: ScrollText, tag: "Before you remove subjects",
    pitch: "Who else has a claim on this property, in plain language.",
    finds: ["Liens and charges", "Easements and rights-of-way", "Covenants and building schemes", "Anything that follows you after closing"],
  },
  {
    key: "pds", label: "Property disclosure", icon: ClipboardCheck, tag: "Read between the lines",
    pitch: "What the seller declared — and the questions their answers raise.",
    finds: ["Declared defects and repairs", "Water, mould and drainage history", "Unpermitted work", "Notable blanks and 'do not know' answers"],
  },
  {
    key: "contract", label: "Contract of purchase", icon: FileSignature, tag: "Before you sign",
    pitch: "Dates, deposits and subjects, checked against what you agreed.",
    finds: ["Subject removal deadlines", "Deposit amounts and timing", "Included and excluded items", "Completion and possession dates"],
  },
];

export default function AiReview() {
  const { addDoc, demo, hub } = useHub();
  const params = useSearchParams();
  const q = params.get("demo") === "1" ? "?demo=1" : "";

  const [pending, setPending] = useState<Scanner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanDoc, setScanDoc] = useState<Doc | null>(null);
  const [scanType, setScanType] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ScanRow[] | null>(null);
  const [open, setOpen] = useState<ScanRow | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [topUp, setTopUp] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [bought, setBought] = useState<number | null>(null);

  const { balance, pricing, refresh: refreshCredits } = useCredits(!demo);
  const helcimReady = useHelcimScript();

  /** Whether the current balance covers a given scanner, for the price pill. */
  const affordable = (key: string) => {
    const cost = pricing?.costs?.[key] ?? 0;
    if (!pricing?.enforced || cost === 0 || balance === null) return true;
    return balance >= cost;
  };

  async function purchase(packKey: string) {
    setBuying(packKey); setErr(null);
    const res = await buyCredits(packKey);
    setBuying(null);
    if (res.ok) {
      setBought(res.coins);
      await refreshCredits();
      return;
    }
    if (!res.cancelled) setErr(res.error ?? "That didn't go through.");
  }
  const fileRef = useRef<HTMLInputElement>(null);

  /* Your reviews — loaded from the server, so they are here whether or not
     you stayed on this page while one was running. */
  const loadRows = useCallback(async () => {
    if (demo || !hub) { setRows([]); return; }
    try {
      const { data } = await sb().functions.invoke("ho-scan", { body: { action: "list", hub_id: hub.id } });
      setRows(((data as { scans?: ScanRow[] })?.scans) ?? []);
    } catch { setRows([]); }
  }, [demo, hub]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  /** Stop waiting on a review. The upstream job may already be running, so this
      stops the tracking rather than promising a refund. */
  const cancelScan = useCallback(async (scanId: string) => {
    if (!hub) return;
    setCancelling(scanId);
    try {
      await sb().functions.invoke("ho-scan", { body: { action: "cancel", hub_id: hub.id, scan_id: scanId } });
      await loadRows();
    } catch {
      setErr("Couldn't cancel that one. Refresh and try again.");
    } finally {
      setCancelling(null);
    }
  }, [hub, loadRows]);

  // While something is running, refresh quietly so it flips to Ready on its own.
  const anyRunning = (rows ?? []).some((r) => r.status === "pending");
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => { void loadRows(); }, 15000);
    return () => clearInterval(t);
  }, [anyRunning, loadRows]);

  function choose(s: Scanner) {
    setErr(null);
    setPending(s);
    fileRef.current?.click();
  }

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    const scanner = pending;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !scanner) return;
    if (file.size > 20 * 1024 * 1024) { setErr(`${file.name} is over the 20 MB limit.`); return; }
    setUploading(true);
    try {
      const doc = await addDoc(
        { folder: "Purchase", name: file.name, size_bytes: file.size, tags: [scanner.key] },
        file,
      );
      setScanType(scanner.key);
      setScanDoc(doc);
    } catch {
      setErr("That upload didn't go through. Please try again.");
    } finally {
      setUploading(false);
      setPending(null);
    }
  }

  return (
    <div>
      <section className="dark-panel">
        <div className="container-x py-8 sm:py-10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
            <Sparkles size={14} /> AI Review
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            The boring documents, read properly.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            Strata minutes, inspections, title, disclosures, contracts — the paperwork that decides
            whether a home is a good buy, and the part nobody reads closely enough. Drop a file in and
            get the findings in a couple of minutes.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-white/60">
            <span className="flex items-center gap-1.5"><Clock size={13} /> Usually 1–3 minutes</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Private to your hub</span>
            <span className="flex items-center gap-1.5"><UploadCloud size={13} /> PDF, up to 20 MB</span>
          </div>
        </div>
      </section>

      <div className="container-x py-8">
        {err && <Card className="mb-4 border-coral/40 p-4 text-sm text-coral">{err}</Card>}
        {uploading && (
          <Card className="mb-4 flex items-center gap-3 p-4 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-teal" />
            Uploading your document…
          </Card>
        )}

        {/* YOUR REVIEWS — the record of every scan, running or finished. */}
        {rows && rows.length > 0 && (
          <section className="mb-8">
            <SectionLabel>Your reviews</SectionLabel>
            <Card className="divide-y divide-line">
              {rows.map((r) => {
                const meta = SCANNERS.find((s) => s.key === r.scan_type);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-4">
                    <button onClick={() => r.status === "complete" && setOpen(r)}
                      disabled={r.status !== "complete"}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition enabled:hover:opacity-70 disabled:cursor-default">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        r.status === "complete" ? "bg-teal-soft text-teal-deep"
                        : r.status === "failed" ? "bg-red-50 text-coral" : "bg-gray-100 text-gray-400"}`}>
                        {r.status === "complete" ? <Check size={17} strokeWidth={3} />
                          : r.status === "failed" ? <AlertTriangle size={16} />
                          : <Loader2 size={16} className="animate-spin" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{r.document_name || "Document"}</span>
                        <span className="block text-[11px] text-gray-400">
                          {meta?.label ?? r.scan_type} · {r.status === "pending"
                            ? `started ${relTime(r.created_at)} — still reading`
                            : r.status === "failed" ? (r.error || "failed")
                            : `ready ${relTime(r.completed_at ?? r.created_at)}`}
                        </span>
                      </span>
                    </button>
                    {r.status === "complete" && <span className="shrink-0 text-[12px] font-bold text-teal-deep">View</span>}
                    {r.status === "pending" && (
                      <button
                        onClick={() => cancelScan(r.id)}
                        disabled={cancelling === r.id}
                        className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] font-bold text-gray-500 transition hover:border-coral hover:text-coral disabled:opacity-50"
                      >
                        {cancelling === r.id ? "Stopping…" : "Cancel"}
                      </button>
                    )}
                  </div>
                );
              })}
            </Card>
            {anyRunning && (
              <p className="mt-2 text-[11px] text-gray-400">
                Still reading — you can leave this page or close the browser. We&apos;ll email you when it&apos;s ready
                and it will be waiting here.
              </p>
            )}
          </section>
        )}

        {/* CREDITS — shown only once there is a real balance to show. In demo
            mode there is no ledger, so the strip stays out of the way. */}
        {!demo && balance !== null && (
          <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <Coins size={16} className="text-teal-deep" />
                {balance} credit{balance === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                {balance === 0
                  ? "You've used your free reviews. Top up to keep going."
                  : pricing?.enforced
                    ? "Each review costs credits — the price is on every card below."
                    : "Reviews are free while we finish setting this up."}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm shrink-0" onClick={() => setTopUp(true)}>
              Add credits <ArrowRight size={14} />
            </button>
          </Card>
        )}

        <SectionLabel right={<Link href={`/hub/home/documents${q}`} className="link text-xs">All my documents</Link>}>
          Choose what to review
        </SectionLabel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCANNERS.map((s) => (
            <button key={s.key} onClick={() => choose(s)} disabled={uploading}
              className="card group flex flex-col p-5 text-left transition hover:border-teal disabled:opacity-60">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal-deep transition group-hover:bg-teal group-hover:text-white">
                  <s.icon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold leading-tight">{s.label}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{s.tag}</p>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-600">{s.pitch}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {s.finds.map((f) => (
                  <li key={f} className="flex gap-2 text-[12px] leading-relaxed text-gray-500">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />{f}
                  </li>
                ))}
              </ul>
              <span className="mt-4 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-deep">
                  <UploadCloud size={15} /> Upload &amp; review
                </span>
                {/* Price before the click, never after — nobody should discover
                    the cost of a thing by having been charged for it. */}
                {(pricing?.costs?.[s.key] ?? 0) > 0 && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    affordable(s.key) ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                    {pricing!.costs[s.key]} credits
                  </span>
                )}
              </span>
            </button>
          ))}

          <Card className="flex flex-col justify-center bg-cream p-5">
            <p className="text-[15px] font-extrabold">Not sure which one?</p>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              Upload it anyway and pick the closest match — or send it to your advisor and ask what
              they&apos;d want reviewed first.
            </p>
            <Link href={`/hub/messages${q}`} className="btn btn-ghost btn-sm mt-4 self-start">
              Ask my advisor <ArrowRight size={14} />
            </Link>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed text-gray-400">
            Findings are an AI reading of the document you upload — helpful for knowing what to ask,
            not a substitute for your own review or professional advice.
          </p>
          <Pill tone="gray">Powered by BuyerAiPro</Pill>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => onFile(e.target.files)} />

      {/* TOP UP — card details go straight to Helcim's hosted iframe and never
          touch this app. */}
      <Modal open={topUp} onClose={() => { setTopUp(false); setBought(null); }} title="Add credits">
        {bought !== null ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold">{bought} credits added ✓</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              Your balance is now {balance ?? bought}. Nothing expires.
            </p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => { setTopUp(false); setBought(null); }}>
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-gray-600">
              Credits pay for AI document reviews. A title search or disclosure is{" "}
              {pricing?.costs?.title ?? 5}; a full strata package is {pricing?.costs?.strata ?? 25},
              because it is a great deal more reading. Credits don&apos;t expire, and a review that
              fails is refunded automatically.
            </p>
            {(pricing?.packs ?? []).map((p, i) => (
              <button key={p.key} disabled={!helcimReady || buying !== null}
                onClick={() => purchase(p.key)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition disabled:opacity-60 ${
                  i === 1 ? "border-teal bg-teal-soft" : "border-line hover:border-teal"}`}>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">{p.coins} credits</span>
                  <span className="block text-[11px] text-gray-500">
                    ${(p.price / p.coins).toFixed(2)} each
                    {i === 1 ? " · most popular" : i === 2 ? " · best value" : ""}
                  </span>
                </span>
                <span className="tabular shrink-0 text-lg font-extrabold">
                  {buying === p.key ? <Loader2 size={18} className="animate-spin" /> : `$${p.price}`}
                </span>
              </button>
            ))}
            <p className="text-[11px] leading-relaxed text-gray-400">
              One-time purchase in CAD, not a subscription. Payment is handled by Helcim — your card
              details never reach us.
            </p>
          </div>
        )}
      </Modal>

      {/* Closing this no longer cancels anything — the job is server-side. */}
      <Modal open={!!scanDoc} onClose={() => { setScanDoc(null); setScanType(undefined); void loadRows(); }} title="AI review">
        {scanDoc && (
          <ScanFlow key={scanDoc.id} doc={scanDoc} initialType={scanType}
            onClose={() => { setScanDoc(null); setScanType(undefined); void loadRows(); }} />
        )}
      </Modal>

      {/* A finished review, reopened from the list. */}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.document_name || "Review"}>
        {open && (
          <div className="space-y-4">
            <Pill tone="teal">Review complete</Pill>
            {open.summary && (
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-cream p-4 text-sm leading-relaxed">
                {open.summary}
              </div>
            )}
            {open.findings?.length > 0 && (
              <div>
                <p className="section-label mb-2">Key findings</p>
                <ul className="space-y-1.5">
                  {open.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-gray-400">
              An AI reading of your document — useful for knowing what to ask, not a substitute for
              professional advice.
            </p>
            <Link href={`/hub/messages${q}`} className="btn btn-primary btn-md w-full">
              Ask my advisor about this <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
