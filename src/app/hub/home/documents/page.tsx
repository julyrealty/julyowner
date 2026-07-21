"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHub, type Doc } from "@/lib/store";
import { relTime } from "@/lib/calc";
import { sb } from "@/lib/supabase";
import { findCatalogItem } from "@/lib/demo";
import { Card, Modal, Field, Pill, Progress } from "@/components/ui";
import { HomeSubnav } from "@/components/home-subnav";
import { ScanFlow } from "@/components/scan-flow";
import { Umbrella, ShieldCheck, FolderOpen, FileText, UploadCloud, Trash2, Plus, ChevronLeft, Sparkles, Check, AlertTriangle, FileSearch, ScrollText, Building2, Loader2 } from "lucide-react";

// A buyer's paperwork is the purchase, not the policies they don't have yet.
const OWNER_FOLDERS = ["Insurance", "Warranty"];
const BUYER_FOLDERS = ["Purchase", "Strata", "Inspection", "Title"];

export default function DocumentsPage() {
  const { docs, addDoc, removeDoc, docUrl, demo, hub, scans, loadScans } = useHub();
  const isPureBuyer = hub?.journey === "buying";
  const [folder, setFolder] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [drag, setDrag] = useState(false);
  const [scanDoc, setScanDoc] = useState<Doc | null>(null);
  const [review, setReview] = useState<(typeof scans)[number] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadScans(); }, [loadScans]);

  /** Newest review per document, so a file can show its result inline. */
  const reviewByDoc = useMemo(() => {
    const m = new Map<string, (typeof scans)[number]>();
    for (const s of scans) if (s.document_id && !m.has(s.document_id)) m.set(s.document_id, s);
    return m;
  }, [scans]);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    (isPureBuyer ? BUYER_FOLDERS : OWNER_FOLDERS).forEach((f) => map.set(f, 0));
    docs.forEach((d) => map.set(d.folder, (map.get(d.folder) || 0) + 1));
    return [...map.entries()];
  }, [docs, isPureBuyer]);

  const inFolder = docs.filter((d) => d.folder === folder);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > 20 * 1024 * 1024) { alert(`${f.name} is over the 20 MB limit.`); continue; }
      // addDoc now throws if the upload or insert fails, rather than adding a
      // document with no file behind it. Surface that instead of pretending.
      try {
        await addDoc({ folder: folder || "Everything else", name: f.name, size_bytes: f.size }, f);
      } catch (e) {
        alert(e instanceof Error ? e.message : `We couldn't upload ${f.name}. Please try again.`);
      }
    }
  }

  async function openDoc(id: string) {
    const url = await docUrl(id);
    if (url) window.open(url, "_blank");
  }

  const canScan = (d: Doc) =>
    d.name.toLowerCase().endsWith(".pdf") &&
    (demo || !!(d as Doc & { storage_path?: string | null }).storage_path);

  const iconFor = (f: string) =>
    f === "Insurance" ? Umbrella : f === "Warranty" ? ShieldCheck
      : f === "Inspection" ? FileSearch : f === "Title" ? ScrollText
        : f === "Strata" ? Building2 : FolderOpen;

  return (
    <div>
      <HomeSubnav current="/hub/home/documents" />
      <div className="container-x py-8">
        {!folder ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Documents</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isPureBuyer
                ? "Strata packages, disclosures, inspections — everything for your purchase in one private place."
                : <>Your home&apos;s digital safe. Only hub members can see what&apos;s inside.</>}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map(([name, count]) => {
                const Icon = iconFor(name);
                return (
                  <button key={name} onClick={() => setFolder(name)} className="card p-5 text-left transition hover:border-teal">
                    <Icon size={22} className="text-teal" />
                    <p className="mt-3 font-bold">{name}</p>
                    <p className="text-xs text-gray-400">{count} file{count === 1 ? "" : "s"}</p>
                  </button>
                );
              })}
              <button onClick={() => setNewFolder(true)} className="card flex flex-col items-center justify-center gap-2 border-dashed p-5 text-gray-400 transition hover:border-teal hover:text-teal">
                <Plus size={20} /> <span className="text-sm font-bold">Add folder</span>
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-teal bg-teal-soft" : "border-line bg-white"}`}
            >
              <UploadCloud size={28} className="mx-auto text-teal" />
              <p className="mt-3 font-extrabold">Drag &amp; drop</p>
              <p className="text-sm text-gray-500">your files here, or <span className="link">browse</span></p>
              <p className="mt-1 text-xs text-gray-400">Maximum 20 MB per file</p>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </div>
          </>
        ) : (
          <>
            <button className="link flex items-center gap-1 text-sm" onClick={() => setFolder(null)}><ChevronLeft size={15} /> Documents</button>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{folder}</h1>
            <div className="mt-5 space-y-2">
              {inFolder.length === 0 && (
                <Card className="p-8 text-center text-sm text-gray-500">Nothing here yet — drop a file below.</Card>
              )}
              {inFolder.map((d) => {
                const rev = reviewByDoc.get(d.id);
                return (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="shrink-0 text-coral" />
                      <button className="min-w-0 flex-1 text-left" onClick={() => openDoc(d.id)} title={demo ? "Stored for this browser session" : "Open file"}>
                        <p className="truncate text-sm font-bold hover:text-teal">{d.name}</p>
                        <p className="text-xs text-gray-400">{(d.size_bytes / 1024).toFixed(0)} KB · added {relTime(d.created_at)}</p>
                      </button>
                      {canScan(d) && !rev && (
                        <button className="shrink-0 text-gray-300 hover:text-teal" title="AI review" onClick={() => setScanDoc(d)}><Sparkles size={16} /></button>
                      )}
                      <button className="shrink-0 text-gray-300 hover:text-coral" title="Delete" onClick={() => removeDoc(d.id)}><Trash2 size={16} /></button>
                    </div>

                    {/* The AI review lives with the document it came from. */}
                    {rev && (
                      <div className="mt-3 border-t border-line pt-3">
                        {rev.status === "pending" && (
                          <p className="flex items-center gap-2 text-[13px] text-gray-500">
                            <Loader2 size={14} className="animate-spin text-teal" />
                            AI review in progress — we&apos;ll email you when it&apos;s ready.
                          </p>
                        )}
                        {rev.status === "failed" && (
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="flex items-center gap-2 text-[13px] text-coral">
                              <AlertTriangle size={14} /> {rev.error || "That review didn't finish."}
                            </p>
                            <button className="btn btn-ghost btn-sm" onClick={() => setScanDoc(d)}>Run it again</button>
                          </div>
                        )}
                        {rev.status === "complete" && (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <Pill tone="teal"><Check size={11} /> AI review ready</Pill>
                              <span className="text-[11px] text-gray-400">{relTime(rev.completed_at ?? rev.created_at)}</span>
                            </div>
                            {rev.summary && (
                              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">{rev.summary}</p>
                            )}
                            <button className="link mt-2 text-[13px] font-bold" onClick={() => setReview(rev)}>
                              Read the full review →
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-white p-6 text-center text-sm text-gray-500 hover:border-teal"
              >
                <UploadCloud size={20} className="mx-auto mb-1 text-teal" /> Add to {folder}
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full review, opened from the document it belongs to. */}
      <Modal open={!!review} onClose={() => setReview(null)} title={review?.document_name || "AI review"}>
        {review && (
          <div className="space-y-4">
            <Pill tone="teal"><Check size={11} /> Review complete</Pill>
            {review.summary && (
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-cream p-4 text-sm leading-relaxed">
                {review.summary}
              </div>
            )}
            {review.findings?.length > 0 && (
              <div>
                <p className="section-label mb-2">Key findings</p>
                <ul className="space-y-1.5">
                  {review.findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-gray-400">
              An AI reading of this document — useful for knowing what to ask, not a substitute for
              professional advice.
            </p>
          </div>
        )}
      </Modal>

      <Modal open={newFolder} onClose={() => setNewFolder(false)} title="New folder">
        <NewFolderForm onCreate={(name) => { void addDoc({ folder: name, name: ".keep", size_bytes: 0 }).catch(() => {}); setNewFolder(false); setFolder(name); }} />
      </Modal>

      {/* AI SCAN */}
      <Modal open={!!scanDoc} onClose={() => setScanDoc(null)} title="AI document scan">
        {scanDoc && <ScanFlow key={scanDoc.id} doc={scanDoc} onClose={() => { setScanDoc(null); void loadScans(); }} />}
      </Modal>
    </div>
  );
}

function NewFolderForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <Field label="Folder name"><input className="input" placeholder="e.g. Property Tax, Receipts" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <button className="btn btn-primary btn-lg w-full" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Create</button>
    </div>
  );
}
