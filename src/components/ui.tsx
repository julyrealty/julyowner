"use client";
import React, { useEffect } from "react";
import { X } from "lucide-react";

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="section-label">{children}</div>
      {right}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "teal" | "green" | "red" | "gold" }) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    teal: "bg-teal-soft text-teal-deep",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
    gold: "bg-amber-50 text-amber-700",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, children, title, wide }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title?: string; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-7 ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-teal" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-semibold text-gray-700">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </label>
  );
}

export function Avatar({ name, src, size = 36, color = "var(--teal)" }: { name?: string | null; src?: string | null; size?: number; color?: string }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (src) return <img src={src} alt={name || ""} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="inline-flex items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <div className="text-base font-bold">{title}</div>
      {body && <p className="max-w-sm text-sm text-gray-500">{body}</p>}
      {action}
    </div>
  );
}

export function Spinner() {
  return <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal" aria-label="Loading" />;
}
