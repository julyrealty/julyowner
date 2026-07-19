// Seed catalog + demo dataset (Vancouver, BC — JULY Realty's home market).
// All figures are illustrative estimates for the demo hub.

export type TaskTemplate = { title: string; frequency: string; minutes: number };
export type CatalogItem = { type: string; lifeYears: [number, number]; tasks: TaskTemplate[] };
export type CatalogArea = { area: string; items: CatalogItem[] };

const t = (title: string, frequency: string, minutes: number): TaskTemplate => ({ title, frequency, minutes });

export const INVENTORY_CATALOG: CatalogArea[] = [
  {
    area: "Systems",
    items: [
      { type: "Heating", lifeYears: [15, 25], tasks: [t("Get to know the equipment", "once", 15), t("Review your heating bill", "once", 15), t("Change filters", "every 2 months", 15), t("Check registers and grilles", "annually", 20), t("Get a tune-up", "annually", 60)] },
      { type: "Cooling / Heat Pump", lifeYears: [12, 20], tasks: [t("Clean or replace filters", "every 2 months", 15), t("Clear debris around outdoor unit", "every 6 months", 20), t("Book a professional service", "annually", 60)] },
      { type: "Electrical Panel", lifeYears: [25, 40], tasks: [t("Label your breakers", "once", 30), t("Test GFCI outlets", "every 6 months", 10)] },
      { type: "Plumbing", lifeYears: [20, 50], tasks: [t("Locate your main shut-off valve", "once", 10), t("Check under-sink connections", "every 6 months", 15)] },
      { type: "Ventilation", lifeYears: [10, 20], tasks: [t("Clean bathroom fan covers", "every 6 months", 20)] },
      { type: "Smoke Detectors", lifeYears: [8, 10], tasks: [t("Test all alarms", "every 6 months", 10), t("Replace batteries", "annually", 15)] },
      { type: "CO Detectors", lifeYears: [5, 7], tasks: [t("Test all alarms", "every 6 months", 10)] },
      { type: "Fireplace", lifeYears: [15, 30], tasks: [t("Book a chimney sweep / inspection", "annually", 90)] },
    ],
  },
  {
    area: "Utilities",
    items: [
      { type: "Washer", lifeYears: [10, 14], tasks: [t("Clean the drum and gasket", "every 2 months", 15), t("Check hoses for wear", "annually", 10)] },
      { type: "Dryer", lifeYears: [10, 14], tasks: [t("Clear the lint vent duct", "every 6 months", 30)] },
      { type: "Water Heater", lifeYears: [8, 12], tasks: [t("Check for leaks and rust", "every 6 months", 10), t("Flush the tank", "annually", 60)] },
      { type: "Water Filter", lifeYears: [3, 10], tasks: [t("Replace filter cartridge", "every 6 months", 15)] },
    ],
  },
  {
    area: "Kitchen",
    items: [
      { type: "Refrigerator", lifeYears: [10, 15], tasks: [t("Vacuum the coils", "every 6 months", 20), t("Replace water filter", "every 6 months", 10)] },
      { type: "Dishwasher", lifeYears: [9, 12], tasks: [t("Clean the filter", "every 2 months", 10)] },
      { type: "Range", lifeYears: [13, 17], tasks: [t("Deep-clean burners / elements", "every 6 months", 30)] },
      { type: "Range Hood", lifeYears: [10, 14], tasks: [t("Degrease the filter", "every 2 months", 15)] },
    ],
  },
  {
    area: "Bathrooms",
    items: [
      { type: "Toilet", lifeYears: [20, 40], tasks: [t("Check for silent leaks", "annually", 10)] },
      { type: "Faucet & Sink", lifeYears: [12, 20], tasks: [t("Re-seal around the sink", "annually", 30)] },
      { type: "Countertops", lifeYears: [15, 30], tasks: [t("Re-seal stone surfaces", "annually", 30)] },
      { type: "Showerhead", lifeYears: [6, 10], tasks: [t("Descale the head", "every 6 months", 15)] },
    ],
  },
  {
    area: "Flooring",
    items: [
      { type: "Hardwood Flooring", lifeYears: [30, 80], tasks: [t("Refresh protective finish", "annually", 120)] },
      { type: "Carpet Flooring", lifeYears: [8, 12], tasks: [t("Book a deep clean", "annually", 90)] },
      { type: "Tile Flooring", lifeYears: [20, 50], tasks: [t("Re-seal grout lines", "annually", 60)] },
      { type: "Natural Stone Flooring", lifeYears: [30, 80], tasks: [t("Re-seal stone", "annually", 60)] },
    ],
  },
  {
    area: "Exterior",
    items: [
      { type: "Roof", lifeYears: [18, 30], tasks: [t("Visual check after storms", "every 6 months", 15), t("Professional inspection", "annually", 60)] },
      { type: "Gutters", lifeYears: [15, 25], tasks: [t("Clear gutters and downspouts", "every 6 months", 60)] },
      { type: "Foundation", lifeYears: [50, 100], tasks: [t("Walk the perimeter for cracks", "annually", 20)] },
      { type: "Windows", lifeYears: [20, 30], tasks: [t("Check seals and caulking", "annually", 30)] },
    ],
  },
  {
    area: "Outdoors",
    items: [
      { type: "Driveway", lifeYears: [20, 30], tasks: [t("Re-seal surface", "annually", 90)] },
      { type: "Walkways", lifeYears: [20, 40], tasks: [t("Check for trip hazards", "annually", 15)] },
      { type: "Deck", lifeYears: [15, 25], tasks: [t("Re-stain or seal", "annually", 180), t("Check railings and boards", "every 6 months", 20)] },
      { type: "Fence", lifeYears: [12, 20], tasks: [t("Inspect posts and panels", "annually", 20)] },
    ],
  },
];

