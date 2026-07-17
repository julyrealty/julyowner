"use client";
// Unified app store: demo mode (localStorage) or live mode (Supabase).
// Portal pages read/write through this one context so both modes behave identically.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sb } from "./supabase";
import {
  DEMO_HUB, DEMO_MORTGAGE, DEMO_PRO, DEMO_ADVISOR, DEMO_WHATS_NEXT, SELLER_TASKS,
  findCatalogItem, areaOf, uid,
} from "./demo";

export type Mortgage = {
  id: string; lender: string | null; loan_type: string | null; rate: number;
  amort_years: number; start_date: string; original_amount: number; balance: number; is_primary: boolean;
};
export type InventoryItem = {
  id: string; area: string; item_type: string; brand: string | null; model?: string | null;
  serial?: string | null; age_years: number | null; typical_life: string | null;
  failure_risk: number | null; photo_url?: string | null;
};
export type Task = {
  id: string; item_id?: string | null; title: string; frequency: string;
  due_date: string | null; minutes: number; difficulty: string; status: "pending" | "done" | "dismissed";
};
export type Doc = { id: string; folder: string; name: string; size_bytes: number; tags: string[]; created_at: string };
export type Hub = {
  id: string; address1: string; unit?: string | null; city: string | null; region: string | null; postal: string | null;
  full_address: string | null; purchase_price: number | null; purchase_date: string | null;
  home_value: number | null; value_low: number | null; value_high: number | null; value_updated: string | null;
  value_confidence?: "low" | "medium" | "high" | null;
  verification_status?: "unverified" | "flagged" | "verified"; dup_of?: string | null;
  journey?: "buying" | "owning" | "selling" | "sold";
  selling_started_at?: string | null; target_list_month?: string | null;
  listing_status?: "preparing" | "listed" | "offers" | "sold" | null;
};
export type Profile = {
  id: string; role: "homeowner" | "professional"; first_name: string | null; last_name: string | null;
  display_name?: string | null; email: string; phone?: string | null; company?: string | null;
  job_title?: string | null; photo_url?: string | null; logo_url?: string | null;
  brand_color?: string | null; org_name?: string | null; tier?: string;
};
export type Advisor = {
  id: string; first_name: string | null; last_name: string | null; advisor_type: string;
  email?: string | null; phone?: string | null; is_default?: boolean; company?: string | null;
};

type HubState = {
  loading: boolean;
  demo: boolean;
  session: boolean;
  profile: Profile | null;
  hub: Hub | null;
  mortgages: Mortgage[];
  inventory: InventoryItem[];
  tasks: Task[];
  docs: Doc[];
  pro: typeof DEMO_PRO | Profile | null;
  advisor: Advisor | null;
};

type HubActions = {
  addInventory: (itemType: string, opts: { brand?: string; age_years?: number; keepTasks: string[] }) => Promise<void>;
  removeInventory: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: Task["status"]) => Promise<void>;
  addTask: (t: { title: string; due_date?: string; minutes?: number; frequency?: string }) => Promise<void>;
  addDoc: (d: { folder: string; name: string; size_bytes: number; tags?: string[] }, file?: File) => Promise<void>;
  removeDoc: (id: string) => Promise<void>;
  docUrl: (id: string) => Promise<string | null>;
  updateMortgage: (m: Partial<Mortgage> & { id: string }) => Promise<void>;
  addMortgage: (m: Omit<Mortgage, "id" | "is_primary">) => Promise<void>;
  updateHub: (h: Partial<Hub>) => Promise<void>;
  refreshValue: () => Promise<void>;
  startSelling: (targetListMonth?: string) => Promise<void>;
  setListingStatus: (status: NonNullable<Hub["listing_status"]>) => Promise<void>;
  createLead: (kind: "sell" | "loan" | "service" | "general" | "valuation", message: string) => Promise<void>;
  logActivity: (action: string, detail?: string) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<(HubState & HubActions) | null>(null);

const LS_KEY = "julyowner-demo-v1";

function dueFrom(frequency: string, from = new Date()): string {
  const d = new Date(from);
  const f = frequency.toLowerCase();
  if (f.includes("2 month")) d.setMonth(d.getMonth() + 2);
  else if (f.includes("6 month")) d.setMonth(d.getMonth() + 6);
  else if (f.includes("annual")) d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 14); // "once" → suggested within 2 weeks
  return d.toISOString().slice(0, 10);
}

