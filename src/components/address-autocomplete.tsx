"use client";
// Free address autocomplete (Photon / OpenStreetMap) — no API key, Canada-biased.
// Selecting a suggestion auto-fills street, city, province, and postal code.

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

export type AddressParts = {
  address1: string;
  city: string;
  region: string;
  postal: string;
};

type Suggestion = AddressParts & { label: string; sub: string };

const PROV: Record<string, string> = {
  "British Columbia": "BC", Alberta: "AB", Ontario: "ON", Quebec: "QC", Québec: "QC",
  Manitoba: "MB", Saskatchewan: "SK", "Nova Scotia": "NS", "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE",
  Yukon: "YT", "Northwest Territories": "NT", Nunavut: "NU",
};

type PhotonProps = {
  housenumber?: string; street?: string; name?: string; city?: string; town?: string;
  village?: string; district?: string; postcode?: string; state?: string; countrycode?: string;
};

function parseFeature(p: PhotonProps): Suggestion | null {
  if ((p.countrycode || "").toUpperCase() !== "CA") return null;
  const street = [p.housenumber, p.street || (p.housenumber ? p.name : undefined)].filter(Boolean).join(" ")
    || (p.street ?? p.name ?? "");
  const city = p.city || p.town || p.village || p.district || "";
  if (!street || !city) return null;
  const region = PROV[p.state ?? ""] || p.state || "BC";
  const postal = (p.postcode || "").toUpperCase();
  return {
    address1: street, city, region, postal,
    label: street,
    sub: [city, region, postal].filter(Boolean).join(", "),
  };
}

export function AddressAutocomplete({
  value, onChange, onSelect, placeholder = "Start typing your address…", autoFocus,
}: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (parts: AddressParts) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const picked = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (picked.current) { picked.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < 3) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      setBusy(true);
      try {
        // Vancouver-biased, English, capped results.
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&lat=49.25&lon=-123.12`;
        const res = await fetch(url, { signal: abort.current.signal });
        const json = await res.json();
        const seen = new Set<string>();
        const out: Suggestion[] = [];
        for (const f of json.features ?? []) {
          const s = parseFeature(f.properties ?? {});
          if (!s) continue;
          const key = `${s.label}|${s.sub}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(s);
          if (out.length >= 5) break;
        }
        setItems(out);
        setOpen(out.length > 0);
        setHi(-1);
      } catch { /* aborted or offline — keep quiet, manual entry still works */ }
      finally { setBusy(false); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  // close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function choose(s: Suggestion) {
    picked.current = true;
    onSelect(s);
    setOpen(false);
    setItems([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input input-lead"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
            else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); choose(items[hi]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {busy && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-gray-300" />}
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {items.map((s, i) => (
            <button
              key={`${s.label}-${s.sub}`}
              type="button"
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(s)}
              className={`flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left ${i === hi ? "bg-teal-soft" : "bg-white"}`}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-teal" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{s.label}</span>
                <span className="block truncate text-xs text-gray-500">{s.sub}</span>
              </span>
            </button>
          ))}
          <div className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[10px] text-gray-400">
            <span>Don&apos;t see it? Just keep typing — manual entry works too.</span>
            <span>© OpenStreetMap</span>
          </div>
        </div>
      )}
    </div>
  );
}
