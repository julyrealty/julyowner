"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHub } from "@/lib/store";

const SUBNAV = [
  { href: "/hub/home", label: "Overview" },
  { href: "/hub/home/inventory", label: "Inventory" },
  { href: "/hub/home/timeline", label: "Timeline" },
  { href: "/hub/home/documents", label: "Documents" },
];

export function HomeSubnav({ current }: { current: string }) {
  const params = useSearchParams();
  const { hub } = useHub();
  const q = params.get("demo") === "1" ? "?demo=1" : "";
  // Search HQs have no home to inventory — Documents stands alone for pure buyers.
  const tabs = hub?.journey === "buying" ? SUBNAV.filter((s) => s.href === "/hub/home/documents") : SUBNAV;
  return (
    <div className="border-b border-line bg-white">
      <div className="container-x no-bar flex gap-6 overflow-x-auto text-sm font-semibold">
        {tabs.map((s) => (
          <Link key={s.href} href={`${s.href}${q}`}
            className={`whitespace-nowrap border-b-2 py-3 ${current === s.href ? "border-teal text-ink" : "border-transparent text-gray-500 hover:text-ink"}`}>
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
