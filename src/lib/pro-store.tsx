"use client";
// Professional-portal store. Demo mode = seeded book of business (localStorage).
// Live mode = the signed-in professional's own rows in Supabase.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sb } from "./supabase";
import { DEMO_CONTACTS, DEMO_ACTIVITIES, DEMO_HUB, DEMO_PRO, DEMO_ADVISOR, PROVIDERS, uid } from "./demo";

export type ProContact = {
  id: string; first_name: string; last_name: string; email: string; phone?: string | null;
  tags: string[]; score: number; joined: number; pending: number; propensity?: number; addr?: string;
};
export type ProAdvisor = {
  id: string; first_name: string; last_name: string; advisor_type: string;
  email?: string | null; phone?: string | null; is_default: boolean; company?: string | null;
};
export type ProHubRow = {
  id: string; address: string; contact: string; updated: string;
  journey?: "buying" | "owning" | "selling" | "sold";
  selling_started_at?: string | null;
  listing_status?: "preparing" | "listed" | "offers" | "sold" | null;
};
export type ProActivity = { id: string; hub: string; member: string; action: string; detail: string | null; when: string };
export type ProState = {
  loading: boolean; demo: boolean; session: boolean;
  profile: typeof DEMO_PRO | null;
  contacts: ProContact[];
  advisors: ProAdvisor[];
  hubs: ProHubRow[];
  recommended: string[]; // provider ids
  activities: ProActivity[];
  shareLink: string;
  addContact: (c: { first_name: string; last_name: string; email: string }) => Promise<void>;
  inviteContact: (id: string) => Promise<string>; // returns invite link
  addAdvisor: (a: Omit<ProAdvisor, "id" | "is_default"> & { is_default?: boolean }) => Promise<void>;
  setDefaultAdvisor: (id: string) => Promise<void>;
  toggleRecommend: (providerId: string) => Promise<void>;
  updateProfile: (p: Record<string, string | null>) => Promise<void>;
};

const Ctx = createContext<ProState | null>(null);
const LS = "julyowner-pro-demo-v1";

