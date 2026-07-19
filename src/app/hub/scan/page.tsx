"use client";
// AI Review — the document scanners, presented as a first-class part of the hub.
// White-labelled: the buyer picks what they want read, drops the file in, and
// stays here throughout. Nothing to sign up for, no second account.
import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileSearch, Building2, ScrollText, ClipboardCheck, FileSignature,
  UploadCloud, Sparkles, ArrowRight, ShieldCheck, Clock,
} from "lucide-react";
import { useHub, type Doc } from "@/lib/store";
import { Card, SectionLabel, Modal, Pill } from "@/components/ui";
import { ScanFlow } from "@/components/scan-flow";

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
  const fileRef = useRef<HTMLInputElement>(null);

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
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-deep">
                <UploadCloud size={15} /> Upload &amp; review
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

      <Modal open={!!scanDoc} onClose={() => { setScanDoc(null); setScanType(undefined); }} title="AI review">
        {scanDoc && (
          <ScanFlow key={scanDoc.id} doc={scanDoc} initialType={scanType}
            onClose={() => { setScanDoc(null); setScanType(undefined); }} />
        )}
      </Modal>

      {!hub && !demo && null}
    </div>
  );
}
