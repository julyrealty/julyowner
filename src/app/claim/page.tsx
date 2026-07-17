"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Home, MailCheck } from "lucide-react";
import { sb } from "@/lib/supabase";
import { Field } from "@/components/ui";

type Payload = {
  address1: string; city: string; region: string; postal: string;
  purchase_price?: string; purchase_date?: string;
};

function ClaimInner() {
  const params = useSearchParams();
  const isPro = params.get("role") === "professional";
  const [step, setStep] = useState<"address" | "account" | "check-email">("address");
  const [addr, setAddr] = useState<Payload>({ address1: "", city: "Vancouver", region: "BC", postal: "" });
  const [form, setForm] = useState({ first: "", last: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const supa = sb();
      const { data, error } = await supa.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            role: isPro ? "professional" : "homeowner",
            first_name: form.first.trim(),
            last_name: form.last.trim(),
          },
        },
      });
      if (error) throw error;
      // Stash the claim so we can finish it after email confirmation / first session.
      if (!isPro) localStorage.setItem("julyowner-pending-claim", JSON.stringify(addr));
      if (data.session) {
        window.location.href = "/auth/callback";
        return;
      }
      setStep("check-email");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col dark-panel">
      <header className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold">
          <span className="text-white">JULY</span>
          <span className="flex items-center gap-0.5 text-[#7fd1c7]"><Home size={18} strokeWidth={2.8} />Owner</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-[#cfc7b8] hover:text-white">Sign in</Link>
      </header>

      <div className="container-x flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-ink shadow-2xl sm:p-8">
          {step === "address" && !isPro && (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Where&apos;s home?</h1>
              <p className="mt-1.5 text-sm text-gray-500">Your hub is built around your property — start with the address.</p>
              <div className="mt-6 space-y-4">
                <Field label="Street address">
                  <input className="input" placeholder="2718 W 21st Ave" value={addr.address1}
                    onChange={(e) => setAddr({ ...addr, address1: e.target.value })} autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City">
                    <input className="input" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                  </Field>
                  <Field label="Postal code">
                    <input className="input" placeholder="V6L 1K3" value={addr.postal} onChange={(e) => setAddr({ ...addr, postal: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Purchase year (optional)">
                    <input className="input" placeholder="2016" inputMode="numeric" value={addr.purchase_date ?? ""}
                      onChange={(e) => setAddr({ ...addr, purchase_date: e.target.value })} />
                  </Field>
                  <Field label="Purchase price (optional)">
                    <input className="input" placeholder="$1,180,000" inputMode="numeric" value={addr.purchase_price ?? ""}
                      onChange={(e) => setAddr({ ...addr, purchase_price: e.target.value })} />
                  </Field>
                </div>
                <button
                  className="btn btn-primary btn-lg w-full"
                  disabled={!addr.address1.trim() || !addr.city.trim()}
                  onClick={() => setStep("account")}
                >
                  Continue <ArrowRight size={18} />
                </button>
                <p className="text-center text-xs text-gray-400">
                  Renting or just curious? <Link className="link" href="/hub?demo=1">Explore the demo hub</Link> instead.
                </p>
              </div>
            </>
          )}

          {step !== "check-email" && (step === "account" || isPro) && (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {isPro ? "Create your professional account" : "Almost there"}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                {isPro
                  ? "Set up your book of business: contacts, hubs, and your branded client experience."
                  : `We'll build the hub for ${addr.address1 || "your home"} the moment you're in.`}
              </p>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name"><input className="input" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} /></Field>
                  <Field label="Last name"><input className="input" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} /></Field>
                </div>
                <Field label="Email">
                  <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Password" hint="8+ characters.">
                  <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </Field>
                {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}
                <button className="btn btn-coral btn-lg w-full" disabled={busy || !form.email || form.password.length < 8 || !form.first}
                  onClick={submit}>
                  {busy ? "Creating…" : isPro ? "Create my account" : "Claim my home"} <ArrowRight size={18} />
                </button>
                {!isPro && (
                  <button className="w-full text-center text-sm font-semibold text-gray-400 hover:text-gray-600" onClick={() => setStep("address")}>
                    ← Back to address
                  </button>
                )}
              </div>
            </>
          )}

          {step === "check-email" && (
            <div className="py-6 text-center">
              <MailCheck className="mx-auto text-teal" size={44} />
              <h1 className="mt-4 text-2xl font-extrabold">Check your email</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
                We sent a confirmation link to <b>{form.email}</b>. Click it and your
                {isPro ? " dashboard" : " hub"} will be ready and waiting.
              </p>
              <Link href="/hub?demo=1" className="btn btn-primary btn-md mt-6">
                Meanwhile, explore the demo hub
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ClaimPage() {
  return <Suspense><ClaimInner /></Suspense>;
}
