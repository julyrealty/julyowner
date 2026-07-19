import Link from "next/link";
import { ArrowRight, Home, Check, Radar, HeartHandshake, Repeat, Tag, Search, CalendarClock, FileScan, LineChart, FileText, Mail, Gauge } from "lucide-react";
import { TIERS } from "@/components/persona-landing";

export const metadata = { title: "For professionals" };

export default function ProfessionalsPage() {
  return (
    <main className="flex-1">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
            <span className="text-ink">JULY</span>
            <span className="flex items-center gap-0.5 text-teal"><Home size={18} strokeWidth={2.8} />Owner</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href="/claim?role=professional" className="btn btn-dark btn-sm">Get started free</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="dark-panel">
        <div className="container-x grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow mb-4 text-gold">For agents, brokers & lending partners</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              The client you already closed is your best pipeline.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-[#cfc7b8]">
              Most past clients drift away in the quiet years between transactions.
              JULYOwner keeps you in their corner — a branded home hub they actually use,
              with your name on every screen and an instant signal the moment they start
              selling, start shopping, or come up for a mortgage renewal.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/claim?role=professional" className="btn btn-coral btn-lg">Create your dashboard <ArrowRight size={18} /></Link>
              <Link href="/pro?demo=1" className="btn btn-cream btn-lg">Tour the demo dashboard</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Qualitative on purpose — no borrowed or unverifiable statistics on a
                page selling to licensed professionals. */}
            {[
              ["Most", "sellers don't list with the agent who helped them buy. Rarely disloyalty — usually just lost touch."],
              ["The quiet years", "are where the relationship is won or lost. This keeps you present without pestering."],
              ["Years, not months", "pass between moves. A fridge magnet doesn't survive that. A working product does."],
              ["Monthly", "value updates keep clients opening your emails long after closing day"],
            ].map(([n, s]) => (
              <div key={n as string} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="tabular text-2xl font-extrabold text-[#7fd1c7]">{n}</p>
                <p className="mt-1 text-sm text-[#cfc7b8]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="cream-panel py-16 sm:py-24">
        <div className="container-x">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Stay present, stay first-call</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: HeartHandshake, h: "Give real value, not drip spam", b: "Every client gets a private hub for their own home — value, equity, maintenance, documents — branded to you. It's a closing gift that keeps working." },
              { icon: Radar, h: "Know when they're ready", b: "The moment a homeowner activates a selling plan or opens Buying HQ, you get an email — and they appear at the top of your Signals as a live one, not a prediction." },
              { icon: Repeat, h: "Turn one deal into three", b: "Owners who use their hub refer more, list sooner with you, and bring you their refinance and rental questions too." },
            ].map((p) => (
              <div key={p.h} className="card p-6">
                <p.icon className="text-teal" size={26} />
                <h3 className="mt-4 font-bold">{p.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow text-teal">One hub. Every chapter.</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Whoever holds the hub holds the relationship.
          </h2>
          <p className="mt-3 max-w-2xl text-gray-600">
            A home changes hands every decade or so — but it changes <em>chapters</em> constantly.
            Your client's hub follows them through all of it, and every chapter routes back to you.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Home, h: "While they own", b: "Maintenance plans, a documented home inventory, real JULY Value estimates refreshed monthly, and a print-ready Annual Home Report with your name on it." },
              { icon: Tag, h: "When they sell", b: "Seller mode: a pricing lab with live market data, a BC-accurate net-proceeds calculator, and a prep roadmap — all inside your branded hub, with you alerted on day one." },
              { icon: Search, h: "When they buy next", b: "Buying HQ turns their equity into purchasing power and pulls their JULY Search watched homes and tours into the plan — with you as the listed advisor." },
              { icon: Repeat, h: "And again", b: "The sale closes, the hub moves to the new chapter, and the relationship compounds — referrals, renewals, and the next transaction all start where you already are." },
            ].map((c) => (
              <div key={c.h} className="card p-6">
                <c.icon className="text-teal" size={24} />
                <h3 className="mt-3 font-bold">{c.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="dark-panel py-16 sm:py-20">
        <div className="container-x">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Working for you around the clock</h2>
          <p className="mt-2 max-w-2xl text-[#cfc7b8]">Not promises — shipped and running today.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gauge, h: "JULY Value estimates", b: "Real AVM numbers with confidence grades, auto-refreshed — never a stale value in front of a client." },
              { icon: CalendarClock, h: "Renewal Radar", b: "Every stored mortgage's renewal on your Signals page a year out. Their lender calls at 4–6 months. You call first." },
              { icon: FileScan, h: "AI document scans", b: "Inspections, strata packages, and disclosures read by AI — findings graduate straight into the home's inventory." },
              { icon: LineChart, h: "Live market data", b: "Active counts, median ask, and $/sqft from JULY Search, right inside their pricing lab." },
              { icon: HeartHandshake, h: "Relationship timeline", b: "Every hub's full story — leads, visits, milestones — one click deep in your portal." },
              { icon: FileText, h: "Annual Home Report", b: "A print-ready year-in-review prepared in your name. The closing gift that keeps arriving." },
              { icon: Mail, h: "Weekly signal digest", b: "Monday morning: every lead, activation, and upcoming renewal in your book. Quiet weeks send nothing." },
              { icon: Radar, h: "Valuation lead capture", b: "A public what's-it-worth page that lands in your inbox with an instant JULY Value estimate attached." },
            ].map((f) => (
              <div key={f.h} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <f.icon size={22} className="text-[#7fd1c7]" />
                <h3 className="mt-3 text-sm font-bold text-white">{f.h}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#cfc7b8]">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple plans</h2>
          <p className="mt-2 text-gray-600">Start free. Upgrade when the pipeline proves itself.</p>
          {/* Rendered from the shared TIERS list so this page can never drift
              from what /pro/upgrade actually charges. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t) => (
              <div key={t.name} className={`card relative p-6 ${t.popular ? "ring-2 ring-teal" : ""}`}>
                {t.popular && (
                  <span className="absolute right-4 top-4 rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-bold text-teal-deep">MOST POPULAR</span>
                )}
                <p className="font-extrabold uppercase tracking-wide text-navy">{t.name}</p>
                <p className="mt-2 text-3xl font-extrabold">{t.price}<span className="text-sm font-bold text-gray-400">{t.per}</span></p>
                <p className="mt-1 text-sm text-gray-500">Up to <b>{t.limit}</b> active clients</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.features.map((li) => (
                    <li key={li} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" />{li}</li>
                  ))}
                </ul>
                <Link href="/claim?role=professional" className="btn btn-ghost btn-sm mt-6 w-full">Get started</Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Already with JULY Realty? Every plan is included — ask for your code.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-coral">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Be the advisor they never lose touch with.</h2>
          <Link href="/claim?role=professional" className="btn btn-lg shrink-0 bg-white text-coral hover:opacity-90">
            Create your dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="dark-panel py-6 text-center text-xs text-[#8f887b]">
        © {new Date().getFullYear()} JULY Marketing Inc. · JULYOwner · Brokerage services by JULY Realty
      </footer>
    </main>
  );
}
