"use client";
import { useState } from "react";
import { useHub } from "@/lib/store";
import { sb } from "@/lib/supabase";
import { Card, SectionLabel, Field, Avatar } from "@/components/ui";

export default function HubProfile() {
  const { profile, demo } = useHub();
  const [f, setF] = useState({ first: profile?.first_name ?? "", last: profile?.last_name ?? "", phone: (profile as { phone?: string })?.phone ?? "" });
  const [pw, setPw] = useState("");
  const [saved, setSaved] = useState("");

  async function saveInfo() {
    if (!demo) {
      const user = (await sb().auth.getUser()).data.user;
      if (user) await sb().from("ho_profiles").update({ first_name: f.first, last_name: f.last, phone: f.phone || null }).eq("id", user.id);
    }
    setSaved("Profile saved ✓");
    setTimeout(() => setSaved(""), 2500);
  }

  async function savePw() {
    if (demo) { setSaved("Demo mode — password changes are disabled ✓"); setPw(""); return; }
    const { error } = await sb().auth.updateUser({ password: pw });
    setSaved(error ? error.message : "Password updated ✓");
    if (!error) setPw("");
    setTimeout(() => setSaved(""), 3000);
  }

  return (
    <div className="container-x max-w-2xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Profile &amp; settings</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={`${f.first} ${f.last}`} size={52} />
          <div>
            <p className="font-bold">{f.first} {f.last}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="First name"><input className="input" value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} /></Field>
          <Field label="Last name"><input className="input" value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Phone"><input className="input" placeholder="(604) 555-0100" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <button className="btn btn-primary btn-md mt-5" onClick={saveInfo}>Save changes</button>
      </Card>

      <SectionLabel><span className="mt-8 block">Security</span></SectionLabel>
      <Card className="p-6">
        <Field label="New password" hint="8+ characters.">
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <button className="btn btn-dark btn-md mt-4" disabled={pw.length < 8} onClick={savePw}>Update password</button>
      </Card>

      <SectionLabel><span className="mt-8 block">Notifications</span></SectionLabel>
      <Card className="divide-y divide-line">
        {[
          ["Monthly home value report", "Always on — the heart of your hub"],
          ["Maintenance reminders", "Timed to the items in your inventory"],
          ["Market updates", "When something notable happens nearby"],
        ].map(([t, d]) => (
          <div key={t} className="flex items-center justify-between gap-3 p-4">
            <div><p className="text-sm font-bold">{t}</p><p className="text-xs text-gray-400">{d}</p></div>
            <span className="rounded-full bg-teal-soft px-3 py-1 text-[11px] font-bold text-teal-deep">Email</span>
          </div>
        ))}
      </Card>

      {saved && <p className="mt-4 rounded-xl bg-teal-soft px-4 py-3 text-sm font-bold text-teal-deep">{saved}</p>}
    </div>
  );
}
