"use client";
// Listing alerts, stored in JULY Search (july-platform) via the ho-buyer bridge.
//
// The alerts themselves are RUN by JULY Search — the hub only creates and
// manages them. That matters: it means an alert made here is delivered by the
// same machinery as one made on search.july.ca, rather than being a promise the
// hub would have to keep on its own.
//
// CRITERIA KEYS: only keys JULY Search's alert runner is known to understand
// are written here. Guessing a key produces an alert that silently ignores that
// filter, which is worse than not offering it — the buyer would believe they
// were filtered when they were not.
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export type Alert = {
  id: string;
  name: string | null;
  scope: "search" | "area" | "building";
  criteria: Record<string, string>;
  alert_new: boolean;
  alert_sold: boolean;
  frequency: "instant" | "daily" | "weekly" | "off";
  last_run_at: string | null;
  created_at: string;
};

export const FREQUENCIES: { value: Alert["frequency"]; label: string }[] = [
  { value: "instant", label: "As it happens" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "off", label: "Paused" },
];

/** Human summary of what an alert actually watches. */
export function describeAlert(a: Alert): string {
  const c = a.criteria ?? {};
  const bits: string[] = [];
  if (c.city) bits.push(String(c.city));
  else if (c.prov) bits.push(String(c.prov));
  if (c.beds) bits.push(`${c.beds}+ bed`);
  if (c.baths) bits.push(`${c.baths}+ bath`);
  if (c.sqft) bits.push(`${c.sqft}+ sq ft`);
  if (c.feeMax) bits.push(`fees under $${c.feeMax}`);
  if (c.parking) bits.push(`${c.parking}+ parking`);
  return bits.length ? bits.join(" · ") : "Everything on this search";
}

export function useAlerts(hubId: string | undefined, enabled = true) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !hubId) { setAlerts([]); setLinked(false); return; }
    try {
      const { data } = await sb().functions.invoke("ho-buyer", {
        body: { action: "alerts_list", hub_id: hubId },
      });
      const d = data as { linked?: boolean; alerts?: Alert[] } | null;
      setLinked(!!d?.linked);
      setAlerts(Array.isArray(d?.alerts) ? d!.alerts : []);
    } catch {
      setLinked(false);
      setAlerts([]);
    }
  }, [hubId, enabled]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (input: {
    id?: string; name: string; criteria: Record<string, string>;
    scope?: Alert["scope"]; alert_new?: boolean; alert_sold?: boolean; frequency?: Alert["frequency"];
  }) => {
    // The demo hub has no JULY Search account behind it, so there is nothing
    // real to write to — say so rather than failing at the network.
    if (!enabled) return { ok: false, error: "demo" };
    if (!hubId) return { ok: false, error: "No hub" };
    setBusy(true);
    try {
      const { data, error } = await sb().functions.invoke("ho-buyer", {
        body: { action: "alert_save", hub_id: hubId, ...input },
      });
      if (error) throw error;
      const d = data as { linked?: boolean; saved?: boolean; error?: string } | null;
      if (!d?.linked) return { ok: false, error: "not_linked" };
      if (!d.saved) return { ok: false, error: d.error ?? "not_saved" };
      await load();
      return { ok: true };
    } catch {
      return { ok: false, error: "unavailable" };
    } finally {
      setBusy(false);
    }
  }, [hubId, load]);

  const remove = useCallback(async (id: string) => {
    if (!hubId) return;
    setBusy(true);
    try {
      await sb().functions.invoke("ho-buyer", { body: { action: "alert_delete", hub_id: hubId, id } });
      await load();
    } catch {
      // The list reloads either way; a failed delete simply stays visible.
    } finally {
      setBusy(false);
    }
  }, [hubId, load]);

  return { alerts, linked, busy, save, remove, reload: load };
}