export const findCatalogItem = (type: string): CatalogItem | undefined =>
  INVENTORY_CATALOG.flatMap((a) => a.items).find((i) => i.type === type);

export const areaOf = (type: string): string =>
  INVENTORY_CATALOG.find((a) => a.items.some((i) => i.type === type))?.area ?? "Systems";

/* ------------------------------------------------------------------ */

export type Improvement = {
  slug: string; title: string; costLow: number; costHigh: number;
  valueAdd: number; pctAdd: number; blurb: string; recommended?: boolean; tag: string;
};

export const IMPROVEMENTS: Improvement[] = [
  { slug: "laneway-home", title: "Build a laneway home", costLow: 320000, costHigh: 460000, valueAdd: 520000, pctAdd: 27.9, tag: "Income", recommended: true, blurb: "Vancouver lots zoned for laneway homes can add a mortgage-helper suite that generates $2,800–$3,600/mo in rent while adding significant resale value." },
  { slug: "basement-suite", title: "Legalize a basement suite", costLow: 90000, costHigh: 160000, valueAdd: 210000, pctAdd: 11.3, tag: "Income", recommended: true, blurb: "A self-contained legal suite is the classic Vancouver mortgage helper — steady rental income plus a broader buyer pool when you sell." },
  { slug: "kitchen-remodel", title: "Remodel kitchen to premium grade", costLow: 58000, costHigh: 96000, valueAdd: 88000, pctAdd: 4.7, tag: "Lifestyle", blurb: "An upgraded kitchen is the focal point of a home and one of the strongest selling features when it hits the market." },
  { slug: "bathroom-reno", title: "Renovate primary bathroom", costLow: 24000, costHigh: 42000, valueAdd: 38000, pctAdd: 2.0, tag: "Lifestyle", blurb: "Bathrooms are the second thing buyers check. Modern fixtures and tile bring outsized first-impression value." },
  { slug: "heat-pump", title: "Convert to a heat pump", costLow: 14000, costHigh: 24000, valueAdd: 22000, pctAdd: 1.2, tag: "Efficiency", recommended: true, blurb: "CleanBC rebates can cover a meaningful share of the cost, and buyers increasingly expect efficient heating and cooling." },
  { slug: "windows", title: "Replace windows (whole home)", costLow: 28000, costHigh: 48000, valueAdd: 34000, pctAdd: 1.8, tag: "Efficiency", blurb: "New double- or triple-pane windows cut energy loss and street noise — a quiet upgrade buyers notice immediately." },
  { slug: "exterior-paint", title: "Repaint the exterior", costLow: 9000, costHigh: 18000, valueAdd: 21000, pctAdd: 1.1, tag: "Curb appeal", blurb: "The highest-leverage cosmetic project: fresh exterior paint routinely returns more than it costs at listing time." },
  { slug: "landscaping", title: "Refresh front landscaping", costLow: 6000, costHigh: 15000, valueAdd: 14000, pctAdd: 0.8, tag: "Curb appeal", blurb: "First impressions are formed at the curb. Clean beds, lighting, and a defined path lift perceived value." },
  { slug: "ev-charger", title: "Install an EV charger", costLow: 2200, costHigh: 4500, valueAdd: 6000, pctAdd: 0.3, tag: "Efficiency", blurb: "A Level-2 charger is a small project that signals a modern, move-in-ready home." },
];

