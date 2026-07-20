// Persona front doors: one component, four brands-in-waiting.
// Served at /buy /own /sell /invest and rewritten onto persona domains
// (julybuyer.com etc.) by src/middleware.ts.
import Link from "next/link";
import {
  ArrowRight, Home, Check, Search, FileScan, Wallet, CalendarDays,
  LineChart, Wrench, FolderLock, FileText, Tag, Calculator, Map,
  KeyRound, Receipt, Building2, Gauge,
} from "lucide-react";

type Feature = { icon: React.ComponentType<{ size?: number; className?: string }>; h: string; b: string };

export type PersonaKey = "buy" | "own" | "sell" | "invest";

const PERSONAS: Record<PersonaKey, {
  brand: string; eyebrow: string; h1: string; sub: string;
  cta: { label: string; href: string }; cta2?: { label: string; href: string };
  features: Feature[]; clientNoun: string; agentLine: string;
}> = {
  buy: {
    brand: "JULY Buyer",
    eyebrow: "For home buyers",
    h1: "House-hunt like the pros do.",
    sub: "One HQ for your whole search — the homes you're watching, what you can really afford, and AI that reads the boring documents before you commit to anything.",
    cta: { label: "Start my search HQ — free", href: "/claim?persona=buyer" },
    cta2: { label: "See a live demo", href: "/hub/buying?demo=1" },
    features: [
      { icon: Search, h: "Every home you're watching, one list", b: "Saved homes and searches from JULY Search flow straight into your HQ — no lost tabs, no forwarded links." },
      { icon: Wallet, h: "What you can actually afford", b: "Real purchasing-power math — down payment, qualification, monthly cost — before you fall in love with the wrong price range." },
      { icon: FileScan, h: "AI reads the documents first", b: "Strata packages, inspections, disclosures — read and summarized for you, so surprises surface before your offer, not after." },
      { icon: CalendarDays, h: "Tours, planned with your agent", b: "Request a showing and your agent lines it up — and preps what to look for before you walk in." },
    ],
    clientNoun: "buyer clients",
    agentLine: "Give every buyer a branded search HQ — and know the moment they get serious.",
  },
  own: {
    brand: "JULY Owner",
    eyebrow: "For homeowners",
    h1: "Your home, working for you.",
    sub: "Live value and equity, a maintenance plan that thinks ahead, and every document in one place — the ownership HQ your home deserves.",
    cta: { label: "Claim my home — free", href: "/claim" },
    cta2: { label: "See a live demo", href: "/hub?demo=1" },
    features: [
      { icon: LineChart, h: "Value & equity, always current", b: "A real estimate with a confidence grade, refreshed monthly — watch your equity build without asking anyone." },
      { icon: Wrench, h: "Maintenance on autopilot", b: "Your home's systems tracked with reminders sized in minutes — small tasks stay small." },
      { icon: FolderLock, h: "Every document, one vault", b: "Insurance, warranties, permits — organized, searchable, and ready the day you need them." },
      { icon: FileText, h: "An annual report worth keeping", b: "A year-in-review of your home's value, equity, and everything you accomplished. Print it, keep it, brag a little." },
    ],
    clientNoun: "homeowner clients",
    agentLine: "Stay the trusted advisor between transactions — with your name on every screen.",
  },
  sell: {
    brand: "JULY Seller",
    eyebrow: "For home sellers",
    h1: "Know your number before you list.",
    sub: "The pricing lab, the net-proceeds math, and the prep roadmap — so you walk into the sale knowing exactly what you'll walk away with.",
    cta: { label: "Get my free valuation", href: "/worth" },
    cta2: { label: "See the selling tools", href: "/hub/sell?demo=1" },
    features: [
      { icon: Tag, h: "A pricing lab, not a guess", b: "Test list prices against your estimate and live market data, and see exactly where each choice puts you." },
      { icon: Calculator, h: "Net proceeds to the dollar", b: "Commission, taxes, mortgage payout and penalty, legal, moving — the real number, before you commit." },
      { icon: Map, h: "A roadmap built from your home", b: "Fix what inspectors will find, skip what doesn't pay back, and walk into listing day ready." },
      { icon: Gauge, h: "A real evaluation in one day", b: "A licensed pro prepares your market evaluation within one business day — a person, not an algorithm." },
    ],
    clientNoun: "seller clients",
    agentLine: "Be there the moment they start thinking about selling — not after the sign goes up.",
  },
  invest: {
    brand: "JULY Investor",
    eyebrow: "For rental owners & investors",
    h1: "Run your rentals like a portfolio.",
    sub: "Lease deadlines, rent versus market, income and expenses in one ledger — across every door you own.",
    cta: { label: "Set up my portfolio — free", href: "/claim" },
    cta2: { label: "See the landlord tools", href: "/hub/wealth?demo=1" },
    features: [
      { icon: KeyRound, h: "Lease radar", b: "Lease-end countdowns and notice-deadline nudges — renewal conversations happen on your schedule, not your tenant's." },
      { icon: Receipt, h: "A ledger your accountant will love", b: "Rent in, expenses out, year-to-date net — the tax-time numbers, captured in two taps all year." },
      { icon: LineChart, h: "Your rent vs the market", b: "Live median rents for your city and beds — know your headroom before every renewal." },
      { icon: Building2, h: "Every property, one login", b: "A portfolio switcher across all your doors — each with its own value, lease, and ledger." },
    ],
    clientNoun: "investor clients",
    agentLine: "Every landlord you serve is a repeat transaction waiting to happen — stay in the building.",
  },
};

