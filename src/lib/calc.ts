// Canadian mortgage + wealth math. Fixed-rate mortgages in Canada compound
// semi-annually, so the effective monthly rate is (1 + r/2)^(1/6) - 1.

export const cad = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: digits,
  }).format(n);

export const compact = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : n >= 1_000
      ? `$${Math.round(n / 1_000)}K`
      : cad(n);

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export function monthlyRate(annualPct: number): number {
  const r = annualPct / 100;
  return Math.pow(1 + r / 2, 1 / 6) - 1;
}

export function monthlyPayment(principal: number, annualPct: number, amortYears: number): number {
  const i = monthlyRate(annualPct);
  const n = amortYears * 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Months to pay off a balance at a given payment. */
export function monthsToPayoff(balance: number, annualPct: number, payment: number): number {
  const i = monthlyRate(annualPct);
  if (payment <= balance * i) return Infinity;
  return Math.log(payment / (payment - balance * i)) / Math.log(1 + i);
}

export function totalInterest(balance: number, annualPct: number, payment: number): number {
  const m = monthsToPayoff(balance, annualPct, payment);
  if (!isFinite(m)) return Infinity;
  return payment * m - balance;
}

/** Savings from adding `extra` per month on top of the required payment. */
export function extraPaymentSavings(balance: number, annualPct: number, amortYears: number, extra: number) {
  const base = monthlyPayment(balance, annualPct, amortYears);
  const baseInterest = totalInterest(balance, annualPct, base);
  const withExtra = totalInterest(balance, annualPct, base + extra);
  const monthsSaved = monthsToPayoff(balance, annualPct, base) - monthsToPayoff(balance, annualPct, base + extra);
  return {
    payment: base,
    moneySaved: Math.max(0, baseInterest - withExtra),
    monthsFaster: Math.max(0, Math.round(monthsSaved)),
  };
}

/** Principal vs interest paid so far on a loan. */
export function paidBreakdown(original: number, annualPct: number, amortYears: number, startDate: string, today = new Date()) {
  const i = monthlyRate(annualPct);
  const pay = monthlyPayment(original, annualPct, amortYears);
  const start = new Date(startDate);
  const monthsElapsed = Math.max(
    0,
    Math.min(amortYears * 12, (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())),
  );
  let bal = original;
  let interestPaid = 0;
  for (let m = 0; m < monthsElapsed; m++) {
    const int = bal * i;
    interestPaid += int;
    bal = Math.max(0, bal - (pay - int));
  }
  return {
    payment: pay,
    monthsElapsed,
    balance: bal,
    principalPaid: original - bal,
    interestPaid,
    lifetimeInterest: totalInterest(original, annualPct, pay),
  };
}

export type RefiProduct = { label: string; rate: number; amortYears: number };

/** Cost/saving of refinancing vs keeping the current loan over a horizon. */
export function refiScenario(balance: number, currentRate: number, currentAmortLeft: number, product: RefiProduct, horizonYears: number) {
  const keepPay = monthlyPayment(balance, currentRate, currentAmortLeft);
  const newPay = monthlyPayment(balance, product.rate, product.amortYears);
  const months = horizonYears * 12;
  const interestKeep = interestOverMonths(balance, currentRate, keepPay, months);
  const interestNew = interestOverMonths(balance, product.rate, newPay, months);
  return {
    newPayment: newPay,
    delta: interestKeep - interestNew, // >0 = saves money over horizon
  };
}

export function interestOverMonths(balance: number, annualPct: number, payment: number, months: number): number {
  const i = monthlyRate(annualPct);
  let bal = balance;
  let interest = 0;
  for (let m = 0; m < months && bal > 0; m++) {
    const int = bal * i;
    interest += int;
    bal = Math.max(0, bal - (payment - int));
  }
  return interest;
}

/** Canada: borrow up to 80% LTV against the home. */
export function tappableEquity(homeValue: number, totalBalance: number): number {
  return Math.max(0, homeValue * 0.8 - totalBalance);
}

export function equityUses(homeValue: number, totalBalance: number) {
  const max = tappableEquity(homeValue, totalBalance);
  const r = (f: number) => Math.round((max * f) / 1000) * 1000;
  return [
    { key: "improve", label: "Make home improvements", amount: r(1), tone: "warn" as const, icon: "hammer" },
    { key: "space", label: "Add more space", amount: r(1), tone: "ok" as const, icon: "ruler" },
    { key: "invest", label: "Make new investments", amount: r(1), tone: "ok" as const, icon: "chart" },
    { key: "cash", label: "Have more cash on hand", amount: r(0.72), tone: "warn" as const, icon: "wallet" },
    { key: "car", label: "Buy a car", amount: Math.min(r(0.3), 60000), tone: "bad" as const, icon: "car" },
    { key: "suite", label: "Build a rental suite", amount: r(0.55), tone: "ok" as const, icon: "home" },
    { key: "solar", label: "Install a heat pump / solar", amount: Math.min(r(0.13), 24000), tone: "ok" as const, icon: "sun" },
    { key: "debt", label: "Eliminate credit card debt", amount: Math.min(r(0.05), 12000), tone: "ok" as const, icon: "card" },
  ];
}

export function purchasingPower(homeValue: number, totalBalance: number) {
  const equity = Math.max(0, homeValue - totalBalance);
  const tap = tappableEquity(homeValue, totalBalance);
  // 20% down on the next home; qualify on the rest (simplified 4x leverage on down payment).
  const nextHome = Math.round((equity * 5) / 50000) * 50000;
  return [
    { key: "buy", amount: nextHome, label: "Buy a new home", note: "using your equity as the down payment" },
    { key: "rent", amount: Math.round((tap * 4) / 50000) * 50000, label: "Rent this home & buy another", note: "keep it as an investment" },
    { key: "sell", amount: Math.round(equity / 1000) * 1000, label: "Sell & take the cash", note: "your estimated net equity" },
    { key: "invest", amount: Math.round((tap * 3.2) / 50000) * 50000, label: "Buy an investment property", note: "with a 25% down payment" },
  ];
}

/** Simple appreciation series for the value sparkline. */
export function valueSeries(purchasePrice: number, purchaseDate: string, currentValue: number, points = 24) {
  const start = new Date(purchaseDate).getTime();
  const now = Date.now();
  const out: number[] = [];
  for (let k = 0; k < points; k++) {
    const t = k / (points - 1);
    const drift = purchasePrice * Math.pow(currentValue / purchasePrice, t);
    const wobble = 1 + 0.018 * Math.sin(k * 2.1) + 0.012 * Math.cos(k * 3.7);
    out.push(Math.round(drift * (k === points - 1 ? 1 : wobble)));
  }
  void start; void now;
  return out;
}

/* ---- Seller math (BC conventions) ---- */

/** Typical BC gross commission: one rate on the first $100K, another on the balance. */
export function bcCommission(price: number, firstPct = 7, restPct = 2.5): number {
  const first = Math.min(Math.max(0, price), 100_000);
  const rest = Math.max(0, price - 100_000);
  return first * (firstPct / 100) + rest * (restPct / 100);
}

/** Payout penalty approximation: 3 months' interest. (Fixed terms may owe IRD instead — UI carries the caveat.) */
export function threeMonthInterest(balance: number, annualPct: number): number {
  return (balance * (annualPct / 100)) / 4;
}

/* ------------------------------------------------------------------ */
/* Federal mortgage qualification rules.                               */
/* Thresholds per CMHC (down payment, insurable limit, amortization).  */
/* These are set by policy and do change — the UI names the authority  */
/* and dates the figures rather than presenting them as permanent.     */
/* ------------------------------------------------------------------ */

/** Price at or above which default insurance is unavailable, forcing 20% down. */
export const INSURABLE_CEILING = 1_500_000;

/** Minimum legal down payment: 5% of the first $500K, 10% above, 20% at the ceiling. */
export function minDownPayment(price: number): number {
  if (price <= 0) return 0;
  if (price >= INSURABLE_CEILING) return price * 0.2;
  if (price <= 500_000) return price * 0.05;
  return 25_000 + (price - 500_000) * 0.1;
}

/** Whether default insurance can be purchased at this price at all. */
export const isInsurable = (price: number) => price < INSURABLE_CEILING;

/**
 * The rate a lender qualifies you at: the greater of your contract rate plus
 * two points, or 5.25%. You pay the contract rate; you must *prove* you could
 * carry this one.
 */
export function stressRate(contractPct: number): number {
  return Math.max(contractPct + 2, 5.25);
}

export type NetProceedsInput = {
  price: number;
  mortgages: { balance: number; rate: number; loan_type?: string | null }[];
  commissionFirstPct?: number;
  commissionRestPct?: number;
  legal?: number;
  staging?: number;
  moving?: number;
  penaltyOverride?: number | null;
};

export function netProceeds(i: NetProceedsInput) {
  const commission = bcCommission(i.price, i.commissionFirstPct ?? 7, i.commissionRestPct ?? 2.5);
  const gst = commission * 0.05; // GST applies to commission in BC
  const balances = i.mortgages.reduce((s, m) => s + (m.balance || 0), 0);
  const penalty = i.penaltyOverride ?? i.mortgages.reduce((s, m) => s + threeMonthInterest(m.balance || 0, m.rate || 0), 0);
  const legal = i.legal ?? 1400;
  const staging = i.staging ?? 0;
  const moving = i.moving ?? 2200;
  const costs = commission + gst + penalty + legal + staging + moving;
  return {
    commission, gst, balances, penalty, legal, staging, moving,
    totalCosts: costs,
    net: i.price - balances - costs,
  };
}

/** Days-on-market guess for a list price relative to the estimate. */
export function domEstimate(baseDom: number, listPrice: number, estimate: number): number {
  const premium = estimate > 0 ? listPrice / estimate - 1 : 0;
  return Math.max(6, Math.round(baseDom * (1 + premium * 9)));
}

export const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

export function fmtDate(d: string | Date) {
  // Date-only strings are parsed as UTC midnight; anchor at noon to avoid
  // the previous-day shift in western time zones.
  const dd = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d);
  return dd.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}

/** The one place unit formatting lives — "#404 – 5535 Hastings Street".
    A missing unit must never silently drop from a displayed address. */
export function streetLine(h: { unit?: string | null; address1?: string | null } | null | undefined): string {
  if (!h?.address1) return "";
  return `${h.unit ? `#${h.unit} – ` : ""}${h.address1}`;
}
