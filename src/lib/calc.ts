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
