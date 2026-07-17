"use client";
import { useMemo, useRef, useState } from "react";
import { useHub } from "@/lib/store";
import { relTime } from "@/lib/calc";
import { Card, Modal, Field } from "@/components/ui";
import { HomeSubnav } from "@/components/home-subnav";
import { Umbrella, ShieldCheck, FolderOpen, FileText, UploadCloud, Trash2, Plus, ChevronLeft } from "lucide-react";

const BUILT_IN = ["Insurance", "Warranty"];

export default function DocumentsPage() {
  const { docs, addDoc, removeDoc } = useHub();
  const [folder, setFolder] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    BUILT_IN.forEach((f) => map.set(f, 0));
    docs.forEach((d) => map.set(d.folder, (map.get(d.folder) || 0) + 1));
    return [...map.entries()];
  }, [docs]);

  const inFolder = docs.filter((d) => d.folder === folder);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.size > 20 * 1024 * 1024) { alert(`${f.name} is over the 20 MB limit.`); return; }
      addDoc({ folder: folder || "Everything else", name: f.name, size_bytes: f.size });
    });
  }

  const iconFor = (f: string) =>
    f === "Insurance" ? Umbrella : f === "Warranty" ? ShieldCheck : FolderOpen;

  return (
    <div>
      <HomeSubnav current="/hub/home/documents" />
      <div className="container-x py-8">
        {!folder ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Documents</h1>
            <p className="mt-1 text-sm text-gray-500">Your home&apos;s digital safe. Only hub members can see what&apos;s inside.</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {folders.map(([name, count]) => {
                const Icon = iconFor(name);
                return (
                  <button key={name} onClick={() => setFolder(name)} className="card p-5 text-left transition hover:border-teal">
                    <Icon size={22} className="text-teal" />
                    <p className="mt-3 font-bold">{name}</p>
                    <p className="text-xs text-gray-400">{count} file{count === 1 ? "" : "s"}</p>
                  </button>
                );
              })}
              <button onClick={() => setNewFolder(true)} className="card flex flex-col items-center justify-center gap-2 border-dashed p-5 text-gray-400 transition hover:border-teal hover:text-teal">
                <Plus size={20} /> <span className="text-sm font-bold">Add folder</span>
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`mt-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-teal bg-teal-soft" : "border-line bg-white"}`}
            >
              <UploadCloud size={28} className="mx-auto text-teal" />
              <p className="mt-3 font-extrabold">Drag &amp; drop</p>
              <p className="text-sm text-gray-500">your files here, or <span className="link">browse</span></p>
              <p className="mt-1 text-xs text-gray-400">Maximum 20 MB per file</p>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </div>
          </>
        ) : (
          <>
            <button className="link flex items-center gap-1 text-sm" onClick={() => setFolder(null)}><ChevronLeft size={15} /> Documents</button>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{folder}</h1>
            <div className="mt-5 space-y-2">
              {inFolder.length === 0 && (
                <Card className="p-8 text-center text-sm text-gray-500">Nothing here yet — drop a file below.</Card>
              )}
              {inFolder.map((d) => (
                <Card key={d.id} className="flex items-center gap-3 p-4">
                  <FileText size={18} className="shrink-0 text-coral" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{d.name}</p>
                    <p className="text-xs text-gray-400">{(d.size_bytes / 1024).toFixed(0)} KB · added {relTime(d.created_at)}</p>
                  </div>
                  <button className="shrink-0 text-gray-300 hover:text-coral" title="Delete" onClick={() => removeDoc(d.id)}><Trash2 size={16} /></button>
                </Card>
              ))}
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-line bg-white p-6 text-center text-sm text-gray-500 hover:border-teal"
              >
                <UploadCloud size={20} className="mx-auto mb-1 text-teal" /> Add to {folder}
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={newFolder} onClose={() => setNewFolder(false)} title="New folder">
        <NewFolderForm onCreate={(name) => { addDoc({ folder: name, name: ".keep", size_bytes: 0 }); setNewFolder(false); setFolder(name); }} />
      </Modal>
    </div>
  );
}

function NewFolderForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <Field label="Folder name"><input className="input" placeholder="e.g. Property Tax, Receipts" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <button className="btn btn-primary btn-lg w-full" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Create</button>
    </div>
  );
}
