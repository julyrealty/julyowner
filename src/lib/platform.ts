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
