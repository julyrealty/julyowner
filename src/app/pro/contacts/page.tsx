"use client";
import { useState } from "react";
import { usePro } from "@/lib/pro-store";
import { Card, Modal, Field, Pill, Avatar } from "@/components/ui";
import { Search, UserPlus, Copy, Check } from "lucide-react";

export default function ProContacts() {
  const { contacts, addContact, inviteContact } = usePro();
  const [qtext, setQtext] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitee, setInvitee] = useState<string | null>(null); // picking a playbook for this contact

  const list = contacts.filter((c) =>
    (c.first_name + " " + c.last_name + c.email).toLowerCase().includes(qtext.toLowerCase()),
  );
  const readyCount = contacts.filter((c) => c.joined === 0 && c.pending === 0).length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">Your database is the asset. Keep it warm.</p>
        </div>
        <button className="btn btn-dark btn-md" onClick={() => setAddOpen(true)}><UserPlus size={16} /> New contact</button>
      </div>

      {readyCount > 0 && (
        <Card className="mt-5 flex flex-col items-start justify-between gap-3 bg-teal-soft/60 p-4 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold">You have <b>{readyCount}</b> contact{readyCount > 1 ? "s" : ""} ready to be invited to a hub.</p>
          <span className="text-xs text-gray-500">Tap “Invite” beside a name to send their claim link.</span>
        </Card>
      )}

      <div className="relative mt-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input input-lead" placeholder="Search by name or email…" value={qtext} onChange={(e) => setQtext(e.target.value)} />
      </div>

      <div className="mt-4 space-y-2">
        {list.map((c) => (
          <Card key={c.id} className="flex items-center gap-3 p-4">
            <Avatar name={`${c.first_name} ${c.last_name}`} size={38} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{c.first_name} {c.last_name}</p>
                {c.tags.map((t) => <Pill key={t} tone="teal">{t}</Pill>)}
                {c.joined > 0 && <Pill tone="green">In hub</Pill>}
                {c.pending > 0 && <Pill tone="gold">Invited</Pill>}
              </div>
              <p className="truncate text-xs text-gray-400">{c.email}{c.addr ? ` · ${c.addr}` : ""}</p>
            </div>
            {typeof c.propensity === "number" && (
              <div className="hidden shrink-0 text-right sm:block">
                <p className="tabular text-sm font-extrabold text-teal-deep">{c.propensity}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">sell signal</p>
              </div>
            )}
            <button className="btn btn-primary btn-sm shrink-0"
              onClick={() => { setCopied(false); setInvitee(c.id); }}>
              {c.joined > 0 ? "View hub" : c.pending > 0 ? "Re-invite" : "Invite to hub"}
            </button>
          </Card>
        ))}
        {list.length === 0 && <Card className="p-8 text-center text-sm text-gray-500">No contacts yet — add your first above.</Card>}
      </div>

      {/* PICK PLAYBOOK */}
      <Modal open={invitee !== null} onClose={() => setInvitee(null)} title="Which hub fits them today?">
        <div className="space-y-3">
          <button className="w-full rounded-2xl border border-line p-4 text-left transition hover:border-teal"
            onClick={async () => { const id = invitee!; setInvitee(null); setInviteLink(await inviteContact(id, "owning")); }}>
            <p className="font-bold">Homeowner hub</p>
            <p className="mt-0.5 text-[13px] text-gray-500">They own their place — value, equity, maintenance, documents. They&apos;ll enter their address at signup.</p>
          </button>
          <button className="w-full rounded-2xl border border-line p-4 text-left transition hover:border-teal"
            onClick={async () => { const id = invitee!; setInvitee(null); setInviteLink(await inviteContact(id, "buying")); }}>
            <p className="font-bold">Buyer search HQ</p>
            <p className="mt-0.5 text-[13px] text-gray-500">They&apos;re shopping — watched homes, purchasing power, tours, AI document scans. No address needed.</p>
          </button>
          <p className="text-center text-[11px] text-gray-400">Either way it&apos;s your brand on their screen — and hubs change playbooks as life changes.</p>
        </div>
      </Modal>

      {/* ADD CONTACT */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New contact">
        <NewContactForm onAdd={async (c) => { await addContact(c); setAddOpen(false); }} />
      </Modal>

      {/* INVITE LINK */}
      <Modal open={!!inviteLink} onClose={() => setInviteLink(null)} title="Invitation ready">
        <p className="text-sm text-gray-600">
          Send this personal claim link by email or text. When they claim their home, the hub lands in your book automatically — branded to you.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-gray-50 p-3">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-600">{inviteLink}</p>
          <button className="btn btn-primary btn-sm shrink-0"
            onClick={async () => { try { await navigator.clipboard.writeText(inviteLink!); setCopied(true); } catch {} }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400">Email delivery hooks in next — for now the link itself is live and shareable.</p>
      </Modal>
    </div>
  );
}

function NewContactForm({ onAdd }: { onAdd: (c: { first_name: string; last_name: string; email: string }) => Promise<void> }) {
  const [f, setF] = useState({ first_name: "", last_name: "", email: "" });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name"><input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoFocus /></Field>
        <Field label="Last name"><input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
      </div>
      <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <button className="btn btn-primary btn-lg w-full" disabled={!f.first_name || !f.email.includes("@")} onClick={() => onAdd(f)}>Save contact</button>
    </div>
  );
}
