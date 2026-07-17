import Link from "next/link";
import { ArrowRight, Home, Check, Radar, HeartHandshake, Repeat } from "lucide-react";

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
              JULYOwner keeps you in their corner — a branded home hub they use monthly,
              with your name on every screen and an alert the moment they start thinking about their next move.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/claim?role=professional" className="btn btn-coral btn-lg">Create your dashboard <ArrowRight size={18} /></Link>
              <Link href="/pro?demo=1" className="btn btn-cream btn-lg">Tour the demo dashboard</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["~1 in 4", "sellers list with the agent who helped them buy — the rest simply lost touch (NAR research)"],
              ["95%", "of your database won't move this year. The 5% who will? They tell you first when you're already in their hub."],
              ["10+ yrs", "average gap between moves. Fridge magnets don't survive that. A useful product does."],
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
              { icon: Radar, h: "Know when they're ready", b: "See hub activity as it happens: who checked their value, who priced a renovation, who clicked “Sell my home.” Reach out at exactly the right moment." },
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

      {/* PRICING */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple plans</h2>
          <p className="mt-2 text-gray-600">Start free. Upgrade when the pipeline proves itself.</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="card p-7">
              <p className="font-extrabold uppercase tracking-wide text-teal">Standard</p>
              <p className="mt-2 text-4xl font-extrabold">Free</p>
              <p className="mt-1 text-sm text-gray-500">For every JULY advisor and partner</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Up to 500 client hubs",
                  "Your branding on every hub and email",
                  "Contacts, invites & landing page",
                  "Curated service-provider list",
                  "Monthly value emails to your clients",
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2"><Check size={17} className="mt-0.5 shrink-0 text-teal" />{li}</li>
                ))}
              </ul>
              <Link href="/claim?role=professional" className="btn btn-primary btn-md mt-7 w-full">Get started</Link>
            </div>
            <div className="card relative overflow-hidden p-7">
              <span className="absolute right-5 top-5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">MOST POPULAR</span>
              <p className="font-extrabold uppercase tracking-wide text-navy">Professional</p>
              <p className="mt-2 text-4xl font-extrabold">$49<span className="text-base font-bold text-gray-400">/mo</span></p>
              <p className="mt-1 text-sm text-gray-500">or $399/yr — two months free</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Everything in Standard, plus:",
                  "1,000 client hubs",
                  "Hub activity feed & engagement alerts",
                  "Opportunity signals (likely sellers & refis)",
                  "Custom-branded touchpoint emails",
                  "Priority support",
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2"><Check size={17} className="mt-0.5 shrink-0 text-navy" />{li}</li>
                ))}
              </ul>
              <Link href="/claim?role=professional" className="btn btn-dark btn-md mt-7 w-full">Start Professional</Link>
              <p className="mt-3 text-center text-xs text-gray-400">Create 100 active hubs and your first Professional year is on us.</p>
            </div>
          </div>
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
        © {new Date().getFullYear()} JULY Realty · JULYOwner
      </footer>
    </main>
  );
}