function riskFor(itemType: string, age: number | null): number {
  const cat = findCatalogItem(itemType);
  if (!cat || age == null) return 0;
  const [lo, hi] = cat.lifeYears;
  const mid = (lo + hi) / 2;
  return Math.max(0, Math.min(10, Math.round((age / mid) * 10 * 10) / 10));
}

function demoSeed(): Pick<HubState, "hub" | "mortgages" | "inventory" | "tasks" | "docs"> {
  const furnace: InventoryItem = {
    id: "inv-furnace", area: "Systems", item_type: "Heating", brand: "Carrier",
    age_years: 9, typical_life: "15–25 years", failure_risk: 4.5,
  };
  const wh: InventoryItem = {
    id: "inv-wh", area: "Utilities", item_type: "Water Heater", brand: "Rheem",
    age_years: 7, typical_life: "8–12 years", failure_risk: 7.0,
  };
  const invTasks: Task[] = [
    { id: "t1", item_id: "inv-furnace", title: "Change filters", frequency: "every 2 months", due_date: dueFrom("every 2 months"), minutes: 15, difficulty: "Basic", status: "pending" },
    { id: "t2", item_id: "inv-furnace", title: "Get a tune-up", frequency: "annually", due_date: dueFrom("annually"), minutes: 60, difficulty: "Basic", status: "pending" },
    { id: "t3", item_id: "inv-wh", title: "Check for leaks and rust", frequency: "every 6 months", due_date: dueFrom("every 6 months"), minutes: 10, difficulty: "Basic", status: "pending" },
  ];
  const baseTasks: Task[] = DEMO_WHATS_NEXT.map((w, i) => ({
    id: `w${i}`, title: w.title, frequency: w.frequency,
    due_date: dueFrom("once"), minutes: w.minutes, difficulty: "Basic", status: "pending",
  }));
  return {
    hub: { ...DEMO_HUB },
    mortgages: [{ ...DEMO_MORTGAGE }],
    inventory: [furnace, wh],
    tasks: [...baseTasks, ...invTasks],
    docs: [
      { id: "d1", folder: "Insurance", name: "home_insurance_policy_2026.pdf", size_bytes: 482133, tags: ["policy"], created_at: "2026-07-13" },
      { id: "d2", folder: "Warranty", name: "heat_pump_warranty.pdf", size_bytes: 221004, tags: [], created_at: "2026-05-02" },
      { id: "d3", folder: "Property Files", name: "sellers_disclosure_2016.pdf", size_bytes: 1204551, tags: ["purchase"], created_at: "2026-04-18" },
    ],
  };
}