/* ------------------------------------------------------------------ */

/* Guides live in their own module (they carry full bodies); re-exported here
   so every existing `from "@/lib/demo"` import keeps working. */
export { ARTICLES, guideBySlug } from "./guides";
export type { Article, GuideBlock } from "./guides";

/* ------------------------------------------------------------------ */

export type Provider = {
  id: string; name: string; category: string; phone: string; city: string;
  blurb: string; verified: boolean; recommended?: boolean;
};

export const PROVIDERS: Provider[] = [
  { id: "p1", name: "Kits Bay Plumbing Co.", category: "Plumbers", phone: "(604) 555-0114", city: "Vancouver", verified: true, recommended: true, blurb: "Licensed residential plumbing across the West Side since 2009 — repairs, repipes, and hot-water tanks with same-week scheduling." },
  { id: "p2", name: "Point Grey Electric", category: "Electricians", phone: "(604) 555-0132", city: "Vancouver", verified: true, recommended: true, blurb: "Red Seal electricians for panel upgrades, EV chargers, and knob-and-tube replacement in character homes." },
  { id: "p3", name: "Pacific Ridge Roofing", category: "Roofers", phone: "(604) 555-0177", city: "Burnaby", verified: true, recommended: true, blurb: "Cedar, asphalt, and torch-on specialists. Free drone roof assessments and 10-year workmanship warranty." },
  { id: "p4", name: "Evergreen Lawn & Garden", category: "Gardeners & Lawn Care", phone: "(604) 555-0121", city: "Vancouver", verified: true, blurb: "Year-round garden maintenance, hedge work, and seasonal cleanups for West Side homes." },
  { id: "p5", name: "False Creek HVAC", category: "Heating & Cooling", phone: "(604) 555-0165", city: "Vancouver", verified: true, recommended: true, blurb: "Heat pump conversions and furnace service. CleanBC program registered contractor." },
  { id: "p6", name: "Arbutus Home Cleaning", category: "House Cleaners", phone: "(604) 555-0142", city: "Vancouver", verified: true, blurb: "Recurring and deep cleans, bonded and insured teams, eco product options." },
  { id: "p7", name: "Granville Handyman Works", category: "Handyman", phone: "(604) 555-0190", city: "Vancouver", verified: true, blurb: "Small repairs done right: drywall, doors, caulking, fixtures — hourly and half-day rates." },
  { id: "p8", name: "North Shore Gutter Pros", category: "Gutters", phone: "(604) 555-0158", city: "North Vancouver", verified: true, blurb: "Gutter cleaning, guards, and replacement. Fall and spring route plans." },
  { id: "p9", name: "Cambie Painting Collective", category: "Painters", phone: "(604) 555-0129", city: "Vancouver", verified: true, blurb: "Interior and exterior repaints with detailed prep and 3-year touch-up guarantee." },
  { id: "p10", name: "Seawall Moving & Storage", category: "Movers", phone: "(604) 555-0183", city: "Vancouver", verified: true, blurb: "Local moves, piano crews, and short-term storage. Flat-rate quotes." },
  { id: "p11", name: "TrueNorth Home Inspections", category: "Home Inspectors", phone: "(604) 555-0170", city: "Vancouver", verified: true, blurb: "Licensed inspectors for pre-sale and maintenance inspections with same-day reports." },
  { id: "p12", name: "West Side Lock & Door", category: "Locksmiths", phone: "(604) 555-0136", city: "Vancouver", verified: true, blurb: "Rekeying, smart locks, and door hardware. 24/7 lockout line." },
];