export function ProProvider({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const [s, setS] = useState<Omit<ProState, "addContact" | "inviteContact" | "addAdvisor" | "setDefaultAdvisor" | "toggleRecommend" | "updateProfile">>({
    loading: true, demo, session: false, profile: null,
    contacts: [], advisors: [], hubs: [], recommended: [], activities: [], shareLink: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (demo) {
        let saved: { contacts?: ProContact[]; advisors?: ProAdvisor[]; recommended?: string[] } = {};
        try { saved = JSON.parse(localStorage.getItem(LS) || "{}"); } catch {}
        if (!alive) return;
        setS({
          loading: false, demo: true, session: false, profile: DEMO_PRO,
          contacts: saved.contacts ?? DEMO_CONTACTS.map((c) => ({ ...c })),
          advisors: saved.advisors ?? [{ ...DEMO_ADVISOR, is_default: true } as ProAdvisor],
          hubs: [
            // Dana clicked "Sell My Home" on Jul 10, then kicked off her selling plan — the live one.
            { id: "h1", address: DEMO_HUB.full_address, contact: "Dana Whitfield", updated: "2 hours ago", journey: "selling", listing_status: "preparing", selling_started_at: "2026-07-13T16:45:00Z" },
            { id: "h2", address: "1444 W 8th Ave #302, Vancouver, BC", contact: "Sam Okafor", updated: "2 days ago", journey: "owning" },
          ],
          recommended: saved.recommended ?? PROVIDERS.filter((p) => p.recommended).map((p) => p.id),
          activities: DEMO_ACTIVITIES as unknown as ProActivity[],
          shareLink: `${window.location.origin}/claim`,
        });
        return;
      }
      const supa = sb();
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { if (alive) setS((x) => ({ ...x, loading: false })); return; }
      const uidv = session.user.id;
      const [{ data: profile }, { data: contacts }, { data: advisors }, { data: hubs }, { data: recs }, { data: acts }, { data: leads }] = await Promise.all([
        supa.from("ho_profiles").select("*").eq("id", uidv).maybeSingle(),
        supa.from("ho_contacts").select("*").eq("pro_id", uidv).order("created_at", { ascending: false }),
        supa.from("ho_advisors").select("*").eq("pro_id", uidv),
        supa.from("ho_hubs").select("id,full_address,address1,created_at,journey,selling_started_at,listing_status,ho_hub_members(first_name,last_name)").eq("pro_id", uidv),
        supa.from("ho_recommendations").select("provider_id").eq("pro_id", uidv),
        supa.from("ho_activities").select("id,action,detail,member_email,created_at,ho_hubs!inner(address1,pro_id)").eq("ho_hubs.pro_id", uidv).order("created_at", { ascending: false }).limit(25),
        supa.from("ho_leads").select("*").eq("pro_id", uidv).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!alive) return;
      setS({
        loading: false, demo: false, session: true,
        profile: (profile as typeof DEMO_PRO) || null,
        contacts: ((contacts as unknown[]) || []).map((c) => {
          const cc = c as Record<string, unknown>;
          return { id: String(cc.id), first_name: String(cc.first_name ?? ""), last_name: String(cc.last_name ?? ""), email: String(cc.email), tags: (cc.tags as string[]) ?? [], score: Number(cc.score ?? 5), joined: 0, pending: 0 };
        }),
        advisors: (advisors as ProAdvisor[]) || [],
        hubs: ((hubs as unknown[]) || []).map((h) => {
          const hh = h as Record<string, unknown>;
          const m = ((hh.ho_hub_members as Record<string, unknown>[]) || [])[0];
          return {
            id: String(hh.id), address: String(hh.full_address ?? hh.address1),
            contact: m ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Invited" : "Unclaimed", updated: "recently",
            journey: (hh.journey as ProHubRow["journey"]) ?? "owning",
            selling_started_at: (hh.selling_started_at as string | null) ?? null,
            listing_status: (hh.listing_status as ProHubRow["listing_status"]) ?? null,
          };
        }),
        recommended: ((recs as { provider_id: string }[]) || []).map((r) => r.provider_id),
        activities: [
          ...(((leads as unknown[]) || []).map((l) => {
            const ll = l as Record<string, unknown>;
            return { id: `lead-${ll.id}`, hub: "Lead", member: String(ll.name || ll.email || "Homeowner"), action: ll.kind === "sell" ? "Clicked Sell My Home" : ll.kind === "loan" ? "Clicked Get a Loan" : "Requested service", detail: (ll.message as string) ?? null, when: String(ll.created_at) };
          })),
          ...(((acts as unknown[]) || []).map((a) => {
            const aa = a as Record<string, unknown>;
            const hub = aa.ho_hubs as Record<string, unknown> | null;
            return { id: String(aa.id), hub: String(hub?.address1 ?? ""), member: String(aa.member_email ?? "Member"), action: String(aa.action), detail: (aa.detail as string) ?? null, when: String(aa.created_at) };
          })),
        ].sort((x, y) => y.when.localeCompare(x.when)).slice(0, 25),
        shareLink: `${window.location.origin}/claim?pro=${uidv}`,
      });
    })();
    return () => { alive = false; };
  }, [demo]);

  const persist = (next: Partial<typeof s>) => setS((prev) => {
    const merged = { ...prev, ...next };
    if (merged.demo) {
      try { localStorage.setItem(LS, JSON.stringify({ contacts: merged.contacts, advisors: merged.advisors, recommended: merged.recommended })); } catch {}
    }
    return merged;
  });

  const api: ProState = useMemo(() => ({
    ...s,
    async addContact(c) {
      const row: ProContact = { id: uid(), ...c, tags: [], score: 5, joined: 0, pending: 0 };
      if (s.demo) persist({ contacts: [row, ...s.contacts] });
      else {
        const { data } = await sb().from("ho_contacts").insert({ ...c, pro_id: (await sb().auth.getUser()).data.user?.id }).select().single();
        persist({ contacts: [{ ...row, id: (data as { id?: string })?.id ?? row.id }, ...s.contacts] });
      }
    },
    async inviteContact(id) {
      const c = s.contacts.find((x) => x.id === id);
      persist({ contacts: s.contacts.map((x) => (x.id === id ? { ...x, pending: 1 } : x)) });
      if (!s.demo && c) {
        const user = (await sb().auth.getUser()).data.user;
        const { data } = await sb().from("ho_invites").insert({ pro_id: user?.id, contact_id: id, email: c.email, invite_type: "hub" }).select().single();
        const inv = data as { id?: string; token?: string } | null;
        if (inv?.id) {
          // Fire the branded invite email through the ho-emails edge function.
          void sb().functions.invoke("ho-emails", { body: { action: "invite", invite_id: inv.id } }).catch(() => {});
        }
        return `${window.location.origin}/claim?invite=${inv?.token ?? ""}`;
      }
      return `${window.location.origin}/claim`;
    },
    async addAdvisor(a) {
      const row: ProAdvisor = { id: uid(), is_default: a.is_default ?? s.advisors.length === 0, ...a };
      if (s.demo) persist({ advisors: [...s.advisors.map((x) => (row.is_default ? { ...x, is_default: false } : x)), row] });
      else {
        const user = (await sb().auth.getUser()).data.user;
        const { data } = await sb().from("ho_advisors").insert({ ...a, pro_id: user?.id, is_default: row.is_default }).select().single();
        persist({ advisors: [...s.advisors, (data as ProAdvisor) || row] });
      }
    },
    async setDefaultAdvisor(id) {
      persist({ advisors: s.advisors.map((a) => ({ ...a, is_default: a.id === id })) });
      if (!s.demo) {
        const user = (await sb().auth.getUser()).data.user;
        await sb().from("ho_advisors").update({ is_default: false }).eq("pro_id", user?.id);
        await sb().from("ho_advisors").update({ is_default: true }).eq("id", id);
      }
    },
    async toggleRecommend(pid) {
      const on = s.recommended.includes(pid);
      persist({ recommended: on ? s.recommended.filter((x) => x !== pid) : [...s.recommended, pid] });
      if (!s.demo) {
        const user = (await sb().auth.getUser()).data.user;
        if (on) await sb().from("ho_recommendations").delete().eq("pro_id", user?.id).eq("provider_id", pid);
        else await sb().from("ho_recommendations").insert({ pro_id: user?.id, provider_id: pid });
      }
    },
    async updateProfile(p) {
      persist({ profile: s.profile ? ({ ...s.profile, ...p } as typeof s.profile) : s.profile });
      if (!s.demo) {
        const user = (await sb().auth.getUser()).data.user;
        if (user) await sb().from("ho_profiles").update(p).eq("id", user.id);
      }
    },
  }), [s]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const usePro = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePro outside ProProvider");
  return v;
};
