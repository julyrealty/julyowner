"use client";
// AI document scanning — shared by My Home > Documents and the buyer-facing
// AI Review page. One implementation of the poll loop and the inventory
// graduation, so the two surfaces can never drift apart.
import { useEffect, useMemo, useRef, useState } from "react";
import { useHub, type Doc } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { findCatalogItem } from "@/lib/demo";
import { Pill, Progress } from "@/components/ui";
import { Sparkles, AlertTriangle, Check } from "lucide-react";

type ScanItem = { item_type: string; brand: string | null; age_years: number | null };
type ScanInvokeData = {
  job_id?: string; status?: string; summary?: string | null; error?: string;
  result?: { report?: string | null; scanner_id?: string | null } | null;
  items?: ScanItem[];
};
type ScanOutcome = { sample: boolean; summary: string; findings: string[]; items: ScanItem[] };

export const SCAN_TYPES: { key: string; label: string; blurb: string }[] = [
  { key: "inspection", label: "Inspection report", blurb: "Defects, aging systems, safety items" },
  { key: "strata", label: "Strata docs", blurb: "Minutes, Form B, levies, bylaws" },
  { key: "title", label: "Title", blurb: "Charges, liens, easements" },
  { key: "pds", label: "Property disclosure", blurb: "What the seller declared, and what they left out" },
  { key: "contract", label: "Contract", blurb: "Terms, subjects, dates, deposits" },
];

const PROGRESS_COPY = [
  "Sending your document securely…",
  "Reading every page…",
  "Scanning for issues and key facts…",
  "Cross-checking the details…",
  "Compiling your findings…",
];

