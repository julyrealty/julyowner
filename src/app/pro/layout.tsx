"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, LayoutDashboard, Users, House, BadgeCheck, Handshake, Radar, LogOut, Sparkles } from "lucide-react";
import { ProProvider, usePro } from "@/lib/pro-store";
import { Spinner } from "@/components/ui";
import { sb } from "@/lib/supabase";

const NAV = [
  { href: "/pro", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pro/contacts", label: "Contacts", icon: Users },
  { href: "/pro/hubs", label: "Hubs", icon: House },
  { href: "/pro/providers", label: "Providers", icon: Handshake },
  { href: "/pro/advisors", label: "Advisors", icon: BadgeCheck },
  { href: "/pro/opportunities", label: "Signals", icon: Radar },
];

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, demo, session } = usePro();
  const path = usePathname();
  const params = useSearchParams();
  const q = demo ? "?demo=1" : "";

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!demo && !session) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }
  void params;
  const active = (href: string) => (href === "/pro" ? path === "/pro" : path.startsWith(href));

  return (
    <div className="flex min-h-dvh bg-[#f7f8f7]">
      {/* Desktop icon rail */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-white md:flex">
        <Link href={`/pro${q}`} className="flex items-center gap-1.5 px-5 py-5 text-lg font-extrabold tracking-tight">
          <span className="text-ink">JULY</span>
          <span className="flex items-center gap-0.5 text-teal"><Home size={16} strokeWidth={2.8} />Owner</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <Link key={n.href} href={`${n.href}${q}`}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${active(n.href) ? "bg-teal-soft text-teal-deep" : "text-gray-600 hover:bg-gray-100"}`}>
              <n.icon size={17} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          {demo ? (
            <Link href="/claim?role=professional" className="btn btn-dark btn-sm w-full">Create real account</Link>
          ) : (
            <button onClick={async () => { await sb().auth.signOut(); window.location.href = "/"; }} className="btn btn-ghost btn-sm w-full"><LogOut size={14} /> Sign out</button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        {demo && (
          <div className="flex items-center justify-center gap-3 bg-navy px-4 py-2 text-center text-[13px] font-semibold text-white">
            <Sparkles size={14} className="shrink-0 text-gold" />
            <span className="truncate">Demo dashboard — sample book of business.</span>
            <Link href="/claim?role=professional" className="shrink-0 rounded-full bg-white px-3 py-0.5 text-[12px] font-bold text-navy">Get yours free</Link>
          </div>
        )}
        {/* Mobile top bar */}
        <div className="flex h-14 items-center justify-between border-b border-line bg-white px-4 md:hidden">
          <Link href={`/pro${q}`} className="flex items-center gap-1.5 text-lg font-extrabold">
            <span>JULY</span><span className="flex items-center gap-0.5 text-teal"><Home size={15} strokeWidth={2.8} />Owner</span>
          </Link>
          <span className="rounded-full bg-teal-soft px-3 py-1 text-[11px] font-bold text-teal-deep">PRO</span>
        </div>
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <Link key={n.href} href={`${n.href}${q}`}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[9.5px] font-bold ${active(n.href) ? "text-teal" : "text-gray-400"}`}>
              <n.icon size={19} strokeWidth={active(n.href) ? 2.6 : 2} />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ProRoot({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  return <ProProvider demo={demo}><Shell>{children}</Shell></ProProvider>;
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Spinner /></div>}>
      <ProRoot>{children}</ProRoot>
    </Suspense>
  );
}