/** The single source of truth for agent pricing — /professionals renders these too. */
export const TIERS = [
  { name: "Free", price: "$0", per: "", limit: "3", features: ["Branded client hubs", "Invites & lead alerts"] },
  { name: "Starter", price: "$29", per: "/mo", limit: "25", features: ["Everything in Free", "10 AI document scans/mo", "Monthly value emails from your name"] },
  { name: "Pro", price: "$59", per: "/mo", limit: "100", features: ["Everything in Starter", "Live client signals & weekly digest", "Your branding everywhere", "50 AI scans/mo"], popular: true },
  { name: "Team", price: "$119", per: "/mo", limit: "500", features: ["Everything in Pro", "3 agent seats", "API access", "Priority support"] },
] as { name: string; price: string; per: string; limit: string; features: string[]; popular?: boolean }[];

export function PersonaLanding({ persona }: { persona: PersonaKey }) {
  const p = PERSONAS[persona];
  return (
    <main className="flex-1">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
            <span className="text-ink">JULY</span>
            <span className="flex items-center gap-0.5 text-teal"><Home size={18} strokeWidth={2.8} />{p.brand.replace("JULY ", "")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href={p.cta.href} className="btn btn-dark btn-sm">Get started free</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="dark-panel">
        <div className="container-x py-16 sm:py-24">
          <p className="eyebrow mb-4 text-gold">{p.eyebrow}</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{p.h1}</h1>
          <p className="mt-5 max-w-xl text-lg text-[#cfc7b8]">{p.sub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={p.cta.href} className="btn btn-coral btn-lg">{p.cta.label} <ArrowRight size={18} /></Link>
            {p.cta2 && <Link href={p.cta2.href} className="btn btn-cream btn-lg">{p.cta2.label}</Link>}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="cream-panel py-16 sm:py-20">
        <div className="container-x grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {p.features.map((f) => (
            <div key={f.h} className="card p-6">
              <f.icon className="text-teal" size={24} />
              <h3 className="mt-3 font-bold">{f.h}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AGENT PRICING */}
      <section className="bg-white py-16 sm:py-24" id="agents">
        <div className="container-x">
          <p className="eyebrow text-teal">For real estate, mortgage & insurance professionals</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{p.agentLine}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t) => (
              <div key={t.name} className={`card relative p-6 ${t.popular ? "ring-2 ring-teal" : ""}`}>
                {t.popular && <span className="absolute right-4 top-4 rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-bold text-teal-deep">MOST POPULAR</span>}
                <p className="font-extrabold uppercase tracking-wide text-navy">{t.name}</p>
                <p className="mt-2 text-3xl font-extrabold">{t.price}<span className="text-sm font-bold text-gray-400">{t.per}</span></p>
                <p className="mt-1 text-sm text-gray-500">Up to <b>{t.limit}</b> active {p.clientNoun}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.features.map((li) => (
                    <li key={li} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" />{li}</li>
                  ))}
                </ul>
                <Link href="/claim?role=professional" className={`btn btn-md mt-6 w-full ${t.popular ? "btn-primary" : "btn-ghost"}`}>
                  {t.name === "Free" ? "Start free" : `Start ${t.name}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-sm font-semibold text-gray-600">
            Your clients are yours. Their hubs carry your brand, their leads go only to you, and we never contact them.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            JULY Realty agents get the full stack included — curious what that&apos;s like?{" "}
            <a href="https://join.july.ca" className="font-bold text-teal-deep underline" target="_blank" rel="noopener noreferrer">join.july.ca</a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-coral">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">{p.h1}</h2>
          <Link href={p.cta.href} className="btn btn-lg shrink-0 bg-white text-coral hover:opacity-90">
            {p.cta.label} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="dark-panel py-6 text-center text-xs text-[#8f887b]">
        © {new Date().getFullYear()} JULY Marketing Inc. · {p.brand} is a JULY Marketing Inc. product · Brokerage services by JULY Realty
      </footer>
    </main>
  );
}
