"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Clock3, Home, Mail, Phone, ShieldCheck, TrendingUp, User,
} from "lucide-react";
import { sb } from "@/lib/supabase";
import { Field } from "@/components/ui";
import { AddressAutocomplete } from "@/components/address-autocomplete";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WorthPage() {
  const [addr, setAddr] = useState({ unit: "", address1: "", city: "Vancouver", region: "BC", postal: "" });
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ address: string; email: string } | null>(null);

  const canSubmit =
    addr.address1.trim().length > 0 &&
    addr.city.trim().length > 0 &&
    form.name.trim().length > 0 &&
    EMAIL_RE.test(form.email.trim());

  function composeAddress() {
    const street = addr.unit.trim() ? `${addr.unit.trim()}-${addr.address1.trim()}` : addr.address1.trim();
    return [street, addr.city.trim(), addr.region.trim(), addr.postal.trim().toUpperCase()]
      .filter(Boolean)
      .join(", ");
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr("");
    const address = composeAddress();
    const email = form.email.trim();
    try {
      const { error } = await sb().from("ho_leads").insert({
        kind: "valuation",
        name: form.name.trim(),
        email,
        phone: form.phone.trim() || null,
        address,
        message: `Valuation request for ${address}`,
      });
      if (error) throw error;
      setDone({ address, email });
    } catch {
      setErr("That didn't go through — a hiccup on our end, most likely. Your details are still here, so please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col dark-panel">
      {/* NAV — minimal */}
      <header className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
          <span className="text-white">JULY</span>
          <span className="flex items-center gap-0.5 text-[#7fd1c7]"><Home size={18} strokeWidth={2.8} />Owner</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-[#cfc7b8] hover:text-white">Sign in</Link>
      </header>

      {/* HERO + FORM */}
      <div className="container-x grid flex-1 gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
        <div className="rise">
          <p className="eyebrow mb-4 text-gold">Free home valuation</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            What is your home <span className="text-[#7fd1c7]">really</span> worth?
          </h1>
          <p className="mt-5 max-w-md text-lg text-[#cfc7b8]">
            Online estimates guess from a postal code. A local JULY advisor looks at your
            street, recent sales around you, and what buyers are paying right now — then
            sends you a proper market evaluation within one business day.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-[#cfc7b8]">
            {[
              { icon: Clock3, text: "A real evaluation in your inbox within one business day" },
              { icon: ShieldCheck, text: "Prepared by a licensed REALTOR® — a person, not an algorithm" },
              { icon: TrendingUp, text: "Built from actual sales near you, not a national average" },
            ].map((b) => (
              <li key={b.text} className="flex items-start gap-2.5">
                <b.icon className="mt-0.5 shrink-0 text-[#7fd1c7]" size={18} /> <span>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form card */}
        <div className="rise rise-2 w-full max-w-md lg:justify-self-end">
          <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl sm:p-8">
            {done ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="mx-auto text-teal" size={44} />
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Request received</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                  Your JULY advisor is preparing the evaluation for <b>{done.address}</b> now —
                  expect it at <b>{done.email}</b> within one business day.
                </p>
                <div className="mt-6 rounded-xl bg-cream p-4 text-left text-sm leading-relaxed text-gray-700">
                  While you wait: claim your free home hub and keep that number alive — live
                  value tracking, your equity at a glance, and a maintenance plan built for your place.
                </div>
                <Link href="/claim" className="btn btn-primary btn-lg mt-4 w-full">
                  Claim your home hub <ArrowRight size={18} />
                </Link>
                <Link href="/hub?demo=1" className="btn btn-ghost btn-md mt-3 w-full">See a live demo</Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight">Get your free evaluation</h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Takes about a minute. No robot guess — a real number from someone who knows your market.
                </p>
                <form className="mt-6 space-y-4" onSubmit={submit}>
                  <div className="grid grid-cols-[96px_1fr] gap-3">
                    <Field label="Unit" hint="If any">
                      <input className="input" placeholder="404" value={addr.unit}
                        onChange={(e) => setAddr({ ...addr, unit: e.target.value })} />
                    </Field>
                    <Field label="Street address">
                      <AddressAutocomplete
                        value={addr.address1}
                        onChange={(text) => setAddr({ ...addr, address1: text })}
                        onSelect={(p) => setAddr({ ...addr, address1: p.address1, city: p.city, region: p.region, postal: p.postal || addr.postal })}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City">
                      <input className="input" value={addr.city}
                        onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                    </Field>
                    <Field label="Postal code">
                      <input className="input" placeholder="V6L 1K3" value={addr.postal}
                        onChange={(e) => setAddr({ ...addr, postal: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Your name">
                    <div className="relative">
                      <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input input-lead" placeholder="Dana Chen" autoComplete="name" value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                  </Field>
                  <Field label="Email">
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input input-lead" type="email" placeholder="you@example.com" autoComplete="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </Field>
                  <Field label="Phone (optional)">
                    <div className="relative">
                      <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input input-lead" type="tel" placeholder="604 555 0134" autoComplete="tel" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </Field>
                  {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}
                  <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!canSubmit || busy}>
                    {busy ? "Sending…" : "Get my free evaluation"} <ArrowRight size={18} />
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    No spam. No obligation. Prepared by a licensed REALTOR® at JULY Realty.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER — mini */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-[#8f887b]">
        © {new Date().getFullYear()} JULY Realty · Vancouver, BC
      </footer>
    </main>
  );
}
