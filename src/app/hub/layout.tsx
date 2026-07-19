"use client";
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home, LayoutDashboard, Wrench, PiggyBank, TrendingUp, House,
  LogOut, RotateCcw, Sparkles, Tag, Search, MessageSquare, LineChart,
} from "lucide-react";
import { HubProvider, useHub, resetDemo } from "@/lib/store";
import { Spinner, Modal } from "@/components/ui";
import { sb } from "@/lib/supabase";

const NAV = [
  { href: "/hub", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hub/manage", label: "Manage Home", icon: Wrench },
  { href: "/hub/save", label: "Save Money", icon: PiggyBank },
  { href: "/hub/wealth", label: "Build Wealth", icon: TrendingUp },
  { href: "/hub/home", label: "My Home", icon: House },
];

function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (x: number) => Math.max(0, Math.min(255, Math.round(x * f)));
  return `#${[ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, demo, session, profile, pro, hub, logActivity, myHubs, switchHub } = useHub();
  const { signOut } = useHub();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const [proofMsg, setProofMsg] = useState("");
  const [proofSent, setProofSent] = useState(false);
  useEffect(() => { setQ(demo ? "?demo=1" : ""); }, [demo]);

  async function submitProof() {
    if (!hub) return;
    try {
      await sb().functions.invoke("ho-emails", { body: { action: "ownership_proof", hub_id: hub.id, message: proofMsg } });
    } catch { /* logged server-side */ }
    logActivity("Submitted ownership proof");
    setProofSent(true);
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!demo && !session) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }

  const active = (href: string) =>
    href === "/hub" ? path === "/hub" : path.startsWith(href);

  // Pure buyer hubs (search HQs — no home yet) get a buyer-shaped menu, not the
  // owner's. Owner hubs get their tabs plus at most one journey tab (Selling wins).
  const isPureBuyer = hub?.journey === "buying";

  // Owner-only surfaces assume a home; a search HQ has none. Deep links land on My Search.
  const OWNER_ONLY = ["/hub/manage", "/hub/save", "/hub/wealth", "/hub/sell", "/hub/home/inventory", "/hub/home/timeline"];
  const ownerOnlyPath = OWNER_ONLY.some((p) => path.startsWith(p)) || path === "/hub/home";
  if (isPureBuyer && ownerOnlyPath) {
    if (typeof window !== "undefined") window.location.replace(`/hub/buying${q}`);
    return null;
  }
  const selling = hub?.journey === "selling" || hub?.journey === "sold";
  const buying = !!hub?.buying_started_at || hub?.journey === "buying";
  const BUYER_NAV = [
    { href: "/hub/buying", label: "My Search", icon: Search },
    { href: "/hub/value", label: "Valuation", icon: LineChart },
    { href: "/hub/scan", label: "AI Review", icon: Sparkles },
    { href: "/hub/services", label: "Services", icon: Wrench },
    { href: "/hub/messages", label: "Messages", icon: MessageSquare },
  ];
  const nav = isPureBuyer
    ? BUYER_NAV
    : selling
      ? [NAV[0], { href: "/hub/sell", label: "Selling", icon: Tag }, ...NAV.slice(1)]
      : buying
        ? [NAV[0], { href: "/hub/buying", label: "Buying", icon: Search }, ...NAV.slice(1)]
        : NAV;

  // White-label: the hub inherits the sponsoring professional's brand colour.
  const brand = (pro as { brand_color?: string | null })?.brand_color || "#0e7c7b";
  const brandVars = {
    "--teal": brand,
    "--teal-deep": shade(brand, 0.78),
    "--teal-soft": `color-mix(in srgb, ${brand} 12%, white)`,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f8f7]" style={brandVars}>
      {demo && (
        <div className="flex items-center justify-center gap-3 bg-navy px-4 py-2 text-center text-[13px] font-semibold text-white">
          <Sparkles size={14} className="shrink-0 text-gold" />
          <span className="truncate">You&apos;re exploring the demo hub — changes save to this browser only.</span>
          <Link href="/claim" className="shrink-0 rounded-full bg-white px-3 py-0.5 text-[12px] font-bold text-navy hover:opacity-90">
            Claim your real home
          </Link>
        </div>
      )}
      {!demo && hub?.verification_status === "flagged" && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-[13px] font-semibold text-white">
          <span>Ownership review pending — this address was already registered by someone else.</span>
          <button onClick={() => { setProofSent(false); setProofOpen(true); }}
            className="rounded-full bg-white px-3 py-0.5 text-[12px] font-bold text-amber-600 hover:opacity-90">
            Verify it&apos;s yours
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="container-x flex h-14 items-center justify-between sm:h-16">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={isPureBuyer ? `/hub/buying${q}` : `/hub${q}`} className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold tracking-tight">
              <span className="text-ink">JULY</span>
              {isPureBuyer
                ? <span className="flex items-center gap-0.5 text-teal"><Search size={16} strokeWidth={2.8} />Buyer</span>
                : <span className="flex items-center gap-0.5 text-teal"><Home size={16} strokeWidth={2.8} />Owner</span>}
            </Link>
            {myHubs.length > 1 && (
              <select
                aria-label="Switch property"
                className="min-w-0 max-w-[40vw] truncate rounded-full border border-line bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600 sm:max-w-56"
                value={hub?.id ?? ""}
                onChange={(e) => switchHub(e.target.value)}
              >
                {myHubs.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            )}
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.href} href={`${n.href}${q}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active(n.href) ? "bg-teal-soft text-teal-deep" : "text-gray-600 hover:bg-gray-100"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            {demo ? (
              <button onClick={() => { resetDemo(); window.location.reload(); }}
                className="btn btn-ghost btn-sm" title="Reset demo data"><RotateCcw size={14} /> <span className="hidden sm:inline">Reset demo</span></button>
            ) : (
              <button onClick={signOut} className="btn btn-ghost btn-sm" title="Sign out"><LogOut size={14} /> <span className="hidden sm:inline">Sign out</span></button>
            )}
            <Link href={`/hub/profile${q}`} title="Profile & settings"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-teal text-sm font-bold text-white transition hover:opacity-85">
              {(profile?.first_name?.[0] || "D")}{(profile?.last_name?.[0] || "W")}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 pb-24 md:pb-10">{children}</div>

      {/* Ownership proof modal */}
      <Modal open={proofOpen} onClose={() => setProofOpen(false)} title="Verify your ownership">
        {proofSent ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold">Sent ✓</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              Our team received your request and will reply by email — usually within one business day.
              A recent property tax notice or title document is the fastest way to confirm.
            </p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => setProofOpen(false)}>Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">
              This address was registered by someone else before you — that can happen when a family member,
              previous occupant, or tenant set up a hub. Tell us in a sentence that you&apos;re the owner and
              we&apos;ll follow up by email to confirm (a property tax notice or title works best). Your hub
              keeps working as usual in the meantime.
            </p>
            <textarea className="input min-h-24" placeholder="e.g. I purchased this home in 2019 and can provide my tax notice."
              value={proofMsg} onChange={(e) => setProofMsg(e.target.value)} />
            <button className="btn btn-primary btn-lg w-full" disabled={!proofMsg.trim()} onClick={submitProof}>
              Send verification request
            </button>
          </div>
        )}
      </Modal>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={nav.length === 6 ? "grid grid-cols-6" : nav.length === 3 ? "grid grid-cols-3" : "grid grid-cols-5"}>
          {nav.map((n) => (
            <Link key={n.href} href={`${n.href}${q}`}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${active(n.href) ? "text-teal" : "text-gray-400"}`}>
              <n.icon size={20} strokeWidth={active(n.href) ? 2.6 : 2} />
              {({ "Manage Home": "Manage", "Save Money": "Save", "Build Wealth": "Wealth", "AI Review": "AI", "My Search": "Search" } as Record<string, string>)[n.label] ?? n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function HubRoot({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  return (
    <HubProvider demo={demo}>
      <Shell>{children}</Shell>
    </HubProvider>
  );
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Spinner /></div>}>
      <HubRoot>{children}</HubRoot>
    </Suspense>
  );
}
