"use client";
import { useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import { fmtDate } from "@/lib/calc";
import { Card, Modal, Field } from "@/components/ui";
import { HomeSubnav } from "@/components/home-subnav";
import { Plus, CheckCircle2, Landmark, Home as HomeIc, Wrench } from "lucide-react";

export default function TimelinePage() {
  const { hub, tasks, setTaskStatus, addTask } = useHub();
  const [addOpen, setAddOpen] = useState(false);

  const events = useMemo(() => {
    const history: { id: string; date: string; label: string; kind: "history" | "task"; icon: "home" | "bank" | "wrench" }[] = [];
    if (hub?.purchase_date) history.push({ id: "buy", date: hub.purchase_date, label: "You bought this home", kind: "history", icon: "home" });
    history.push({ id: "tax", date: "2026-01-01", label: "Property tax assessment", kind: "history", icon: "bank" });
    const future = tasks
      .filter((t) => t.status === "pending" && t.due_date)
      .map((t) => ({ id: t.id, date: t.due_date as string, label: t.title, kind: "task" as const, icon: "wrench" as const }));
    return [...history, ...future].sort((a, b) => a.date.localeCompare(b.date));
  }, [hub, tasks]);

  const todayIdx = events.findIndex((e) => e.date > new Date().toISOString().slice(0, 10));

  return (
    <div>
      <HomeSubnav current="/hub/home/timeline" />
      <div className="container-x py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Timeline</h1>
            <p className="mt-1 text-sm text-gray-500">Your home&apos;s past and its next chapter, in order.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Plus size={15} /> Add</button>
        </div>

        <div className="relative mx-auto mt-8 max-w-2xl">
          <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-teal-soft sm:left-1/2" />
          {events.map((e, i) => {
            const isToday = i === todayIdx;
            const Icon = e.icon === "home" ? HomeIc : e.icon === "bank" ? Landmark : Wrench;
            const left = i % 2 === 0;
            return (
              <div key={e.id}>
                {isToday && (
                  <div className="relative z-10 my-4 flex justify-start sm:justify-center">
                    <span className="ml-0.5 rounded-full bg-teal px-4 py-1 text-xs font-extrabold text-white sm:ml-0">Today</span>
                  </div>
                )}
                <div className={`relative mb-3 flex sm:mb-4 ${left ? "sm:justify-start" : "sm:justify-end"}`}>
                  <span className="absolute left-4 top-5 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-teal bg-white sm:left-1/2" />
                  <Card className={`ml-10 w-full p-4 sm:ml-0 sm:w-[calc(50%-24px)]`}>
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="shrink-0 text-teal" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{fmtDate(e.date)} · {e.kind === "task" ? "Maintenance" : "History"}</p>
                        <p className="truncate text-sm font-bold">{e.label}</p>
                      </div>
                      {e.kind === "task" && (
                        <button title="Mark done" onClick={() => setTaskStatus(e.id, "done")}
                          className="shrink-0 text-gray-300 transition hover:text-teal"><CheckCircle2 size={20} /></button>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to timeline">
        <AddForm onAdd={async (title, date) => { await addTask({ title, due_date: date }); setAddOpen(false); }} />
      </Modal>
    </div>
  );
}

function AddForm({ onAdd }: { onAdd: (title: string, date: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-4">
      <Field label="What's happening?"><input className="input" placeholder="e.g. Roof quote with Pacific Ridge" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
      <Field label="When"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <button className="btn btn-primary btn-lg w-full" disabled={!title.trim()} onClick={() => onAdd(title.trim(), date)}>Add</button>
    </div>
  );
}
