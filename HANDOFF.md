# JULYOwner — PROJECT HANDOFF

For any new session/agent picking this up. Read fully before touching anything.
Written 2026-07-17 after v1 shipped to production. Owner: Han Lee, JULY Realty,
Vancouver BC (julyrealtyhq@gmail.com).

---

## 1. WHAT THIS IS

**JULYOwner** (https://julyowner.vercel.app) is JULY Realty's homeowner
engagement platform — a clone-then-surpass of OneHomeowner / homeowner.ai
(Cotality), rebuilt for BC/Canada. Two portals:

- **Homeowner hub** (`/hub`): dashboard (What's Next tasks, market feed,
  value/equity), Manage Home (maintenance + repairs), Save Money (Canadian
  mortgage math), Build Wealth (value estimate, tap-equity, improvements ROI),
  My Home (Overview / Inventory / Timeline / Documents), Home Services
  (recommended pros), profile.
- **Professional portal** (`/pro`): dashboard (stats, activity feed, hot
  leads), contacts + invites, hubs, providers (recommend toggles), advisors
  (default lender), signals (propensity), profile & branding (brand colour
  white-labels every sponsored hub, share link).

**Demo mode** is the sales weapon: `/hub?demo=1` and `/pro?demo=1` run fully
seeded (Vancouver home, 2718 W 21st Ave) with localStorage persistence — no
signup. "Reset demo" button reseeds.

**Source-of-truth research**: `../VIDEO_ANALYSIS.md` (61-min OneHomeowner
webinar, full transcript + reconstruction spec), `../images/` +
`../Images2/` (134 UI screenshots). The product intentionally mirrors that
UI/feature set, with original copy and Canadian logic.

## 2. THE PLATFORM DECISION (read this before adding products)

One hub, four **playbooks** — NOT separate apps: Buyer → Owner → Seller →
Investor are modes of the same hub on the same repo/DB/auth. A person's hub
changes playbook as life changes; graduation (buyer completes purchase →
owner hub) is a DB update. BuyerAiPro
(`C:\Users\user\Desktop\ClaudeAi\BuyerAiPro`, buyeraipro.com) stays a
SEPARATE neutral-brand B2B engine (other realtors pay to sponsor buyers);
JULY-branded hubs consume it via internal API keys (its HANDOFF.md §8.6).
Do not rename BuyerAiPro to JULY Buyer — two brands, one engine.

## 3. STACK / ACCOUNTS

- Next.js 16.2.10 App Router + TS + Tailwind v4, React 19, lucide-react,
  supabase-js. All 23 routes static-prerendered; portals are client
  components. Charts are hand-rolled SVG (`src/components/charts.tsx`).
- **Supabase: project `julybase` (oyssfyorpjalekrmjlwo)** — org JULY Realty.
  Shared identity hub for the JULY ecosystem (julyvalue SSO-forwards here).
  ALL our tables namespaced `ho_*`. Do not touch `app_state` (another app's).
- **Vercel: project `julyowner`**, team JULY (`brokerailpro` /
  team_xMVW4pLwZ1d6IizmpZE3yKPj). Prod alias https://julyowner.vercel.app.
  `.vercel/project.json` is committed locally in web/.
- **Email: Brevo** (account info@july.ca, JULY Realty). API key lives ONLY in
  DB table `ho_config` (service-role-only). Sender `info@july.ca`.
- Env (`.env.local` + Vercel prod/preview): NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key). Nothing secret ships
  client-side.
- Git: local repo in `web/`, branch master, NO remote yet. Commits tell the
  story — read `git log`.

## 4. DATABASE (all `ho_*`, RLS on everything)

Core: `ho_profiles` (role homeowner|professional; brand_color/org for
white-label), `ho_hubs` (+ unit, addr_key, verification_status
unverified|flagged|verified, dup_of), `ho_hub_members` (email-keyed, links
on signup via trigger), `ho_mortgages` (MULTIPLE per hub), `ho_contacts`,
`ho_advisors` (is_default), `ho_providers` + `ho_recommendations`,
`ho_inventory_items`, `ho_tasks`, `ho_documents` (folders+tags),
`ho_activities`, `ho_invites` (token), `ho_landing_pages`, `ho_leads`,
`ho_config` (server-only secrets: brevo_api_key, cron_secret, site_url,
email_from, anon_key), `ho_email_log`.

Functions (SECURITY DEFINER, tested):
- `ho_claim_hub(p_address1,...,p_invite_token,p_pro,p_unit)` — atomic claim:
  hub + membership + activity + invite acceptance + contact creation for the
  pro + DUPLICATE DETECTION (addr_key match → flags hub, links dup_of,
  auto-emails ops via pg_net → edge function).
- `ho_addr_key` / `ho_norm_unit` — canonical address fingerprint ("suite
  404" = "#404" = "404"; St=Street, W=West, postal squashed). PROVEN by SQL
  tests.
- `ho_address_claimed(...)` — anon-callable boolean-only pre-signup check.
- `ho_is_member` / `ho_is_pro_of` — RLS helpers (authenticated only).
- Trigger `ho_on_auth_user_created` → profile + membership linking.

Storage: `ho-docs` (private, member-only via RLS, 20MB), `ho-brand` (public,
own-folder writes).

**Edge function `ho-emails`** (deployed v2, verify_jwt on) — Brevo sender.
Actions: `invite` (branded invite email), `lead` (agent alert w/ reply-to),
`monthly` (value-update batch, cron), `test`, `dup_alert` (ops email on
duplicate claim), `ownership_proof` (member proves ownership → ops email).
Cron: pg_cron `ho-monthly-value-email`, 1st of month 16:00 UTC, calls the
function via pg_net with cron_secret from ho_config (secret never leaves
Postgres — reading it out via SQL gets classifier-blocked; trigger sends
from INSIDE the DB instead).

## 5. KEY APP CONVENTIONS

- `src/lib/store.tsx` (hub) + `src/lib/pro-store.tsx` (portal): ONE context
  each; demo mode = localStorage overlay of seeded data, live mode =
  supabase-js with the same action API. Pages never branch on mode.
- `src/lib/calc.ts`: CANADIAN math — fixed mortgages compound SEMI-ANNUALLY
  (`(1+r/2)^(1/6)-1`), 25-yr amortization, CAD formatting, 80% LTV equity.
  Keep it Canadian.
- `src/lib/demo.ts`: seed catalog (inventory areas/items/task templates,
  improvements w/ Vancouver costs, providers (fictional names), market data,
  demo hub). Original copy only — no OneHomeowner text/trademarks ever.
- `globals.css`: composite classes in PLAIN CSS (btn/card/input etc.) because
  they OVERRIDE Tailwind utilities (same specificity, later order). Icon-led
  inputs use `.input-lead` (declared after `.input`) — do NOT use `pl-10`.
- Address autocomplete: `src/components/address-autocomplete.tsx` — FREE
  Photon/OSM, Vancouver-biased, no key. Han chose free tier deliberately.
  Unit integrity comes from OUR normalization, not the geocoder.
- White-label: hub Shell sets `--teal/--teal-deep/--teal-soft` from the
  sponsoring pro's brand_color.
- Fine details that were deliberate: date-only strings render via
  `fmtDate` noon-anchor (timezone shift bug), `compact()` for $ badges,
  mobile bottom nav both portals, `Suspense` wrappers around
  `useSearchParams` pages.

## 6. DEPLOY RUNBOOK

1. `npx tsc --noEmit` then `npm run build` (both must be clean).
2. Commit (git identity set locally: JULY Realty <julyrealtyhq@gmail.com>).
3. **Push to GitHub = production deploy.** Since 2026-07-17 the Vercel
   project is git-connected to github.com/julyrealty/julyowner (master =
   production). `git push` triggers the deploy; the CLI fallback
   `npx vercel deploy --prod --yes --scope team_xMVW4pLwZ1d6IizmpZE3yKPj`
   still works. NOTE: the classifier sometimes blocks `git push`/deploys —
   if blocked, hand Han the command.
4. Verify https://owner.july.ca (branded prod domain; julyowner.vercel.app
   also serves) in the browser pane — landing, a hub page, a pro page.
Supabase changes go through MCP `apply_migration` (never raw prod DDL
without it) and `get_advisors` security check after DDL.

## 7. WHAT'S DONE vs OPEN

DONE: both portals + landing + professionals page, auth (password + magic
link), claim flow w/ autocomplete + unit + dup flagging + ownership review,
invite attribution end-to-end (SQL-tested incl. RLS isolation), real doc
uploads w/ signed URLs, white-label branding, email engine (invite/lead/
monthly/ops alerts) through Brevo, monthly cron, security advisor hardening,
4 production deploys.

OPEN (user-side): Brevo SMTP key into Supabase Auth settings (auth emails
still on shared mailer); custom domain owner.july.ca; GitHub remote; DDF
destination registration for buyer.july.ca (lead time!); WhatsApp Business
verification (for JULY Answer later); rotate exposed VERCEL_TOKEN +
SUPABASE_ACCESS_TOKEN (BuyerAiPro handoff §10.9).

OPEN (build roadmap — agreed sequence):
- **SELLER MODE: SHIPPED 2026-07-17.** `journey` / `listing_status` /
  `target_list_month` on ho_hubs (migration `ho_seller_mode`); `/hub/sell`
  (activation → pricing lab + net-proceeds w/ BC commission 7%/2.5% + GST +
  3-mo-interest penalty w/ IRD caveat + roadmap seeded from SELLER_TASKS +
  risk-item warnings + pre-sale ROI re-rank + listing tracker + pause);
  seller math in calc.ts (netProceeds/bcCommission/domEstimate); store
  actions startSelling/setListingStatus (live mode also fires
  'selling_started' email to the pro via ho-emails v3); conditional
  Selling nav tab; public `/worth` page → anon ho_leads kind='valuation'
  insert → DB trigger → ops email (pipeline SQL-verified end-to-end);
  landing "Thinking of selling?" band; pro portal: Selling/Sold pills +
  selling-first sort on hubs, "Active seller" cards atop Signals, dashboard
  selling-mode chip. Demo: pro book shows 2718 W 21st Ave as selling;
  homeowner demo starts in owning mode so the activation funnel shows.
- **JULY VALUE API: WIRED 2026-07-17.** Base + enterprise key live in
  ho_config (`julyvalue_api_url`, `julyvalue_api_key` — server-only; key
  also in Han's Downloads/api-keys.txt, NEVER commit it). Flow: GET
  `/search?q=<number street>` (city-less query!) → pick unit+city-safe
  match (wrong unit/city ⇒ no result on purpose) → POST `/estimate`
  {propertyId} → {estimate,low,high,confidence,attribution}. Edge fn
  **ho-value** (refresh action; member/pro JWT path + cron-secret internal
  path; updates ho_hubs home_value/value_low/value_high/value_updated/
  value_confidence). store.tsx auto-refreshes stale (>30d) or missing
  values once per load + manual refreshValue(); pricing lab shows "JULY
  Value estimate" + confidence chip + required attribution line.
  **ho-emails v4**: valuation_lead ops email now embeds the instant JULY
  Value estimate block (or "no match yet" line). SQL-verified end-to-end
  on 404-5535 Hastings St, Burnaby (est $1,205,000 high) incl. wrong-unit
  refusal. Coverage is Burnaby-first today — Vancouver addresses return
  matched:false and hubs keep purchase-anchored values; widen as JULY
  Value's property DB grows.
- **BUYER PLAYBOOK ("Buying HQ") + JULY SEARCH BRIDGE: BUILT 2026-07-17.**
  `/hub/buying` (activation w/ purchasing-power hook → watched homes,
  saved searches, tour requests, buying team, pause). `buying_started_at`
  on ho_hubs is the switch (journey='buying' reserved for hubs claimed as
  buyers); nav shows at most ONE extra tab (Selling wins over Buying).
  Store: buyer slice + loadBuyer/startBuying/stopBuying; ho-emails v5
  'buying_started' pro-signal email. Edge fn **ho-buyer** (deployed):
  member-checked, looks up ONLY the caller's own email via july-platform
  RPC `hub_buyer_snapshot(p_email,p_secret)` — secret in ho_config
  (platform_url/platform_anon_key/platform_bridge_secret). **PENDING
  HAN**: run scratchpad `july-platform-bridge.sql` in july-platform's SQL
  editor (classifier blocked cross-project DDL) — until then ho-buyer
  returns linked:false and the UI shows the connect pitch (verified).
  Identity join is BY EMAIL (july-platform consumer ids ≠ julybase ids).
- **LIVE MARKET STRIP: SHIPPED.** src/lib/platform.ts reads
  july-platform market_snapshots anon-read REST (publishable key,
  public by design) → "Your market right now" in the pricing lab with
  real active counts / median ask / $psf per property class; null =
  strip hidden, static fallback untouched.
- **BUYERAIPRO SCAN-FROM-HUB: SHIPPED 2026-07-17.** Documents page: "AI
  scan" on PDF rows → modal (Inspection/Strata/Title/PDS/Contract) →
  edge fn **ho-scan** (deployed; member-checked; 10-min signed URL from
  ho-docs → BuyerAiPro POST /api/v1/scans {scannerId, fileUrls} with
  x-api-key; poll GET /scans/{id}) → summary + key findings; INSPECTION
  scans extract systems (13-term map → exact INVENTORY_CATALOG types +
  brand/age heuristics) → preselected checklist → addInventory() per item
  (maintenance tasks auto-seed). Internal key (label "JULYOwner hub",
  user_id null = bypasses billing) + base URL in ho_config
  (buyeraipro_api_key/buyeraipro_api_url). Demo mode = canned "Sample
  result" (Lennox furnace 12y + Bradford White WH 9y), add-to-inventory
  runs for real. Bugfixes shipped with it: ScanFlow aliveRef re-arms on
  StrictMode remount; store addInventory demo path uses persistDemoFn
  (functional update) so rapid multi-adds don't lose writes.
  supabase/functions/* source is versioned in-repo and EXCLUDED from
  tsconfig (Deno).
- **WAVE 3 SHIPPED 2026-07-17:** (1) RENEWAL RADAR — ho_mortgages.term_months
  (default 60; demo 3-yr/36); Save Money page leads with a renewal card
  (countdown pill amber ≤6mo, payment-at-today's-best-rate delta, "Plan my
  renewal" → loan lead); pro Signals gets a Renewal Radar section (12-mo
  window, soonest first, "Their lender calls 4–6 months out. Call first.")
  + Active buyer cards; pro-store hubs now carry mortgages[] (single .in()
  query; RLS pro-read confirmed). (2) UNIFIED CRM TIMELINE — pro/hubs cards
  expand (accordion) into a per-hub relationship timeline: activities+leads
  (matched by address-prefix, contact-name fallback for address-less lead
  rows) + selling/buying milestones + listing-stage chip + "N events" hint.
  (3) SOLD-COMPS PLUMBING — platform.ts fetchSoldComps() anon-reads
  july-platform sold_listings; sell-page comps auto-switch to real solds w/
  "Live · JULY" pill the day data lands (NOTE: when importing solds, also
  add an anon SELECT policy on display-safe columns or the fetch stays
  null); seeded fallback until then. (4) ho-emails v6 — monthly batch
  refreshes stale (>25d) values through JULY Value (unit-aware) and writes
  them back to ho_hubs before composing; returns {sent, refreshed}.
- P1 also: JULY Search API into buyer playbook (saved/viewed/liked, tours),
  JULY Value gap badges, BuyerAiPro scan-from-hub (mint internal key via its
  scripts/make-api-key.mjs), inspection-scan → inventory graduation bridge.
- P2: unified CRM event timeline (SHIPPED wave 3); JULY Answer (ONE
  receptionist, modes) — its substrate SHIPPED wave 6: **in-hub
  messaging.** Table ho_messages (hub_id/sender_id/sender_role
  homeowner|professional|system/sender_name/body≤2000/read_at; RLS:
  participants read, senders insert as themselves via ho_is_member /
  ho_is_pro_of; zero new advisor lints). Homeowner /hub/messages thread
  (bubbles, Enter-to-send, demo thread persists via localStorage —
  messages joined the persistDemo payload); dashboard advisor card gained
  a Messages button; pro/hubs timeline panel embeds the thread + inline
  reply (inserts as professional). JULY Answer later = 'system' role
  messages into the same table. NOTE: auth_leaked_password_protection is
  OFF (Auth dashboard toggle — Han-side nicety).
- **WAVE 5 SHIPPED 2026-07-17:** weekly pro digest — ho-emails v7 action
  `weekly_pro` (per professional: new leads, selling/buying activations,
  renewals inside 90 days, hub-activity count; silent on quiet weeks;
  logs kind 'weekly'); pg_cron `ho-weekly-pro-email` Mondays 16:00 UTC
  (tested live: 200 {"sent":0} with no eligible pros). /professionals
  page refreshed: journey section ("One hub. Every chapter." —
  own/sell/buy/repeat), 8-tile shipped-capabilities grid (dark panel),
  updated hero + pillar + Professional-plan copy naming the real
  signals. NOTE: subagent spawning hit a usage-credit limit this wave —
  built inline instead.
- **JULY SIGN DISCOVERY (2026-07-17): NO API today.** julysign.com is a
  consumer app (login/signup/pricing; /developers, /docs, /api/v1/* all
  404; repo not on this machine — JULYGroupSites is the lifestyle
  monorepo, no sign app). Draft+Sign integration is blocked until Han
  exposes a REST surface (ideally mirroring julyvalue's /developers
  pattern: key-auth'd envelope create/status) or shares the repo.
- P3: JULY Lend at pre-approval/renewal (renewal radar from stored
  mortgages), Draft+Sign at offer/listing, Insure at subject removal.
- **PORTFOLIO SWITCHER SHIPPED wave 10:** store loads ALL of a member's
  hub memberships (was memberships[0] only); active hub = localStorage
  'julyowner-active-hub' (validated against membership, falls back to
  first); header shows a property <select> ONLY when >1 hub;
  switchHub() persists choice + full reload (clean slate for buyer
  sync / value refresh / messages). Demo unchanged (single hub, no
  switcher — verified). Live multi-hub path is code-verified only —
  first real exercise happens when someone claims a second hub via
  /claim (ho_claim_hub already creates hub+membership per call).
- **INVESTOR SLICE 3 (RENT LEDGER) SHIPPED wave 9:** ho_rental_entries
  UI inside the landlord card — quick-add row (Rent in / Expense toggle,
  amount, note, today's date), YTD strip (in / out / net), recent-entries
  list w/ delete, tax-time line. Store: rentalEntries slice (demo
  persists; live CRUD on ho_rental_entries). Pro-side ledger visibility
  DELIBERATELY OMITTED — a homeowner's income/expense detail is private
  financial data; the pro sees lease dates + rent via LEASE RENEWALS,
  which is the actionable part. ALSO this session: bridge SQL RUN on
  july-platform via Han's dashboard (linked:true verified w/ real
  watched homes); site_url → https://owner.july.ca (domain live);
  GitHub remote origin = github.com/julyrealty/julyowner (push blocked
  for the agent — Han runs `git push -u origin master`).
- **INVESTOR SLICE 2 (LANDLORD MODE) SHIPPED wave 8:** ho_hubs gains
  is_rental/monthly_rent/lease_start/lease_end/tenant_name +
  ho_rental_entries table (income/expense ledger, RLS member-write /
  participant-read — ledger UI is the NEXT slice). Build Wealth
  "Landlord mode" section: activation card → lease form (auto-saves via
  updateHub), lease-end countdown pill (amber ≤90d), your-rent vs live
  market-median comparison w/ headroom message, BC notice-deadline
  callout, "Talk renewal strategy" → messages. Pro Signals gains LEASE
  RENEWALS (landlord hubs w/ lease_end inside 120d, sorted soonest,
  rent shown; demo: Sam Okafor rents out 1444 W 8th at $2,850, lease
  ends Sep 30 — he's a buyer AND landlord = the investor story).
- **INVESTOR SLICE SHIPPED wave 7:** "Rent it instead" card on Build
  Wealth — live median asking rents from july-platform rent_model
  (fetchCityRents in platform.ts; anon-readable, building_type='any'
  cells, sample sizes shown), beds switcher, honest cash-flow model
  (mortgage pmt + 0.28%/yr tax + $165 ins + 0.5%/yr maintenance + 3%
  vacancy) PLUS principal-paydown line → "true monthly cost/gain";
  gross yield; CTA into /hub/messages. Card hides entirely when the
  rent fetch fails. Full JULY Investor persona still P4.
- P4: Annual Home Report (**SHIPPED wave 4** — /hub/report: print-ready
  year-in-review; value journey + equity tiles + accomplishments +
  watch list + live market chips + year-ahead w/ renewal callout;
  linked from dashboard sidebar + My Home; window.print() button,
  @media print hides chrome), JULY Move, Presale Explorer, JULY Black
  tier, landlord/investor mode (JULY Investor — persona naming, NOT
  "Invest").

## 8. ECOSYSTEM MAP (for context in any product decision)

LIVE: JULYOwner (this), buyeraipro.com (doc-scan engine, realtor-first,
REST+MCP+internal keys), search.july.ca (JULY Search), JULY Value (AVM),
neighbourhood/census AI, CRM + AI receptionist (text/call/WhatsApp), JULY
Sign (e-sign), july-platform (july.ca, DDF mirror 234K listings, solds,
market snapshots, presales, schools/crime/census).
PLANNED: JULY Draft, JULY Answer, JULY Books/Tax/Ledger, JULY Rent/Lease,
JULY Lend, JULY Insure, JULY Master, brokeraipro.com (compliance Q&A),
Lifestyle division (yachts/jets/concierge/golf/resort), Development
division. Regulatory flags per product are in the project memory.

## 9. HOW TO START A NEW SESSION

1. Read this file. Skim `../VIDEO_ANALYSIS.md` §4 (reconstruction spec) if
   touching hub UX; check project memory (auto-loaded) for decisions.
2. Dev server: `.claude/launch.json` config "julyowner-dev" via the preview
   tool (root `../.claude/launch.json`, cwd web, port 3000).
3. Type-check + build before any commit; verify in the browser pane —
   including the demo-mode flows, which are the sales surface.
4. Standing authority: Han has granted build+ship authority; deploys and
   external sends are pre-authorized, but destructive/irreversible actions
   and spending money still get confirmed.
