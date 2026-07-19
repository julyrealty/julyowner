"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePro, type ProActivity, type ProHubRow } from "@/lib/pro-store";
import { Card, Avatar } from "@/components/ui";
import { relTime } from "@/lib/calc";
import { sb } from "@/lib/supabase";
import { DEMO_MESSAGES } from "@/lib/demo";
import { KeyRound, ExternalLink, ChevronDown, Send } from "lucide-react";

const LISTING_LABEL: Record<string, string> = {
  preparing: "Preparing to list",
  listed: "Live on market",
  offers: "Reviewing offers",
  sold: "Sold",
};

/* ---- Unified CRM timeline ---- */

type HubEvent = {
  id: string;
  kind: "lead" | "activity" | "sell" | "buy";
  title: string;
  detail: string | null;
  when: string; // ISO — sorted newest-first
};

const DOT: Record<HubEvent["kind"], string> = {
  lead: "bg-coral",
  activity: "bg-gray-300",
  sell: "bg-coral",
  buy: "bg-teal",
};

/** Lead rows come in as `lead-*` ids (live) or lead-shaped actions (demo feed). */
const isLead = (a: ProActivity) => a.id.startsWith("lead-") || /^(clicked|requested)/i.test(a.action);

/**
 * The feed has no hub_id — rows carry a short address in `hub` (address1 in live
 * mode, street line in demo). Match by address prefix; live lead rows carry the
 * placeholder "Lead" instead of an address, so those fall back to the contact name.
 */
function belongsTo(a: ProActivity, h: ProHubRow): boolean {
  const addr = (a.hub || "").trim().toLowerCase();
  const full = (h.address || "").trim().toLowerCase();
  if (addr && addr !== "lead") return full.startsWith(addr) || addr.startsWith(full);
  const who = (a.member || "").trim().toLowerCase();
  return !!who && who === (h.contact || "").trim().toLowerCase();
}

/** Another agent is adding `mortgages` to hub rows — read it without depending on it. */
function mortgageCount(h: ProHubRow): number {
  const m = (h as ProHubRow & { mortgages?: unknown }).mortgages;
  return Array.isArray(m) ? m.length : 0;
}

function buildEvents(h: ProHubRow, activities: ProActivity[]): HubEvent[] {
  const out: HubEvent[] = activities.filter((a) => belongsTo(a, h)).map((a) => ({
    id: a.id,
    kind: isLead(a) ? "lead" : "activity",
    title: a.action,
    detail:
      [a.member && a.member !== h.contact ? a.member : null, a.detail].filter(Boolean).join(" · ") || null,
    when: a.when,
  }));
  if (h.selling_started_at)
    out.push({ id: `${h.id}-ms-sell`, kind: "sell", title: "Started a selling plan", detail: "Selling Roadmap opened in their hub", when: h.selling_started_at });
  if (h.buying_started_at)
    out.push({ id: `${h.id}-ms-buy`, kind: "buy", title: "Started a buying plan", detail: "Buying HQ activated", when: h.buying_started_at });
  return out.sort((a, b) => b.when.localeCompare(a.when));
}

type ThreadMsg = { id: string; sender_role: string; sender_name: string | null; body: string; created_at: string };

