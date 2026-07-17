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
export type ProHubRow = { id: string; address: string; contact: string; updated: string };
export type ProState = {
  loading: boolean; demo: boolean; session: boolean;
  profile: typeof DEMO_PRO | null;
  contacts: ProContact[];
  advisors: ProAdvisor[];
  hubs: ProHubRow[];
  recommended: string[]; // provider ids
  activities: typeof DEMO_ACTIVITIES;
  addContact: (c: { first_name: string; last_name: string; email: string }) => Promise<void>;
  inviteContact: (id: string) => Promise<string>; // returns invite link
  addAdvisor: (a: Omit<ProAdvisor, "id" | "is_default"> & { is_default?: boolean }) => Promise<void>;
  setDefaultAdvisor: (id: string) => Promise<void>;
  toggleRecommend: (providerId: string) => Promise<void>;
};

const Ctx = createContext<ProState | null>(null);
const LS = "julyowner-pro-demo-v1";

export function ProProvider({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const [s, setS] = useState<Omit<ProState, "addContact" | "inviteContact" | "addAdvisor" | "setDefaultAdvisor" | "toggleRecommend">>({
    loading: true, demo, session: false, profile: null,
    contacts: [], advisors: [], hubs: [], recommended: [], activities: [],
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
            { id: "h1", address: DEMO_HUB.full_address, contact: "Dana Whitfield", updated: "2 hours ago" },
            { id: "h2", address: "1444 W 8th Ave #302, Vancouver, BC", contact: "Sam Okafor", updated: "2 days ago" },
          ],
          recommended: saved.recommended ?? PROVIDERS.filter((p) => p.recommended).map((p) => p.id),
          activities: DEMO_ACTIVITIES,
        });
        return;
      }
      const supa = sb();
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { if (alive) setS((x) => ({ ...x, loading: false })); return; }
      const uidv = session.user.id;
      const [{ data: profile }, { data: contacts }, { data: advisors }, { data: hubs }, { data: recs }] = await Promise.all([
        supa.from("ho_profiles").select("*").eq("id", uidv).maybeSingle(),
        supa.from("ho_contacts").select("*").eq("pro_id", uidv).order("created_at", { ascending: false }),
        supa.from("ho_advisors").select("*").eq("pro_id", uidv),
        supa.from("ho_hubs").select("id,full_address,address1,created_at,ho_hub_members(first_name,last_name)").eq("pro_id", uidv),
        supa.from("ho_recommendations").select("provider_id").eq("pro_id", uidv),
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
          return { id: String(hh.id), address: String(hh.full_address ?? hh.address1), contact: m ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Invited" : "Unclaimed", updated: "recently" };
        }),
        recommended: ((recs as { provider_id: string }[]) || []).map((r) => r.provider_id),
        activities: [],
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
        const token = (data as { token?: string })?.token ?? "";
        return `${window.location.origin}/claim?invite=${token}`;
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
  }), [s]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const usePro = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePro outside ProProvider");
  return v;
};
