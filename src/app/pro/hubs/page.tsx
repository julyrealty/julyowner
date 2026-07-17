"use client";
import Link from "next/link";
import { usePro } from "@/lib/pro-store";
import { Card, Avatar } from "@/components/ui";
import { KeyRound, ExternalLink } from "lucide-react";

export default function ProHubs() {
  const { hubs, demo } = usePro();
  const q = demo ? "?demo=1" : "";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Hubs</h1>
          <p className="mt-1 text-sm text-gray-500">Every property you sponsor — open any hub to see exactly what your client sees.</p>
        </div>
        <Link href={`/pro/contacts${q}`} className="btn btn-dark btn-md">+ New hub</Link>
      </div>

      <div className="mt-6 space-y-2">
        {hubs.map((h) => (
          <Card key={h.id} className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal"><KeyRound size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{h.address}</p>
              <p className="text-xs text-gray-400">Updated {h.updated}</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={h.contact} size={30} />
              <span className="text-sm font-semibold text-gray-600">{h.contact}</span>
            </div>
            <Link href={`/hub${demo ? "?demo=1" : ""}`} className="btn btn-ghost btn-sm shrink-0">
              <ExternalLink size={14} /> Open
            </Link>
          </Card>
        ))}
        {hubs.length === 0 && (
          <Card className="p-10 text-center">
            <p className="font-bold">No hubs yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Invite a contact and their claimed home appears here — value tracked, branded to you, quietly building your next transaction.
            </p>
            <Link href={`/pro/contacts${q}`} className="btn btn-primary btn-md mt-4">Invite your first homeowner</Link>
          </Card>
        )}
      </div>
    </div>
  );
}
