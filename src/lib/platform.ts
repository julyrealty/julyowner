// Read-only client for july-platform (JULY Search's DB): live market stats.
// The publishable key is public by design (same key search.july.ca ships to
// browsers); RLS decides what anon may read — today that's market_snapshots.

const PLATFORM_URL = "https://gdbdbytxvuucrbdvhgbh.supabase.co";
const PLATFORM_KEY = "sb_publishable_lCcyZucHkPfkJPbKSYbY0w_FxnCSDWV";

export type CityMarket = {
  snapshot_date: string;
  geo: string;
  property_class: string | null;
  active_count: number | null;
  new_count: number | null;
  sold_count: number | null;
  median_list_price: number | null;
  median_sold_price: number | null;
  median_dom: number | null;
  avg_ppsf: number | null;
};

export type SoldComp = {
  address: string; unit_number: string | null; city: string | null;
  sold_price: number | null; sold_date: string | null; list_price: number | null;
  days_on_market: number | null; property_type: string | null; bedrooms: number | null;
};

/** Recent solds for a city. Returns null while july-platform's sold_listings is
 *  empty or anon-blocked — callers keep their seeded fallback and this lights
 *  up automatically the day Han's sold-data import (+ anon read policy) lands. */
export async function fetchSoldComps(city: string, limit = 6): Promise<SoldComp[] | null> {
  if (!city?.trim()) return null;
  try {
    const url = `${PLATFORM_URL}/rest/v1/sold_listings` +
      `?select=address,unit_number,city,sold_price,sold_date,list_price,days_on_market,property_type,bedrooms` +
      `&city=eq.${encodeURIComponent(city.trim())}&sold_price=not.is.null` +
      `&order=sold_date.desc&limit=${limit}`;
    const res = await fetch(url, { headers: { apikey: PLATFORM_KEY } });
    if (!res.ok) return null;
    const rows = (await res.json()) as SoldComp[];
    return Array.isArray(rows) && rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

/** Latest market snapshot rows (one per property_class) for a city; null on any failure. */
export async function fetchCityMarket(city: string): Promise<CityMarket[] | null> {
  if (!city?.trim()) return null;
  try {
    const url = `${PLATFORM_URL}/rest/v1/market_snapshots` +
      `?select=snapshot_date,geo,property_class,active_count,new_count,sold_count,median_list_price,median_sold_price,median_dom,avg_ppsf` +
      `&geo_type=eq.city&geo=eq.${encodeURIComponent(city.trim())}` +
      `&order=snapshot_date.desc&limit=8`;
    const res = await fetch(url, { headers: { apikey: PLATFORM_KEY } });
    if (!res.ok) return null;
    const rows = (await res.json()) as CityMarket[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    // Keep only the most recent snapshot date.
    const latest = rows[0].snapshot_date;
    return rows.filter((r) => r.snapshot_date === latest);
  } catch {
    return null;
  }
}