export const PROVIDER_CATEGORIES = [
  "Plumbers", "Electricians", "Heating & Cooling", "Roofers", "Handyman",
  "House Cleaners", "Gardeners & Lawn Care", "Gutters", "Painters",
  "Movers", "Home Inspectors", "Locksmiths",
];

/* ------------------------------------------------------------------ */

export const MARKET = {
  area: "Arbutus Ridge",
  cityLine: "Vancouver West (V6L)",
  daysOnMarket: 21,
  listToSale: 0.986,
  rates: [
    { label: "5-yr fixed", rate: 4.39 },
    { label: "3-yr fixed", rate: 4.19 },
    { label: "1-yr fixed", rate: 4.89 },
    { label: "5-yr variable", rate: 4.95 },
  ],
  rateHistory: [5.34, 5.29, 5.31, 5.18, 5.02, 4.96, 4.88, 4.91, 4.79, 4.66, 4.71, 4.58, 4.49, 4.52, 4.44, 4.39],
  recentSales: [
    { price: 2150000, address: "2856 W 21st Ave", date: "2026-06-28" },
    { price: 1893000, address: "3175 W 19th Ave", date: "2026-06-12" },
    { price: 2410000, address: "2596 W 23rd Ave", date: "2026-05-30" },
    { price: 1725000, address: "3322 W 24th Ave", date: "2026-05-17" },
    { price: 2038000, address: "2711 W 18th Ave", date: "2026-04-25" },
  ],
  nearby: [
    { label: "2704 W 21st Ave", value: 1912000 },
    { label: "2732 W 21st Ave", value: 1848000 },
    { label: "2698 W 22nd Ave", value: 2064000 },
  ],
};

export const REFI_PRODUCTS = [
  { label: "1-Year Fixed", rate: 4.89, amortYears: 25 },
  { label: "3-Year Fixed", rate: 4.19, amortYears: 25 },
  { label: "5-Year Fixed", rate: 4.39, amortYears: 25 },
  { label: "5-Year Variable", rate: 4.95, amortYears: 25 },
  { label: "10-Year Fixed", rate: 5.24, amortYears: 25 },
  { label: "HELOC", rate: 5.45, amortYears: 25 },
];

/* ------------------------------------------------------------------ */
/* Demo dataset — one fully-loaded hub + a pro book of business.       */

export const DEMO_PRO = {
  id: "demo-pro",
  first_name: "Jordan",
  last_name: "Lee",
  display_name: "Jordan Lee",
  email: "jordan.lee@julyrealty.com",
  phone: "(604) 555-0100",
  company: "JULY Realty",
  job_title: "Real Estate Advisor",
  role_title: "Real Estate Agent",
  org_name: "JULYOwner — Vancouver",
  brand_color: "#0e7c7b",
  tier: "professional",
};

export const DEMO_ADVISOR = {
  id: "demo-adv",
  first_name: "Maya",
  last_name: "Grewal",
  advisor_type: "Mortgage Broker",
  email: "maya@northgatelending.ca",
  phone: "(604) 555-0148",
  company: "Northgate Lending",
  is_default: true,
};