/** Direct thread with the homeowner — loads on expand; replies insert as the signed-in pro. */
function HubMessages({ hubId, demo, proName }: { hubId: string; demo: boolean; proName: string }) {
  const [msgs, setMsgs] = useState<ThreadMsg[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    if (demo) {
      setMsgs(hubId === "h1" ? DEMO_MESSAGES.map((m) => ({ ...m })) : []);
      return;
    }
    (async () => {
      const { data } = await sb().from("ho_messages")
        .select("id,sender_role,sender_name,body,created_at")
        .eq("hub_id", hubId).order("created_at").limit(50);
      if (alive) setMsgs((data as ThreadMsg[]) ?? []);
    })();
    return () => { alive = false; };
  }, [hubId, demo]);

  async function reply() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const msg: ThreadMsg = { id: `local-${Date.now()}`, sender_role: "professional", sender_name: proName, body: text.slice(0, 2000), created_at: new Date().toISOString() };
      if (!demo) {
        const { data: { user } } = await sb().auth.getUser();
        const { data } = await sb().from("ho_messages")
          .insert({ hub_id: hubId, sender_id: user?.id, sender_role: "professional", sender_name: proName, body: msg.body })
          .select("id,sender_role,sender_name,body,created_at").single();
        setMsgs((m) => [...(m ?? []), (data as ThreadMsg) || msg]);
      } else {
        setMsgs((m) => [...(m ?? []), msg]);
      }
      setDraft("");
    } finally { setSending(false); }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="section-label mb-2">Messages</p>
      {msgs === null ? (
        <p className="py-1 text-xs text-gray-400">Loading…</p>
      ) : msgs.length === 0 ? (
        <p className="py-1 text-xs text-gray-400">No messages yet — say hello and it lands in their hub.</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {msgs.slice(-8).map((m) => (
            <li key={m.id} className="flex min-w-0 items-baseline gap-2 text-[13px]">
              <span className={`shrink-0 font-bold ${m.sender_role === "professional" ? "text-teal-deep" : "text-navy"}`}>
                {m.sender_role === "professional" ? "You" : (m.sender_name?.split(" ")[0] ?? "Owner")}
              </span>
              <span className="min-w-0 flex-1 truncate text-gray-600">{m.body}</span>
              <span className="shrink-0 text-[10px] font-semibold text-gray-400">{relTime(m.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input className="input h-9 flex-1 text-sm" placeholder="Reply — appears in their hub instantly"
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") reply(); }} />
        <button className="btn btn-primary btn-sm shrink-0" disabled={!draft.trim() || sending} onClick={reply} aria-label="Send reply">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function TimelinePanel({ hub, events, id, demo, proName }: { hub: ProHubRow; events: HubEvent[]; id: string; demo: boolean; proName: string }) {
  const mtg = mortgageCount(hub);
  return (
    <div id={id} className="border-t border-line bg-gray-50/60 px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="section-label">Relationship timeline</span>
        {hub.journey === "selling" && hub.listing_status && (
          <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-extrabold text-coral">
            {LISTING_LABEL[hub.listing_status]}
          </span>
        )}
        {mtg > 0 && (
          <span className="text-[11px] font-semibold text-gray-400">
            {mtg} mortgage{mtg > 1 ? "s" : ""} on file
          </span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="py-2 text-sm text-gray-500">No activity yet — invite them to explore their hub.</p>
      ) : (
        <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
          {events.map((ev) => (
            <li key={ev.id} className="flex min-w-0 items-start gap-2.5">
              <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${DOT[ev.kind]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-5">{ev.title}</p>
                {ev.detail && <p className="truncate text-xs text-gray-500">{ev.detail}</p>}
              </div>
              <span className="shrink-0 whitespace-nowrap pt-px text-[11px] font-semibold text-gray-400">
                {relTime(ev.when)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <HubMessages hubId={hub.id} demo={demo} proName={proName} />
    </div>
  );
}

export default function ProHubs() {
  const { hubs, activities, demo, profile } = usePro();
  const proName = `${(profile as { first_name?: string | null })?.first_name ?? "Your"} ${(profile as { last_name?: string | null })?.last_name ?? "advisor"}`.trim();
  const q = demo ? "?demo=1" : "";
  // Arriving from a dashboard activity row (?hub=…) opens that timeline straight away.
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("hub"));

  // Live sellers first, sold second, active buyers third — agents scan top-down.
  const rank = (h: { journey?: string; buying_started_at?: string | null }) =>
    h.journey === "selling" ? 0 : h.journey === "sold" ? 1 : h.buying_started_at || h.journey === "buying" ? 2 : 3;
  const sorted = [...hubs].sort((a, b) => rank(a) - rank(b));

  const eventsByHub = useMemo(() => {
    const m = new Map<string, HubEvent[]>();
    for (const h of hubs) m.set(h.id, buildEvents(h, activities));
    return m;
  }, [hubs, activities]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Hubs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {demo
              ? "Every property you sponsor — open any hub to see exactly what your client sees."
              : "Every property you sponsor — tap a hub for its full timeline and messages."}
          </p>
        </div>
        <Link href={`/pro/contacts${q}`} className="btn btn-dark btn-md">+ New hub</Link>
      </div>

      <div className="mt-6 space-y-2">
        {sorted.map((h) => {
          const events = eventsByHub.get(h.id) ?? [];
          const open = openId === h.id;
          const panelId = `hub-timeline-${h.id}`;
          return (
            <Card key={h.id} className="overflow-hidden p-0">
              <div
                className="flex cursor-pointer items-center gap-3 p-4"
                onClick={() => setOpenId(open ? null : h.id)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal"><KeyRound size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-bold">{h.address}</p>
                    {h.journey === "selling" && (
                      <span className="shrink-0 rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-extrabold text-coral">Selling</span>
                    )}
                    {h.journey === "sold" && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700">Sold</span>
                    )}
                    {h.journey !== "selling" && h.journey !== "sold" && (h.buying_started_at || h.journey === "buying") && (
                      <span className="shrink-0 rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-extrabold text-teal-deep">Buying</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">
                    {h.journey === "selling" && h.listing_status ? `${LISTING_LABEL[h.listing_status]} · ` : ""}
                    Updated {h.updated}
                    {events.length > 0 ? ` · ${events.length} event${events.length === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <Avatar name={h.contact} size={30} />
                  <span className="text-sm font-semibold text-gray-600">{h.contact}</span>
                </div>
                {/* Live pros aren't hub members (RLS keeps the client's hub theirs) —
                    the demo hub is the only one "Open" can actually show. */}
                {demo && (
                  <Link
                    href="/hub?demo=1"
                    className="btn btn-ghost btn-sm shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} /> Open
                  </Link>
                )}
                <button
                  aria-expanded={open}
                  aria-controls={panelId}
                  aria-label={`${open ? "Hide" : "Show"} timeline for ${h.address}`}
                  onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : h.id); }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </div>
              {open && <TimelinePanel hub={h} events={events} id={panelId} demo={demo} proName={proName} />}
            </Card>
          );
        })}
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
