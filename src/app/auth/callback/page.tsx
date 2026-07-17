"use client";
// Post-auth router: finishes a pending home claim, then sends the user
// to the right portal based on their role.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { DEMO_HUB } from "@/lib/demo";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      const supa = sb();
      // Give detectSessionInUrl a beat to parse tokens from the URL hash.
      for (let i = 0; i < 20; i++) {
        const { data: { session } } = await supa.auth.getSession();
        if (session) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { window.location.replace("/login"); return; }

      const user = session.user;
      const { data: profile } = await supa.from("ho_profiles").select("*").eq("id", user.id).maybeSingle();
      const role = profile?.role ?? (user.user_metadata?.role as string) ?? "homeowner";

      if (role === "professional") { window.location.replace("/pro"); return; }

      // Homeowner: does a hub already exist for them?
      const { data: memberships } = await supa
        .from("ho_hub_members").select("hub_id")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`);

      if (!memberships || memberships.length === 0) {
        setMsg("Building your hub…");
        let pending: { address1?: string; city?: string; region?: string; postal?: string; purchase_price?: string; purchase_date?: string } = {};
        try { pending = JSON.parse(localStorage.getItem("julyowner-pending-claim") || "{}"); } catch {}
        const address1 = pending.address1 || "My home";
        const price = pending.purchase_price ? Number(String(pending.purchase_price).replace(/[^0-9.]/g, "")) || null : null;
        const year = pending.purchase_date ? String(pending.purchase_date).slice(0, 4) : null;
        // Starter estimate until a real valuation source is connected:
        const est = price ? Math.round(price * 1.35) : DEMO_HUB.home_value;
        const { data: hub, error } = await supa.from("ho_hubs").insert({
          address1,
          city: pending.city || "Vancouver",
          region: pending.region || "BC",
          postal: pending.postal || null,
          full_address: [address1, pending.city || "Vancouver", pending.region || "BC", pending.postal].filter(Boolean).join(", "),
          purchase_price: price,
          purchase_date: year ? `${year}-06-15` : null,
          home_value: est,
          value_low: Math.round(est * 0.92),
          value_high: Math.round(est * 1.08),
        }).select().single();
        if (!error && hub) {
          await supa.from("ho_hub_members").insert({
            hub_id: hub.id, user_id: user.id, email: user.email,
            first_name: user.user_metadata?.first_name ?? null,
            last_name: user.user_metadata?.last_name ?? null,
            status: "joined", joined_at: new Date().toISOString(),
          });
          localStorage.removeItem("julyowner-pending-claim");
        }
      }
      window.location.replace("/hub");
    })();
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-sm font-semibold text-gray-500">{msg}</p>
    </main>
  );
}
