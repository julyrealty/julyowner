"use client";
import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home, LayoutDashboard, Wrench, PiggyBank, TrendingUp, House,
  LogOut, RotateCcw, Sparkles,
} from "lucide-react";
import { HubProvider, useHub, resetDemo } from "@/lib/store";
import { Spinner } from "@/components/ui";

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
  const { loading, demo, session, profile, pro, signOut } = useHub();
  const path = usePathname();
  const [q, setQ] = useState("");
  useEffect(() => { setQ(demo ? "?demo=1" : ""); }, [demo]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!demo && !session) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }

  const active = (href: string) =>
    href === "/hub" ? path === "/hub" : path.startsWith(href);

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
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="container-x flex h-14 items-center justify-between sm:h-16">
          <Link href={`/hub${q}`} className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
            <span className="text-ink">JULY</span>
            <span className="flex items-center gap-0.5 text-teal"><Home size={16} strokeWidth={2.8} />Owner</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
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

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {NAV.map((n) => (
            <Link key={n.href} href={`${n.href}${q}`}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${active(n.href) ? "text-teal" : "text-gray-400"}`}>
              <n.icon size={20} strokeWidth={active(n.href) ? 2.6 : 2} />
              {n.label.replace(" Home", "").replace("Build ", "")}
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
