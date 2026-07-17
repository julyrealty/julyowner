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
3. `npx vercel deploy --prod --yes --scope team_xMVW4pLwZ1d6IizmpZE3yKPj`
   from `web/`. NOTE: the permission classifier sometimes blocks deploys —
   Han has granted standing authority; if blocked, hand him the command.
4. Verify https://julyowner.vercel.app in the browser pane (landing, a hub
   page, a pro page).
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
- P1 still open: JULY Value API into pricing lab (replace static estimate),
  sold comps from july-platform DB.
- P1 also: JULY Search API into buyer playbook (saved/viewed/liked, tours),
  JULY Value gap badges, BuyerAiPro scan-from-hub (mint internal key via its
  scripts/make-api-key.mjs), inspection-scan → inventory graduation bridge.
- P2: unified CRM event timeline; JULY Answer (ONE receptionist, modes).
- P3: JULY Lend at pre-approval/renewal (renewal radar from stored
  mortgages), Draft+Sign at offer/listing, Insure at subject removal.
- P4: Annual Home Report, JULY Move, Presale Explorer, JULY Black tier,
  landlord/investor mode (JULY Investor — persona naming, NOT "Invest").

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
