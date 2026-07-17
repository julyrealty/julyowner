"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { sb } from "@/lib/supabase";
import { Field } from "@/components/ui";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    window.location.href = "/auth/callback";
  }

  async function magicLink() {
    if (!form.email) { setErr("Enter your email first."); return; }
    setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithOtp({
      email: form.email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  }

  return (
    <main className="flex min-h-dvh flex-col dark-panel">
      <header className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold">
          <span className="text-white">JULY</span>
          <span className="flex items-center gap-0.5 text-[#7fd1c7]"><Home size={18} strokeWidth={2.8} />Owner</span>
        </Link>
        <Link href="/claim" className="text-sm font-semibold text-[#cfc7b8] hover:text-white">New here? Claim your home</Link>
      </header>
      <div className="container-x flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-ink shadow-2xl sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-gray-500">Sign in to your hub or professional dashboard.</p>
          {sent ? (
            <p className="mt-6 rounded-xl bg-teal-soft px-4 py-3 text-sm font-semibold text-teal-deep">
              Magic link sent — check your inbox and tap the link on this device.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              <Field label="Email">
                <input className="input" type="email" autoComplete="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
              </Field>
              <Field label="Password">
                <input className="input" type="password" autoComplete="current-password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && signIn()} />
              </Field>
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{err}</p>}
              <button className="btn btn-primary btn-lg w-full" disabled={busy || !form.email || !form.password} onClick={signIn}>
                {busy ? "Signing in…" : "Sign in"} <ArrowRight size={18} />
              </button>
              <button className="w-full text-center text-sm font-semibold text-gray-500 hover:text-teal" onClick={magicLink} disabled={busy}>
                Email me a magic link instead
              </button>
            </div>
          )}
          <p className="mt-6 text-center text-xs text-gray-400">
            Just looking? <Link href="/hub?demo=1" className="link">Open the demo hub</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
