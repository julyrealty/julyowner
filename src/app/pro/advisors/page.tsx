"use client";
import { useState } from "react";
import { usePro } from "@/lib/pro-store";
import { Card, Modal, Field, Avatar, Toggle, Pill } from "@/components/ui";
import { Plus } from "lucide-react";

const TYPES = ["Mortgage Broker", "Loan Officer", "Insurance Advisor", "Notary / Lawyer", "Home Inspector"];

export default function ProAdvisors() {
  const { advisors, addAdvisor, setDefaultAdvisor } = usePro();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Advisors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your default advisor appears in every new hub — clients get a trusted lending contact, you get a co-marketing partner.
          </p>
        </div>
        <button className="btn btn-dark btn-md" onClick={() => setAddOpen(true)}><Plus size={16} /> Add advisor</button>
      </div>

      <div className="mt-6 space-y-2">
        {advisors.map((a) => (
          <Card key={a.id} className="flex items-center gap-3 p-4">
            <Avatar name={`${a.first_name} ${a.last_name}`} size={40} color="var(--navy)" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{a.first_name} {a.last_name}</p>
                {a.is_default && <Pill tone="green">Default — added to new hubs</Pill>}
              </div>
              <p className="text-xs text-gray-400">{a.advisor_type}{a.company ? ` · ${a.company}` : ""}{a.email ? ` · ${a.email}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-gray-400">
              Default
              <Toggle on={!!a.is_default} onChange={() => setDefaultAdvisor(a.id)} label="Default advisor" />
            </div>
          </Card>
        ))}
        {advisors.length === 0 && (
          <Card className="p-10 text-center">
            <p className="font-bold">No advisors yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Add your go-to mortgage partner so every hub ships with financing help built in.</p>
            <button className="btn btn-primary btn-md mt-4" onClick={() => setAddOpen(true)}>Add your first advisor</button>
          </Card>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add advisor">
        <AdvisorForm onAdd={async (a) => { await addAdvisor(a); setAddOpen(false); }} />
      </Modal>
    </div>
  );
}

function AdvisorForm({ onAdd }: {
  onAdd: (a: { first_name: string; last_name: string; advisor_type: string; email?: string; phone?: string; company?: string; is_default?: boolean }) => Promise<void>;
}) {
  const [f, setF] = useState({ first_name: "", last_name: "", advisor_type: TYPES[0], email: "", phone: "", company: "", is_default: true });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name"><input className="input" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoFocus /></Field>
        <Field label="Last name"><input className="input" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
      </div>
      <Field label="Type">
        <select className="input" value={f.advisor_type} onChange={(e) => setF({ ...f, advisor_type: e.target.value })}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Company"><input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
      </div>
      <label className="flex items-center justify-between rounded-xl border border-line p-4">
        <span>
          <span className="block text-sm font-bold">Automatically add to new hubs</span>
          <span className="block text-xs text-gray-500">One default advisor per type — you can switch anytime.</span>
        </span>
        <Toggle on={f.is_default} onChange={(v) => setF({ ...f, is_default: v })} label="default" />
      </label>
      <button className="btn btn-primary btn-lg w-full" disabled={!f.first_name} onClick={() => onAdd(f)}>Save advisor</button>
    </div>
  );
}