export const DEMO_HUB = {
  id: "demo-hub",
  address1: "2718 W 21st Ave",
  city: "Vancouver",
  region: "BC",
  postal: "V6L 1K3",
  full_address: "2718 W 21st Ave, Vancouver, BC V6L 1K3",
  purchase_price: 1180000,
  purchase_date: "2016-06-17",
  home_value: 1865000,
  value_low: 1721000,
  value_high: 2009000,
  value_updated: "2026-07-02",
  value_confidence: "high" as const,
  owner_first: "Dana",
  owner_last: "Whitfield",
  owner_email: "dana@example.com",
};

export const DEMO_MORTGAGE = {
  id: "demo-mtg",
  lender: "Coast Pacific Credit Union",
  loan_type: "3-Year Fixed",
  rate: 4.24,
  amort_years: 25,
  start_date: "2024-03-01",
  original_amount: 760000,
  balance: 713800,
  is_primary: true,
  term_months: 36,
};

export const DEMO_WHATS_NEXT: { title: string; minutes: number; frequency: string }[] = [
  { title: "Create your home inventory", minutes: 60, frequency: "once" },
  { title: "Review your homeowners insurance", minutes: 30, frequency: "annually" },
  { title: "Review your home equity", minutes: 30, frequency: "once" },
];

export const DEMO_CONTACTS = [
  { id: "c1", first_name: "Dana", last_name: "Whitfield", email: "dana@example.com", tags: ["Homeowner"], score: 5, joined: 1, pending: 0, propensity: 74, addr: "2718 W 21st Ave, Vancouver" },
  { id: "c2", first_name: "Sam", last_name: "Okafor", email: "sam.okafor@example.com", tags: ["Homeowner"], score: 5, joined: 1, pending: 0, propensity: 66, addr: "1444 W 8th Ave #302, Vancouver" },
  { id: "c3", first_name: "Priya", last_name: "Nair", email: "priya.nair@example.com", tags: [], score: 4, joined: 0, pending: 1, propensity: 61, addr: "4519 Dunbar St, Vancouver" },
  { id: "c4", first_name: "Marco", last_name: "Silva", email: "marco.s@example.com", tags: [], score: 4, joined: 0, pending: 0, propensity: 58, addr: "988 Keefer St, Vancouver" },
  { id: "c5", first_name: "Ellen", last_name: "Chu", email: "ellen.chu@example.com", tags: ["Past client"], score: 5, joined: 0, pending: 0, propensity: 77, addr: "2210 Larch St, Vancouver" },
  { id: "c6", first_name: "Ravi", last_name: "Dhillon", email: "ravi.d@example.com", tags: [], score: 3, joined: 0, pending: 0, propensity: 52, addr: "6091 Main St, Vancouver" },
];

/* hubId matches the demo hub ids in pro-store (h1 = Dana, h2 = Sam) so each
   feed row can open that hub's timeline. */
export const DEMO_ACTIVITIES = [
  { id: "a1", hub: "2718 W 21st Ave", hubId: "h1", member: "Dana Whitfield", action: "Checked home value", detail: "Build Wealth", when: "2026-07-16T21:20:00Z" },
  { id: "a2", hub: "2718 W 21st Ave", hubId: "h1", member: "Dana Whitfield", action: "Favorited a project", detail: "Legalize a basement suite", when: "2026-07-16T21:24:00Z" },
  { id: "a3", hub: "1444 W 8th Ave #302", hubId: "h2", member: "Sam Okafor", action: "Viewed mortgage rates", detail: "Save Money", when: "2026-07-15T18:05:00Z" },
  { id: "a4", hub: "2718 W 21st Ave", hubId: "h1", member: "Dana Whitfield", action: "Uploaded a document", detail: "insurance_policy_2026.pdf", when: "2026-07-14T02:11:00Z" },
  { id: "a5", hub: "1444 W 8th Ave #302", hubId: "h2", member: "Sam Okafor", action: "Contacted a service pro", detail: "False Creek HVAC", when: "2026-07-12T22:40:00Z" },
  { id: "a6", hub: "2718 W 21st Ave", hubId: "h1", member: "Dana Whitfield", action: "Clicked Sell My Home", detail: "Lead created", when: "2026-07-10T16:03:00Z" },
];

