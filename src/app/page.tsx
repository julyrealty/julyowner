import Link from "next/link";
import {
  ArrowRight, TrendingUp, Wrench, PiggyBank, ShieldCheck, Sparkles,
  FileLock2, BellRing, LineChart, Home, ChevronDown,
} from "lucide-react";

export default function Landing() {
  return (
    <main className="flex-1">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-gray-600 md:flex">
            <a href="#features" className="hover:text-ink">What you get</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
            <Link href="/worth" className="hover:text-ink">Home worth</Link>
            <Link href="/professionals" className="hover:text-ink">For professionals</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href="/claim" className="btn btn-primary btn-sm">Claim your home</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="dark-panel relative overflow-hidden">
        <Confetti />
        <div className="container-x relative grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div className="rise">
            <p className="eyebrow mb-4 text-gold">Free for JULY Realty clients</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Your home is a<br />million-dollar asset.<br />
              <span className="text-[#7fd1c7]">Run it like one.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-[#cfc7b8]">
              JULYOwner is your private home hub — live value and equity, a maintenance
              plan built from what&apos;s actually under your roof, mortgage savings math,
              and one secure place for every document.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/claim" className="btn btn-coral btn-lg">
                Claim your home — it&apos;s free <ArrowRight size={18} />
              </Link>
              <Link href="/hub?demo=1" className="btn btn-cream btn-lg">See a live demo hub</Link>
            </div>
            <p className="mt-4 text-sm text-[#8f887b]">
              No credit card. No app to download. Two minutes to set up.
            </p>
          </div>

          {/* Hero product card */}
          <div className="rise rise-2 relative mx-auto w-full max-w-md">
            <div className="rounded-3xl bg-gradient-to-br from-[#e8825f] to-[#d9a441] p-4 sm:p-6">
              <div className="card overflow-hidden shadow-2xl">
                <div className="bg-teal px-5 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Welcome home, Dana</p>
                  <p className="text-lg font-bold">2718 W 21st Ave</p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-line">
                  <div className="bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Home value</p>
                    <p className="tabular text-2xl font-extrabold text-ink">$1.87M</p>
                    <p className="text-xs font-semibold text-emerald-600">▲ $685K since purchase</p>
                  </div>
                  <div className="bg-white p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Equity</p>
                    <p className="tabular text-2xl font-extrabold text-ink">$1.15M</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                      <div className="h-full w-[62%] rounded-full bg-teal" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">What&apos;s next</p>
                  {["Change furnace filter — 15 min", "Review home insurance — 30 min", "Gutter clean before fall — book a pro"].map((tx) => (
                    <div key={tx} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-medium">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-teal" /> {tx}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-[#8f887b]">A real hub, seeded with a Vancouver home — open the demo to explore it.</p>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="border-b border-line bg-white">
        <div className="container-x grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
          {/* Each of these is either a product fact or an openly-labelled rule of
              thumb — no unsourced statistics on a public page. */}
          {[
            ["Every month", "your estimate refreshes on its own — no logging in to check"],
            ["~1%/yr", "a common rule for budgeting maintenance — we turn it into a real plan"],
            ["80% LTV", "the ceiling most lenders set on borrowing against your home"],
            ["1 place", "for every document, warranty, and serial number"],
          ].map(([big, small]) => (
            <div key={big as string}>
              <p className="tabular text-2xl font-extrabold text-teal">{big}</p>
              <p className="mx-auto mt-1 max-w-[180px] text-xs text-gray-500">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="cream-panel py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow text-teal">What you get</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            One hub with everything your home needs
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`card rise rise-${(i % 3) + 1} p-6`}>
                <f.icon className="text-teal" size={26} strokeWidth={2.2} />
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SELLER HOOK */}
      <section className="bg-teal">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-white/70">Free home valuation</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Thinking of selling? Know your number first.
            </h2>
            <p className="mt-2 max-w-xl text-white/85">
              A JULY advisor prepares a real market evaluation — your realistic range and what
              you&apos;d actually walk away with — within one business day. Free, no obligation.
            </p>
          </div>
          <Link href="/worth" className="btn btn-lg shrink-0 bg-white text-teal hover:opacity-90">
            Get my free valuation <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="dark-panel py-16 sm:py-24">
        <div className="container-x">
          <p className="eyebrow text-gold">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Set up in less time than a coffee run
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Claim your address", "Tell us where home is. We build your private hub around the property itself — value, equity, and a starter plan."],
              ["02", "Make it yours", "Add your mortgage, snap photos of your furnace and appliances, drop in documents. Every detail makes the hub smarter."],
              ["03", "Let it work", "Monthly value updates, maintenance reminders timed to your equipment, and real math for every what-if decision."],
            ].map(([n, h, b]) => (
              <div key={n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="tabular text-sm font-bold text-gold">{n}</p>
                <h3 className="mt-2 text-lg font-bold">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#cfc7b8]">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/claim" className="btn btn-coral btn-lg">Start with your address <ArrowRight size={18} /></Link>
            <span className="text-sm text-[#8f887b]">or poke around the <Link href="/hub?demo=1" className="font-semibold text-[#7fd1c7] hover:underline">demo hub</Link> first — no signup.</span>
          </div>
        </div>
      </section>

      {/* ADVISOR VALUE */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-teal">Backed by a real person</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your JULY advisor lives in the hub — not in your spam folder
            </h2>
            <p className="mt-4 max-w-lg text-gray-600">
              Every hub is sponsored by a JULY Realty advisor. When you have a question,
              need a trusted plumber, or start thinking about your next move, the person
              who knows your home is one tap away. No cold calls, no fridge magnets —
              just help when you actually want it.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "A vetted list of local pros your advisor actually recommends",
                "One-tap “Sell my home” and “Get a loan” when the time comes",
                "A human answer within a day — not a ticket queue",
              ].map((li) => (
                <li key={li} className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 shrink-0 text-teal" size={18} /> <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card mx-auto w-full max-w-sm p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal text-xl font-bold text-white">JL</span>
              <div>
                <p className="font-bold">Jordan Lee</p>
                <p className="text-sm text-gray-500">Real Estate Advisor · JULY Realty</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <span className="btn btn-ghost btn-sm">Send email</span>
              <span className="btn btn-primary btn-sm">Let&apos;s connect</span>
            </div>
            <div className="mt-5 rounded-xl bg-cream p-4 text-sm text-gray-700">
              “Your hub is yours forever — I just keep it stocked with good data and good people.”
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="bg-coral">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your house has been waiting for this.
            </h2>
            <p className="mt-2 text-white/85">Two minutes. Free for JULY clients. Yours for as long as you own the place.</p>
          </div>
          <Link href="/claim" className="btn btn-lg shrink-0 bg-white text-coral hover:opacity-90">
            Claim your home <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="cream-panel py-16 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[300px_1fr]">
          <h2 className="text-3xl font-extrabold tracking-tight">Frequently asked questions</h2>
          <div className="divide-y divide-[var(--sand)]">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                  {f.q}
                  <ChevronDown size={18} className="shrink-0 text-gray-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dark-panel">
        <div className="container-x flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo dark />
            <p className="mt-2 max-w-sm text-xs text-[#8f887b]">
              JULYOwner is a homeowner hub provided by JULY Realty. Value and market figures are
              estimates for information only — not an appraisal or financial advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#cfc7b8]">
            <Link href="/worth" className="hover:text-white">Home worth</Link>
            <Link href="/professionals" className="hover:text-white">For professionals</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
            <Link href="/claim" className="hover:text-white">Claim your home</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-[#8f887b]">
          © {new Date().getFullYear()} JULY Marketing Inc. · Brokerage services by JULY Realty · Vancouver, BC
        </div>
      </footer>
    </main>
  );
}

const FEATURES = [
  { icon: TrendingUp, title: "Live value & equity", body: "A monthly estimate of what your home is worth, what you owe, and exactly how much equity you're sitting on." },
  { icon: Wrench, title: "A maintenance brain", body: "Add your furnace, roof, and appliances once — get reminders timed to each item's real service schedule and lifespan." },
  { icon: PiggyBank, title: "Mortgage savings math", body: "See interest vs. principal, test extra payments, and compare renewal scenarios with honest Canadian math." },
  { icon: LineChart, title: "Renovation ROI", body: "From a laneway home to a heat pump — what projects cost in Vancouver and what they add to your value." },
  { icon: FileLock2, title: "A digital safe", body: "Insurance, warranties, receipts, the seller's disclosure — organized, private, and findable in seconds." },
  { icon: BellRing, title: "Timely nudges", body: "One useful email a month, plus reminders you chose. Nothing spammy — you control every notification." },
  { icon: Home, title: "Your whole neighbourhood", body: "Recent sales, market trends, and what nearby homes are worth — the context behind your number." },
  { icon: Sparkles, title: "Trusted pros on tap", body: "A short list of plumbers, electricians, and roofers vetted by your JULY advisor — not a random directory." },
] as const;

const FAQS = [
  { q: "Is it really free?", a: "Yes. JULYOwner is a service JULY Realty provides to its clients and community. There's no charge, no trial clock, and no credit card field anywhere." },
  { q: "Do I need to download an app?", a: "No — JULYOwner runs in your browser and is designed mobile-first, so it feels like an app on your phone without taking up space on it." },
  { q: "How accurate is the home value?", a: "We blend recent nearby sales and market trends to give a realistic range, refreshed monthly. It's an estimate for planning — when you want a precise number, your advisor will prepare a proper market evaluation for free." },
  { q: "Who can see my documents and data?", a: "You, and anyone you invite to your hub (like a co-owner). Your documents are never visible to your advisor — they see only that you're an active hub member, never your files." },
  { q: "What if I didn't buy my home through JULY Realty?", a: "You're still welcome. Claim your home and a JULY advisor will sponsor your hub — that's the whole point: we'd love to earn your business by being useful first." },
  { q: "Can I add a second property?", a: "Yes — rental condos, cabins, the works. Each property gets its own hub with its own value tracking and maintenance plan." },
] as const;

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
      <span className={dark ? "text-white" : "text-ink"}>JULY</span>
      <span className="flex items-center gap-0.5 text-teal">
        <Home size={18} strokeWidth={2.8} className="translate-y-[1px]" />Owner
      </span>
    </Link>
  );
}

function Confetti() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
      {[
        [90, 80, "#e8604c"], [1130, 90, "#d9a441"], [1050, 480, "#7fd1c7"], [160, 500, "#d9a441"],
        [620, 60, "#7fd1c7"], [980, 200, "#e8604c"], [250, 300, "#7fd1c7"], [830, 540, "#d9a441"],
      ].map(([x, y, c], i) => (
        <path key={i} d={`M${x},${y} l14,-8 l-2,16 z`} fill={c as string} transform={`rotate(${(i * 47) % 360} ${x} ${y})`} />
      ))}
    </svg>
  );
}
