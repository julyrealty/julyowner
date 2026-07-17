"use client";
import { useRef, useState } from "react";
import { usePro } from "@/lib/pro-store";
import { sb } from "@/lib/supabase";
import { Card, SectionLabel, Field, Avatar } from "@/components/ui";
import { Copy, Check, UploadCloud } from "lucide-react";

const SWATCHES = ["#0e7c7b", "#12324b", "#7c3aed", "#b91c1c", "#b45309", "#166534", "#0f766e", "#1d4ed8"];

export default function ProProfile() {
  const { profile, demo, shareLink, updateProfile } = usePro();
  const p = profile as (typeof profile & { brand_color?: string; org_name?: string; logo_url?: string; photo_url?: string }) | null;
  const [f, setF] = useState({
    first: p?.first_name ?? "", last: p?.last_name ?? "", phone: p?.phone ?? "",
    company: p?.company ?? "JULY Realty", job: p?.job_title ?? "Real Estate Advisor",
    org: p?.org_name ?? "JULYOwner — Vancouver", color: p?.brand_color ?? "#0e7c7b",
  });
  const [logo, setLogo] = useState<string | null>(p?.logo_url ?? null);
  const [saved, setSaved] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) { setSaved("Logo must be under 2 MB"); return; }
    if (demo) { setLogo(URL.createObjectURL(file)); return; }
    const user = (await sb().auth.getUser()).data.user;
    if (!user) return;
    const path = `${user.id}/logo-${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await sb().storage.from("ho-brand").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = sb().storage.from("ho-brand").getPublicUrl(path);
      setLogo(data.publicUrl);
      await updateProfile({ logo_url: data.publicUrl });
    }
  }

  async function save() {
    await updateProfile({
      first_name: f.first, last_name: f.last, phone: f.phone || null,
      company: f.company || null, job_title: f.job || null,
      org_name: f.org || null, brand_color: f.color,
    });
    setSaved("Saved — every hub you sponsor now carries this branding ✓");
    setTimeout(() => setSaved(""), 3000);
  }

  return (
    <div className="max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Profile &amp; branding</h1>
      <p className="mt-1 text-sm text-gray-500">This is the face your homeowners see on every screen and email.</p>

      <SectionLabel><span className="mt-6 block">Your share link</span></SectionLabel>
      <Card className="flex items-center gap-2 p-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-600">{shareLink}</p>
        <button className="btn btn-primary btn-sm shrink-0"
          onClick={async () => { try { await navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </Card>
      <p className="mt-1.5 text-xs text-gray-400">Post it anywhere — anyone who claims their home through this link lands in your book, branded to you.</p>

      <SectionLabel><span className="mt-8 block">Identity</span></SectionLabel>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar name={`${f.first} ${f.last}`} size={52} color={f.color} />
          <div>
            <p className="font-bold">{f.first} {f.last}</p>
            <p className="text-sm text-gray-500">{f.job} · {f.company}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="First name"><input className="input" value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} /></Field>
          <Field label="Last name"><input className="input" value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Job title"><input className="input" value={f.job} onChange={(e) => setF({ ...f, job: e.target.value })} /></Field>
          <Field label="Company"><input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
          <Field label="Organization name (shown on hubs)"><input className="input" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} /></Field>
        </div>
      </Card>

      <SectionLabel><span className="mt-8 block">Brand</span></SectionLabel>
      <Card className="p-6">
        <Field label="Primary colour" hint="Your homeowners' hubs adopt this colour — instant white-label.">
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button key={c} aria-label={`Colour ${c}`} onClick={() => setF({ ...f, color: c })}
                className={`h-9 w-9 rounded-full border-4 transition ${f.color === c ? "border-ink" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-line" title="Custom colour" />
          </div>
        </Field>
        <div className="mt-5">
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo" className="h-12 max-w-[160px] rounded-lg border border-line object-contain p-1" />
              ) : (
                <span className="flex h-12 w-28 items-center justify-center rounded-lg border border-dashed border-line text-xs text-gray-400">No logo yet</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><UploadCloud size={14} /> {logo ? "Replace" : "Upload"}</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
          </Field>
        </div>
        <button className="btn btn-primary btn-md mt-6" onClick={save}>Save branding</button>
        {saved && <p className="mt-3 rounded-xl bg-teal-soft px-4 py-2.5 text-sm font-bold text-teal-deep">{saved}</p>}
      </Card>
    </div>
  );
}