export function HubProvider({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const [state, setState] = useState<HubState>({
    loading: true, demo, session: false, profile: null, hub: null,
    mortgages: [], inventory: [], tasks: [], docs: [], pro: null, advisor: null,
  });

  /* ---------- load ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (demo) {
        let saved: Partial<ReturnType<typeof demoSeed>> | null = null;
        try { saved = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch {}
        const seed = demoSeed();
        const data = saved && saved.hub ? { ...seed, ...saved } : seed;
        if (!alive) return;
        setState((s) => ({
          ...s, loading: false, demo: true, session: false,
          profile: { id: "demo-user", role: "homeowner", first_name: DEMO_HUB.owner_first, last_name: DEMO_HUB.owner_last, email: DEMO_HUB.owner_email },
          pro: DEMO_PRO, advisor: DEMO_ADVISOR as unknown as Advisor,
          ...data,
        }));
        return;
      }
      const supa = sb();
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { if (alive) setState((s) => ({ ...s, loading: false, session: false })); return; }
      const uidv = session.user.id;
      const [{ data: profile }, { data: memberships }] = await Promise.all([
        supa.from("ho_profiles").select("*").eq("id", uidv).maybeSingle(),
        supa.from("ho_hub_members").select("hub_id").or(`user_id.eq.${uidv},email.eq.${session.user.email}`),
      ]);
      const hubId = memberships?.[0]?.hub_id;
      let hub = null, mortgages: Mortgage[] = [], inventory: InventoryItem[] = [], tasks: Task[] = [], docs: Doc[] = [], pro = null, advisor = null;
      if (hubId) {
        const [h, m, inv, tk, dc] = await Promise.all([
          supa.from("ho_hubs").select("*").eq("id", hubId).maybeSingle(),
          supa.from("ho_mortgages").select("*").eq("hub_id", hubId).order("is_primary", { ascending: false }),
          supa.from("ho_inventory_items").select("*").eq("hub_id", hubId),
          supa.from("ho_tasks").select("*").eq("hub_id", hubId).order("due_date"),
          supa.from("ho_documents").select("*").eq("hub_id", hubId).order("created_at", { ascending: false }),
        ]);
        hub = h.data;
        mortgages = (m.data as Mortgage[]) || [];
        inventory = (inv.data as InventoryItem[]) || [];
        tasks = (tk.data as Task[]) || [];
        docs = (dc.data as Doc[]) || [];
        if (hub?.pro_id) {
          const { data: p } = await supa.from("ho_profiles").select("*").eq("id", hub.pro_id).maybeSingle();
          pro = p;
          const { data: adv } = await supa.from("ho_advisors").select("*").eq("pro_id", hub.pro_id).eq("is_default", true).maybeSingle();
          advisor = adv;
        }
      }
      if (!alive) return;
      setState({
        loading: false, demo: false, session: true,
        profile: profile as Profile, hub, mortgages, inventory, tasks, docs,
        pro: pro as Profile | null, advisor: advisor as Advisor | null,
      });
    })();
    return () => { alive = false; };
  }, [demo]);

  /* ---------- JULY Value: refresh a missing/stale estimate once per load (live only) ---------- */
  const valueRefreshed = React.useRef(false);
  useEffect(() => {
    if (state.loading || state.demo || !state.hub || valueRefreshed.current) return;
    const h = state.hub;
    const stale = !h.home_value || !h.value_updated ||
      Date.now() - new Date(h.value_updated).getTime() > 30 * 86400000;
    if (!stale) return;
    valueRefreshed.current = true;
    (async () => {
      try {
        const { data } = await sb().functions.invoke("ho-value", { body: { action: "refresh", hub_id: h.id } });
        if (data?.matched) {
          setState((s) => ({
            ...s,
            hub: s.hub ? {
              ...s.hub, home_value: data.home_value, value_low: data.value_low,
              value_high: data.value_high, value_updated: data.value_updated,
              value_confidence: data.value_confidence,
            } : s.hub,
          }));
        }
      } catch { /* keep whatever estimate we had */ }
    })();
  }, [state.loading, state.demo, state.hub]);

  /* ---------- persistence helpers ---------- */
  const persistDemo = useCallback((next: Partial<HubState>) => {
    setState((s) => {
      const merged = { ...s, ...next };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          hub: merged.hub, mortgages: merged.mortgages, inventory: merged.inventory,
          tasks: merged.tasks, docs: merged.docs,
        }));
      } catch {}
      return merged;
    });
  }, []);

  const actions: HubActions = useMemo(() => ({
    async addInventory(itemType, opts) {
      const cat = findCatalogItem(itemType);
      const item: InventoryItem = {
        id: uid(), area: areaOf(itemType), item_type: itemType,
        brand: opts.brand || null, age_years: opts.age_years ?? null,
        typical_life: cat ? `${cat.lifeYears[0]}–${cat.lifeYears[1]} years` : null,
        failure_risk: riskFor(itemType, opts.age_years ?? null),
      };
      const newTasks: Task[] = (cat?.tasks || [])
        .filter((tt) => opts.keepTasks.includes(tt.title))
        .map((tt) => ({
          id: uid(), item_id: item.id, title: tt.title, frequency: tt.frequency,
          due_date: dueFrom(tt.frequency), minutes: tt.minutes, difficulty: "Basic", status: "pending" as const,
        }));
      if (state.demo) {
        persistDemo({ inventory: [...state.inventory, item], tasks: [...state.tasks, ...newTasks] });
      } else if (state.hub) {
        const supa = sb();
        const { data: ins } = await supa.from("ho_inventory_items").insert({ ...item, id: undefined, hub_id: state.hub.id }).select().single();
        const dbTasks = newTasks.map((tk) => ({ ...tk, id: undefined, item_id: ins?.id, hub_id: state.hub!.id }));
        const { data: tins } = await supa.from("ho_tasks").insert(dbTasks).select();
        setState((s) => ({ ...s, inventory: [...s.inventory, (ins as InventoryItem) || item], tasks: [...s.tasks, ...((tins as Task[]) || newTasks)] }));
      }
    },
    async removeInventory(id) {
      if (state.demo) {
        persistDemo({ inventory: state.inventory.filter((i) => i.id !== id), tasks: state.tasks.filter((t) => t.item_id !== id) });
      } else {
        await sb().from("ho_inventory_items").delete().eq("id", id);
        setState((s) => ({ ...s, inventory: s.inventory.filter((i) => i.id !== id), tasks: s.tasks.filter((t) => t.item_id !== id) }));
      }
    },
    async setTaskStatus(id, status) {
      if (state.demo) {
        persistDemo({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)) });
      } else {
        await sb().from("ho_tasks").update({ status }).eq("id", id);
        setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
      }
    },
    async addTask(t) {
      const task: Task = { id: uid(), title: t.title, frequency: t.frequency || "once", due_date: t.due_date || dueFrom("once"), minutes: t.minutes || 30, difficulty: "Basic", status: "pending" };
      if (state.demo) persistDemo({ tasks: [...state.tasks, task] });
      else if (state.hub) {
        const { data } = await sb().from("ho_tasks").insert({ ...task, id: undefined, hub_id: state.hub.id }).select().single();
        setState((s) => ({ ...s, tasks: [...s.tasks, (data as Task) || task] }));
      }
    },
    async addDoc(d, file) {
      const doc: Doc = { id: uid(), folder: d.folder, name: d.name, size_bytes: d.size_bytes, tags: d.tags || [], created_at: new Date().toISOString() };
      if (state.demo) persistDemo({ docs: [doc, ...state.docs] });
      else if (state.hub) {
        let storage_path: string | null = null;
        if (file) {
          storage_path = `${state.hub.id}/${uid()}-${d.name.replace(/[^\w.\-]+/g, "_")}`;
          const { error: upErr } = await sb().storage.from("ho-docs").upload(storage_path, file, { upsert: false });
          if (upErr) storage_path = null;
        }
        const { data } = await sb().from("ho_documents").insert({ ...doc, id: undefined, created_at: undefined, hub_id: state.hub.id, storage_path }).select().single();
        setState((s) => ({ ...s, docs: [(data as Doc) || doc, ...s.docs] }));
      }
    },
    async removeDoc(id) {
      if (state.demo) { persistDemo({ docs: state.docs.filter((d) => d.id !== id) }); return; }
      const doc = state.docs.find((d) => d.id === id) as (Doc & { storage_path?: string | null }) | undefined;
      if (doc?.storage_path) await sb().storage.from("ho-docs").remove([doc.storage_path]);
      await sb().from("ho_documents").delete().eq("id", id);
      setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }));
    },
    async docUrl(id) {
      if (state.demo) return null;
      const doc = state.docs.find((d) => d.id === id) as (Doc & { storage_path?: string | null }) | undefined;
      if (!doc?.storage_path) return null;
      const { data } = await sb().storage.from("ho-docs").createSignedUrl(doc.storage_path, 300);
      return data?.signedUrl ?? null;
    },
    async updateMortgage(m) {
      if (state.demo) persistDemo({ mortgages: state.mortgages.map((x) => (x.id === m.id ? { ...x, ...m } : x)) });
      else {
        await sb().from("ho_mortgages").update({ ...m, id: undefined }).eq("id", m.id);
        setState((s) => ({ ...s, mortgages: s.mortgages.map((x) => (x.id === m.id ? { ...x, ...m } : x)) }));
      }
    },
    async addMortgage(m) {
      const mtg: Mortgage = { ...m, id: uid(), is_primary: state.mortgages.length === 0 };
      if (state.demo) persistDemo({ mortgages: [...state.mortgages, mtg] });
      else if (state.hub) {
        const { data } = await sb().from("ho_mortgages").insert({ ...mtg, id: undefined, hub_id: state.hub.id }).select().single();
        setState((s) => ({ ...s, mortgages: [...s.mortgages, (data as Mortgage) || mtg] }));
      }
    },
    async updateHub(h) {
      if (state.demo) persistDemo({ hub: state.hub ? { ...state.hub, ...h } : state.hub });
      else if (state.hub) {
        await sb().from("ho_hubs").update(h).eq("id", state.hub.id);
        setState((s) => ({ ...s, hub: s.hub ? { ...s.hub, ...h } : s.hub }));
      }
    },
    async refreshValue() {
      if (state.demo || !state.hub) return;
      try {
        const { data } = await sb().functions.invoke("ho-value", { body: { action: "refresh", hub_id: state.hub.id } });
        if (data?.matched) {
          setState((s) => ({
            ...s,
            hub: s.hub ? {
              ...s.hub, home_value: data.home_value, value_low: data.value_low,
              value_high: data.value_high, value_updated: data.value_updated,
              value_confidence: data.value_confidence,
            } : s.hub,
          }));
        }
      } catch { /* keep whatever estimate we had */ }
    },
    async startSelling(targetListMonth) {
      if (!state.hub || state.hub.journey === "selling") return;
      const patch: Partial<Hub> = {
        journey: "selling",
        selling_started_at: new Date().toISOString(),
        listing_status: "preparing",
        target_list_month: targetListMonth || null,
      };
      // Seed the Selling Roadmap, skipping titles the hub already has.
      const have = new Set(state.tasks.map((t) => t.title));
      const roadmap: Task[] = SELLER_TASKS.filter((t) => !have.has(t.title)).map((t, i) => ({
        id: uid(), title: t.title, frequency: "once",
        due_date: dueFrom("once", new Date(Date.now() + i * 4 * 86400000)),
        minutes: t.minutes, difficulty: "Basic", status: "pending" as const,
      }));
      if (state.demo) {
        persistDemo({ hub: { ...state.hub, ...patch }, tasks: [...state.tasks, ...roadmap] });
        return;
      }
      const supa = sb();
      await supa.from("ho_hubs").update(patch).eq("id", state.hub.id);
      const { data: tins } = await supa.from("ho_tasks")
        .insert(roadmap.map((t) => ({ ...t, id: undefined, hub_id: state.hub!.id })))
        .select();
      setState((s) => ({
        ...s,
        hub: s.hub ? { ...s.hub, ...patch } : s.hub,
        tasks: [...s.tasks, ...((tins as Task[]) || roadmap)],
      }));
      actions.logActivity("Started a selling plan", targetListMonth ? `Target list month ${targetListMonth}` : undefined);
      // High-intent signal for the sponsoring professional (fire-and-forget).
      void supa.functions.invoke("ho-emails", { body: { action: "selling_started", hub_id: state.hub.id } }).catch(() => {});
    },
    async setListingStatus(status) {
      if (!state.hub) return;
      const patch: Partial<Hub> = { journey: status === "sold" ? "sold" : "selling", listing_status: status };
      if (state.demo) { persistDemo({ hub: { ...state.hub, ...patch } }); return; }
      await sb().from("ho_hubs").update(patch).eq("id", state.hub.id);
      setState((s) => ({ ...s, hub: s.hub ? { ...s.hub, ...patch } : s.hub }));
      actions.logActivity("Updated listing status", status);
    },
    async createLead(kind, message) {
      if (!state.demo && state.hub) {
        await sb().from("ho_leads").insert({ hub_id: state.hub.id, pro_id: (state.hub as Hub & { pro_id?: string }).pro_id ?? null, kind, message, name: `${state.profile?.first_name ?? ""} ${state.profile?.last_name ?? ""}`.trim(), email: state.profile?.email });
        // Alert the sponsoring professional by email (fire-and-forget).
        void sb().functions.invoke("ho-emails", { body: { action: "lead", hub_id: state.hub.id, kind, message } }).catch(() => {});
      }
      actions.logActivity(kind === "sell" ? "Clicked Sell My Home" : kind === "loan" ? "Clicked Get a Loan" : "Requested service", message);
    },
    logActivity(action, detail) {
      if (!state.demo && state.hub) {
        void sb().from("ho_activities").insert({ hub_id: state.hub.id, member_email: state.profile?.email, action, detail });
      }
    },
    async signOut() { await sb().auth.signOut(); window.location.href = "/"; },
  }), [state, persistDemo]);

  return <Ctx.Provider value={{ ...state, ...actions }}>{children}</Ctx.Provider>;
}

export function useHub() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHub outside HubProvider");
  return v;
}

export function resetDemo() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}