/** Buying HQ demo — what a linked JULY Search account syncs into the hub. */
export const DEMO_BUYER = {
  watched: [
    { ref: "jsw-4821", kind: "listing", label: "302-2159 W 6th Ave · 2 bed condo", last_price: 1048000, last_status: "Active", created_at: "2026-07-12T19:40:00Z" },
    { ref: "jsw-4783", kind: "listing", label: "18-3990 Quebec St · 3 bed townhome", last_price: 1268000, last_status: "Active", created_at: "2026-07-08T02:15:00Z" },
    { ref: "jsw-4866", kind: "listing", label: "506-1688 Cypress St · 1 bed + den condo", last_price: 754900, last_status: "Active", created_at: "2026-07-15T21:05:00Z" },
  ],
  searches: [
    { name: "Kits condos under $1.1M", criteria: {}, alert_new: true, alert_sold: true, created_at: "2026-06-28T18:30:00Z" },
    { name: "Main St townhomes · 3 bed", criteria: {}, alert_new: true, alert_sold: false, created_at: "2026-07-05T16:10:00Z" },
  ],
  tours: [
    { address: "302-2159 W 6th Ave", city: "Vancouver", list_price: 1048000, status: "requested", preferred_times: "Sat afternoon", created_at: "2026-07-15T22:20:00Z" },
  ],
  viewed: [
    { ref: "jsw-4901", viewed_at: "2026-07-18T23:45:00Z", label: "212-2665 W Broadway · 2 bed condo", photo: null, beds: 2, baths: 2, city: "Vancouver", list_price: 998000 },
    { ref: "jsw-4821", viewed_at: "2026-07-18T04:10:00Z", label: "302-2159 W 6th Ave · 2 bed condo", photo: null, beds: 2, baths: 2, city: "Vancouver", list_price: 1048000 },
    { ref: "jsw-4877", viewed_at: "2026-07-16T20:30:00Z", label: "7-238 E 10th Ave · 2 bed rowhome", photo: null, beds: 2, baths: 1, city: "Vancouver", list_price: 1089000 },
    { ref: "jsw-4750", viewed_at: "2026-07-14T18:05:00Z", label: "1104-1480 Howe St · 1 bed + den", photo: null, beds: 1, baths: 1, city: "Vancouver", list_price: 829900 },
  ],
};

/** Selling Roadmap templates — merged with items generated from the home's own inventory. */
export const SELLER_TASKS: { title: string; minutes: number }[] = [
  { title: "Walk-through & pricing strategy with your advisor", minutes: 60 },
  { title: "Declutter and deep clean", minutes: 240 },
  { title: "Book a pre-listing inspection", minutes: 90 },
  { title: "Gather documents: title, tax notice, permits, warranties", minutes: 45 },
  { title: "Paint touch-ups where buyers look first", minutes: 180 },
  { title: "Boost curb appeal: entry, lights, plants", minutes: 120 },
  { title: "Professional photos & floor plan", minutes: 90 },
];

/** Seeded advisor thread for the demo hub's Messages page. */
export const DEMO_MESSAGES = [
  {
    id: "m1", sender_role: "professional" as const, sender_name: "Jordan Lee",
    body: "Hi Dana — your hub is all set up. I loaded your purchase details and current estimate; poke around and tell me if anything looks off.",
    created_at: "2026-07-10T17:05:00Z",
  },
  {
    id: "m2", sender_role: "homeowner" as const, sender_name: "Dana Whitfield",
    body: "This is great. Quick one — is the water heater note serious? It says risk 7.0.",
    created_at: "2026-07-10T18:22:00Z",
  },
  {
    id: "m3", sender_role: "professional" as const, sender_name: "Jordan Lee",
    body: "Worth planning for, not panicking over. Rheem tanks usually go 8–12 years; yours is 7. Budget ~$2,400 installed — I can send two plumbers I trust when you're ready.",
    created_at: "2026-07-10T18:40:00Z",
  },
];

export const uid = () => Math.random().toString(36).slice(2, 10);