const SAMPLE_RESULT: ScanOutcome = {
  sample: true,
  summary:
    "This inspection reads well overall for a home of this age, with no urgent structural or safety issues. Two systems are worth planning around: the furnace is approximately 12 years old and past mid-life, and the hot water tank is about 9 years old — near the end of its typical 8–12 year service life. The remaining notes are maintenance-level items worth a weekend, not a contractor.",
  findings: [
    "Furnace (Lennox) is approx. 12 years old — plan ahead for replacement",
    "Hot water tank (Bradford White) is approx. 9 years old — nearing end of typical life",
    "Minor moisture staining at one basement window well",
    "Caulking gaps at exterior window trim, south side",
    "Downspout discharges beside the foundation — add an extension",
  ],
  items: [
    { item_type: "Heating", brand: "Lennox", age_years: 12 },
    { item_type: "Water Heater", brand: "Bradford White", age_years: 9 },
  ],
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function invokeScan(body: Record<string, unknown>): Promise<ScanInvokeData> {
  const { data, error } = await sb().functions.invoke("ho-scan", { body });
  if (error) {
    let msg = "The scan service is unavailable right now. Please try again.";
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try { const j = await ctx.clone().json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    }
    throw new Error(msg);
  }
  return (data ?? {}) as ScanInvokeData;
}

function plainText(md: string | null | undefined): string {
  if (!md) return "";
  return md.replace(/^#+\s*/gm, "").replace(/\*\*?/g, "").replace(/`/g, "").trim();
}

function findingsFrom(md: string | null | undefined): string[] {
  if (!md) return [];
  return md.split(/\r?\n/)
    .filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l))
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*?/g, "").replace(/`/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function ScanFlow({ doc, onClose, initialType }: { doc: Doc; onClose: () => void; initialType?: string }) {
  const { demo, hub, inventory, addInventory } = useHub();
  // "handed_off" = we stopped watching, the server did not stop working.
  const [step, setStep] = useState<"pick" | "running" | "results" | "failed" | "added" | "handed_off">("pick");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true; // StrictMode remounts run cleanup once — re-arm on every mount
    return () => { aliveRef.current = false; };
  }, []);

  // Arriving from AI Review, the scanner is already chosen — skip the picker and
  // start once. The ref guard stops StrictMode's double-mount running two scans.
  const autoRef = useRef(false);
  useEffect(() => {
    if (!initialType || autoRef.current) return;
    autoRef.current = true;
    void start(initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType]);

  useEffect(() => {
    if (step !== "running") return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  const existing = useMemo(() => new Set(inventory.map((i) => i.item_type)), [inventory]);

  function showOutcome(o: ScanOutcome) {
    if (!aliveRef.current) return;
    setOutcome(o);
    setChecked(new Set(o.items.map((i) => i.item_type)));
    setStep("results");
  }

  async function start(scanType: string) {
    setStep("running");
    if (demo) {
      await sleep(2000);
      showOutcome(SAMPLE_RESULT);
      return;
    }
    try {
      if (!hub) throw new Error("Your hub is still loading — try again in a second.");
      const created = await invokeScan({ action: "scan", hub_id: hub.id, document_id: doc.id, scan_type: scanType });
      if (!created.job_id) throw new Error("The scan could not be started.");
      // Poll every 3.5s for up to ~3 minutes.
      for (let i = 0; i < 50; i++) {
        await sleep(3500);
        if (!aliveRef.current) return;
        const s = await invokeScan({ action: "status", hub_id: hub.id, job_id: created.job_id });
        if (s.status === "complete") {
          showOutcome({
            sample: false,
            summary: plainText(s.summary) || "Scan complete — see the key findings below.",
            findings: findingsFrom(s.summary).length ? findingsFrom(s.summary) : findingsFrom(s.result?.report),
            items: s.items ?? [],
          });
          return;
        }
        if (s.status === "failed") throw new Error(s.error || "The scan failed. Please try again.");
      }
      // Out of patience in the browser, not out of progress on the server. The
      // cron poller finishes this one and emails them — never offer "try again"
      // here, that would start a second scan of the same document.
      if (aliveRef.current) setStep("handed_off");
      return;
    } catch (e) {
      if (!aliveRef.current) return;
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong running the scan.");
      setStep("failed");
    }
  }

  async function addChecked() {
    if (!outcome) return;
    const picked = outcome.items.filter((i) => checked.has(i.item_type));
    setAdding(true);
    try {
      for (const it of picked) {
        const cat = findCatalogItem(it.item_type);
        await addInventory(it.item_type, {
          brand: it.brand ?? undefined,
          age_years: it.age_years ?? undefined,
          keepTasks: cat?.tasks.map((t) => t.title) ?? [],
        });
      }
      setAddedCount(picked.length);
      setStep("added");
    } catch {
      setErrorMsg("Could not add those items — please try again.");
      setStep("failed");
    } finally {
      setAdding(false);
    }
  }

  /* ---------- pick ---------- */
  if (step === "pick") {
    return (
      <div className="space-y-4">
        <p className="break-words text-sm text-gray-500">
          What kind of document is <b className="break-all text-ink">{doc.name}</b>? We&apos;ll read every page and pull out what matters.
        </p>
        <div className="divide-y divide-line rounded-xl border border-line">
          {SCAN_TYPES.map((t) => (
            <button key={t.key} onClick={() => start(t.key)} className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-teal-soft/40">
              <Sparkles size={16} className="shrink-0 text-teal" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{t.label}</span>
                <span className="block text-xs text-gray-400">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400">Scans usually take 1–3 minutes.</p>
      </div>
    );
  }

  /* ---------- running ---------- */
  if (step === "running") {
    const msg = demo ? PROGRESS_COPY[1] : PROGRESS_COPY[Math.min(PROGRESS_COPY.length - 1, Math.floor(elapsed / 20))];
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-teal" aria-label="Scanning" />
        <p className="font-bold">{msg}</p>
        <p className="break-all text-xs text-gray-400">Scanning {doc.name} · {elapsed}s elapsed</p>
        <Progress value={Math.min(92, (elapsed / (demo ? 2.5 : 150)) * 100)} />
        {/* The job is server-side now, so leaving genuinely is safe. */}
        <p className="text-xs leading-relaxed text-gray-400">
          You can close this and carry on — the review keeps running. We&apos;ll email you when it&apos;s
          ready, and it will be waiting under <b>Your reviews</b>.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close and keep working</button>
      </div>
    );
  }

  /* ---------- handed off to the background ---------- */
  if (step === "handed_off") {
    return (
      <div className="space-y-4 py-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-soft text-teal-deep">
          <Sparkles size={22} />
        </span>
        <p className="font-bold">Still reading — we&apos;ll take it from here</p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">
          Longer documents take a while. This one keeps running on our side: we&apos;ll email you the
          moment it&apos;s ready, and it will be waiting under <b>Your reviews</b>. Nothing to redo.
        </p>
        <button className="btn btn-primary btn-lg w-full" onClick={onClose}>Got it</button>
      </div>
    );
  }

  /* ---------- failed ---------- */
  if (step === "failed") {
    return (
      <div className="space-y-4 py-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-coral"><AlertTriangle size={22} /></span>
        <p className="text-sm text-gray-600">{errorMsg}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost btn-md" onClick={onClose}>Close</button>
          <button className="btn btn-primary btn-md" onClick={() => setStep("pick")}>Try again</button>
        </div>
      </div>
    );
  }

  /* ---------- added ---------- */
  if (step === "added") {
    return (
      <div className="space-y-4 py-4 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal text-white"><Check size={22} strokeWidth={3} /></span>
        <p className="font-bold">Added {addedCount} item{addedCount === 1 ? "" : "s"} — see My Home → Inventory.</p>
        <p className="text-sm text-gray-500">Each one comes with its maintenance plan and reminders already set up.</p>
        <button className="btn btn-primary btn-lg w-full" onClick={onClose}>Done</button>
      </div>
    );
  }

  /* ---------- results ---------- */
  if (!outcome) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {outcome.sample && <Pill tone="gold">Sample result</Pill>}
        <Pill tone="teal">Scan complete</Pill>
      </div>
      <div className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-cream p-4 text-sm leading-relaxed">
        {outcome.summary}
      </div>
      {outcome.findings.length > 0 && (
        <div>
          <p className="section-label mb-2">Key findings</p>
          <ul className="space-y-1.5">
            {outcome.findings.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />{f}</li>
            ))}
          </ul>
        </div>
      )}
      {outcome.items.length > 0 && (
        <div>
          <p className="section-label mb-2">Found in this report</p>
          <div className="divide-y divide-line rounded-xl border border-line">
            {outcome.items.map((it) => {
              const on = checked.has(it.item_type);
              return (
                <label key={it.item_type} className="flex cursor-pointer items-center gap-3 p-3.5">
                  <input
                    type="checkbox" checked={on}
                    onChange={() => setChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(it.item_type)) next.delete(it.item_type); else next.add(it.item_type);
                      return next;
                    })}
                    className="h-4.5 w-4.5 accent-[var(--teal)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{it.item_type}</span>
                    <span className="block text-xs text-gray-400">
                      {[it.brand, it.age_years != null ? `${it.age_years} yrs old` : null].filter(Boolean).join(" · ") || "details unknown"}
                      {existing.has(it.item_type) ? " · already in your inventory" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <button className="btn btn-primary btn-lg mt-3 w-full" disabled={checked.size === 0 || adding} onClick={addChecked}>
            {adding ? "Adding…" : `Add ${checked.size} to my inventory`}
          </button>
        </div>
      )}
      {outcome.items.length === 0 && (
        <button className="btn btn-primary btn-lg w-full" onClick={onClose}>Done</button>
      )}
    </div>
  );
}
