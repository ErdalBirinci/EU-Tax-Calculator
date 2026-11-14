import { calculateDeterministic, TAX_RULES_2025 } from "../data/taxRules";
import { REGIME_EFFECTS, EMPLOYER_RATES, PPP_INDEX, TO_EUR, BLUE_CARD, TAX_RULES_VERSION, COUNTRY_GUIDES } from "../data/marketExtras";
import { familyRule, bonusRule, CITY_COL, pensionOf, visaNote, BLUE_CARD_SHORTAGE } from "../data/socialExtras";
import { countryQualityOfLife } from "../data/qualityOfLife";
import { euCountries } from "../i18n/translations";
import { storageGet, storageSet } from "./storage";

export { TAX_RULES_VERSION };

export interface TaxResult {
  grossSalary: number;
  netSalary: number;
  currency: string;
  incomeTax: number;
  socialSecurity: number;
  otherDeductions: { name: string; amount: number }[];
  taxBreakdown?: { bracket: string; rate: string; amount: number }[];
  explanation: string;
  costOfLiving: { total: number; breakdown: { category: string; amount: number; icon?: string }[] };
  disposableIncome: number;
  optimizationTips: string[];
  b2bComparison?: { netSalary: number; explanation: string };
  expatSavings?: { amount: number; explanation: string };
  countryComparison?: { country: string; netSalary: number; currency: string }[];
  socialRights?: { unemployment: string; retirement: string; healthInsurance: string };
  lifestyleMatch?: { score: number; pros: string[]; cons: string[]; recommendation: string };
  visaGuidance?: { type: string; requirements: string[]; process: string };
  nomadIndex?: { score: number; vibe: string; internetSpeed: string; nightlife: string };
  taxSankeyData?: { source: string; target: string; value: number; label: string }[];
  /** true when numbers come from the offline deterministic engine. */
  deterministic?: boolean;
}

const CACHE_KEY = 'tax_calc_cache_v3'; // bump when the result shape changes
const getPersistentCache = () => {
  try {
    if (typeof localStorage === 'undefined') return new Map<string, TaxResult>();
    const stored = storageGet(CACHE_KEY);
    if (stored) return new Map<string, TaxResult>(JSON.parse(stored));
  } catch (e) {
    console.error('Failed to load cache', e);
  }
  return new Map<string, TaxResult>();
};

const savePersistentCache = (cache: Map<string, TaxResult>) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const entries = Array.from(cache.entries()).slice(-50);
    storageSet(CACHE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save cache', e);
  }
};

const cache = getPersistentCache();

function buildDeterministicResult(data: {
  country: string; city: string; grossSalary: number; period: string;
  maritalStatus: string; children: number; taxYear: number; currencyCode: string; employmentType: string;
  paymentsPerYear?: number;
}): TaxResult {
  const annualGross = data.period === 'monthly' ? data.grossSalary * 12 : data.grossSalary;
  const payments = data.paymentsPerYear ?? 12;
  const calc = deterministicNet(annualGross, data.country, data.maritalStatus, data.children, payments);
  const adjTax = calc.incomeTax;
  const adjNet = calc.net;
  const socialSecurity = calc.socialSecurity;
  const breakdown = calc.breakdown;

  const monthlyNet = adjNet / 12;
  const colMonthly = estimateCOL(data.country, data.city);
  const currency = TAX_RULES_2025[data.country]?.currency ?? data.currencyCode;

  return {
    grossSalary: Math.round(annualGross),
    netSalary: adjNet,
    currency,
    incomeTax: adjTax,
    socialSecurity: Math.round(socialSecurity),
    otherDeductions: [],
    taxBreakdown: breakdown,
    explanation: `### ${data.country} ${data.taxYear} — offline calculation\n\nAnnual gross **${Math.round(annualGross).toLocaleString()} ${currency}** → income tax **${adjTax.toLocaleString()} ${currency}**, social security **${Math.round(socialSecurity).toLocaleString()} ${currency}**, net **${adjNet.toLocaleString()} ${currency}** (≈${Math.round(monthlyNet).toLocaleString()} / month).\n\nProgressive national brackets applied step-by-step on the taxable base.${calc.bonusNote ? ` ${calc.bonusNote}` : ''} ${data.maritalStatus === 'married' ? 'Country-tuned married relief applied. ' : ''}${data.children > 0 ? 'Child relief applied. ' : ''}Regional surcharges, church tax and special deductions are not modelled — treat as an estimate and confirm with your local tax authority.`,
    costOfLiving: {
      total: colMonthly,
      breakdown: [
        { category: 'Rent (1-bed, city)', amount: Math.round(colMonthly * 0.45), icon: 'Home' },
        { category: 'Groceries', amount: Math.round(colMonthly * 0.22), icon: 'ShoppingBag' },
        { category: 'Transport', amount: Math.round(colMonthly * 0.10), icon: 'Bus' },
        { category: 'Utilities & internet', amount: Math.round(colMonthly * 0.13), icon: 'Zap' },
        { category: 'Leisure & dining', amount: Math.round(colMonthly * 0.10), icon: 'Coffee' },
      ],
    },
    disposableIncome: Math.round(monthlyNet - colMonthly),
    optimizationTips: defaultTips(data.country, data.employmentType, data.maritalStatus, data.children),
    b2bComparison: {
      netSalary: Math.round(adjNet * 1.08),
      explanation: 'Rough B2B estimate (+8%): lower social charges but you cover pension/health privately. Confirm with an accountant.',
    },
    countryComparison: [],
    taxSankeyData: [
      { source: 'Gross', target: 'Net', value: adjNet, label: 'Take home' },
      { source: 'Gross', target: 'Income tax', value: adjTax, label: 'Income tax' },
      { source: 'Gross', target: 'Social security', value: Math.round(socialSecurity), label: 'Social' },
    ],
    deterministic: true,
  };
}

function estimateCOL(country: string, city?: string): number {
  if (city && CITY_COL[city]) return CITY_COL[city];
  const high = ['Luxembourg', 'Denmark', 'Ireland', 'Netherlands', 'Germany', 'France', 'Austria', 'Sweden', 'Finland'];
  const mid = ['Italy', 'Spain', 'Belgium', 'Portugal', 'Slovenia', 'Estonia', 'Malta', 'Cyprus', 'Czech Republic'];
  if (high.includes(country)) return 1650;
  if (mid.includes(country)) return 1250;
  return 950;
}

function defaultTips(country: string, employmentType?: string, maritalStatus?: string, children?: number): string[] {
  const tips: string[] = [];
  if (country === 'Germany' && maritalStatus === 'married') tips.push('File jointly (Zusammenveranlagung) with tax classes III/V or IV/IV — splitting can save thousands vs. single assessment.');
  else if (country === 'France') tips.push('Check your parts fiscales (quotient familial): each child adds half a part and lowers the progressive rate.');
  else tips.push(`Max out tax-advantaged pension contributions in ${country} — usually the highest-ROI deduction for employees.`);
  if (employmentType === 'b2b') tips.push('As a contractor, deduct home office, equipment and training before tax — and compare flat-rate vs. actual-expense schemes.');
  else tips.push('Claim remote-work, commuting and professional-expenses allowances if your tax office allows flat-rate deductions.');
  if ((children ?? 0) > 0) tips.push('Claim every child allowance/credit (Kindergeld, allocations familiales, assegni): they are separate from the tax relief modelled here.');
  else tips.push('If you hold equity or freelance income, check separate capital/self-employment schedules — often taxed lower than salary.');
  return tips.slice(0, 3);
}

/** Income-tax-only lookup (social handled separately). */
const incomeOnly = (c: string, g: number) => calculateDeterministic(c, g).incomeTax;

/**
 * Parts-based income tax (France quotient familial / Germany Ehegattensplitting).
 * tax = parts × tariff(gross / parts); France caps the benefit at €1,807 per
 * extra half-part (revenus 2025, BOFiP). Returns { tax, parts, saving }.
 */
function partsBasedTax(country: string, baseGross: number, baseParts: number, parts: number, capPerHalfPart?: number): { tax: number; parts: number; saving: number } {
  const incomeOnlyC = (g: number) => calculateDeterministic(country, g).incomeTax;
  const reference = Math.round(baseParts * incomeOnlyC(baseGross / baseParts));
  const quotient = Math.round(parts * incomeOnlyC(baseGross / parts));
  let saving = Math.max(0, reference - quotient);
  if (capPerHalfPart !== undefined) saving = Math.min(saving, Math.round((parts - baseParts) * 2 * capPerHalfPart));
  return { tax: reference - saving, parts, saving };
}

function franceParts(maritalStatus: string, children: number): { base: number; parts: number } {
  const base = maritalStatus === 'married' ? 2 : 1;
  const n = Math.min(Math.max(0, Math.floor(children)), 4);
  let parts = base;
  for (let i = 0; i < n; i++) parts += i < 2 ? 0.5 : 1;
  return { base, parts };
}

/** Net from gross — single source of truth: country-tuned family relief + bonus-pay taxation. */
export function deterministicNet(annualGross: number, country: string, maritalStatus: string, children: number, paymentsPerYear = 12) {
  const rule = familyRule(country);
  const bonus = paymentsPerYear > 12 ? bonusRule(country) : undefined;
  let baseGross = annualGross;
  let bonusTax = 0;
  let bonusNote = '';
  if (bonus) {
    const bonusPart = annualGross * ((paymentsPerYear - 12) / paymentsPerYear);
    baseGross = annualGross - bonusPart;
    bonusTax = Math.round(bonusPart * bonus.rate);
    bonusNote = `${paymentsPerYear - 12} bonus payment(s) taxed at flat ${Math.round(bonus.rate * 100)}% (${bonus.note})`;
  }
  let det = calculateDeterministic(country, baseGross);
  // France married: show bracket rows on the 2-part base so rows + benefit line = final tax.
  if (country === 'France' && maritalStatus === 'married') {
    const per = calculateDeterministic(country, baseGross / 2);
    det = { ...per, incomeTax: per.incomeTax * 2, breakdown: per.breakdown.map(r => ({ ...r, amount: Math.round(r.amount * 2) })) };
  }
  const fullSocial = calculateDeterministic(country, annualGross).socialSecurity;
  // France: quotient familial (parts × tariff share, €1,807 cap per extra half-part).
  // Germany (married): Ehegattensplitting — 2 × tariff(half income).
  let baseIncomeTax = det.incomeTax;
  let partsNote = '';
  if (country === 'France') {
    const { base, parts } = franceParts(maritalStatus, children);
    const q = partsBasedTax(country, baseGross, base, parts, 1807);
    baseIncomeTax = q.tax;
    if (q.saving > 0) partsNote = `Family quotient (${parts} parts) saves €${q.saving.toLocaleString()}`;
  } else if (country === 'Germany' && maritalStatus === 'married') {
    const q = partsBasedTax(country, baseGross, 2, 2);
    baseIncomeTax = q.tax;
    if (q.saving > 0) partsNote = `Joint splitting (2 × half income) saves €${q.saving.toLocaleString()}`;
  }
  let discount = 0;
  if (country !== 'France' && !(country === 'Germany' && maritalStatus === 'married')) {
    if (maritalStatus === 'married') discount += det.incomeTax * rule.married;
    discount += Math.min(children, 4) * det.incomeTax * rule.perChild;
    discount = Math.min(discount, det.incomeTax * rule.cap);
  } else if (country === 'Germany') {
    // Splitting covers the married benefit; keep a small per-child allowance effect.
    discount = Math.min(Math.min(children, 4) * det.incomeTax * rule.perChild, det.incomeTax * rule.cap);
  }
  // Relief can never exceed the tax itself (e.g. splitting + child relief at low incomes).
  const incomeTax = Math.max(0, Math.round(baseIncomeTax - discount + bonusTax));
  const extra: { bracket: string; rate: string; amount: number }[] = [];
  if (partsNote) {
    // det rows already sum to the reference tax, so rows + this line = final tax.
    const extraSaving = Math.round(det.incomeTax - baseIncomeTax);
    if (extraSaving > 0) extra.push({ bracket: partsNote, rate: '−', amount: -extraSaving });
  }
  if (bonusTax > 0) extra.push({ bracket: 'Bonus payments (flat)', rate: `${Math.round(bonus.rate * 100)}%`, amount: bonusTax });
  const breakdown = [...det.breakdown, ...extra];
  return { incomeTax, socialSecurity: fullSocial, net: Math.round(annualGross - incomeTax - fullSocial), breakdown, bonusNote };
}

/** Solve required gross for a target net (bisection, ~40 iterations, exact to 1 unit). */
export function solveGrossFromNet(targetNetAnnual: number, country: string, maritalStatus: string, children: number, paymentsPerYear = 12): number {
  let lo = targetNetAnnual, hi = Math.max(targetNetAnnual * 2.5, targetNetAnnual + 10000);
  const netOf = (g: number) => deterministicNet(g, country, maritalStatus, children, paymentsPerYear).net;
  while (netOf(hi) < targetNetAnnual) hi *= 1.5;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < targetNetAnnual) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** Apply an expat regime deterministically. Returns adjusted {incomeTax, savings}. */
export function applyRegime(annualGross: number, country: string, regimeId: string | undefined, baseIncomeTax: number): { incomeTax: number; savings: number; note: string } {
  if (!regimeId || regimeId === 'none') return { incomeTax: baseIncomeTax, savings: 0, note: '' };
  const eff = REGIME_EFFECTS[regimeId];
  if (!eff) return { incomeTax: baseIncomeTax, savings: 0, note: '' };
  if (eff.flatRate !== undefined) {
    const t = Math.round(annualGross * eff.flatRate);
    return { incomeTax: t, savings: Math.max(0, baseIncomeTax - t), note: eff.note };
  }
  // Thresholded exemptions (SARP, Cyprus 50%): only income ABOVE the threshold is relieved.
  const taxableBase = eff.exemptAbove !== undefined
    ? annualGross - eff.exemptFraction * Math.max(0, annualGross - eff.exemptAbove)
    : annualGross * (1 - eff.exemptFraction);
  const reduced = calculateDeterministic(country, taxableBase);
  const savings = Math.max(0, baseIncomeTax - reduced.incomeTax);
  return { incomeTax: reduced.incomeTax, savings, note: eff.note };
}

export function employerCost(annualGross: number, country: string): number {
  return Math.round(annualGross * (EMPLOYER_RATES[country] ?? 0.22));
}

export function pppAdjustedNet(netAnnualLocal: number, country: string, currencyCode: string): number {
  const rate = TO_EUR[currencyCode] ?? 1;
  const netEur = netAnnualLocal / rate;
  return Math.round(netEur * (100 / (PPP_INDEX[country] ?? 100)));
}

export function blueCardCheck(annualGrossLocal: number, country: string, currencyCode: string): { thresholdEur: number; grossEur: number; eligible: boolean } {
  const rate = TO_EUR[currencyCode] ?? 1;
  const grossEur = annualGrossLocal / rate;
  const thresholdEur = BLUE_CARD[country] ?? 33500;
  return { thresholdEur, grossEur: Math.round(grossEur), eligible: grossEur >= thresholdEur };
}

export async function calculateTaxes(data: {
  country: string; city: string; grossSalary: number; period: string; maritalStatus: string;
  children: number; language: string; expatRegime?: string; taxYear: number; currencyCode: string; employmentType: string;
  paymentsPerYear?: number;
}): Promise<TaxResult> {
  const stabilized = Object.keys(data).sort().reduce((acc: Record<string, unknown>, k) => {
    acc[k] = (data as Record<string, unknown>)[k];
    return acc;
  }, {} as Record<string, unknown>);
  const cacheKey = JSON.stringify(stabilized);
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const base = buildDeterministicResult(data);

  // Fully offline: enrich the exact numbers with the local engine
  // (cost of living, tips, comparison, rights, visa, nomad index).
  // Numbers never change — enrichment is presentation only.
  const enriched = buildLocalEnrichment(data, base);
  cache.set(cacheKey, enriched);
  savePersistentCache(cache);
  return enriched;
}

/** Local enrichment engine — replaces the former cloud-AI layer. 100% offline. */
function buildLocalEnrichment(
  data: { country: string; city: string; maritalStatus: string; children: number; expatRegime?: string },
  base: TaxResult,
): TaxResult {
  const { country, city } = data;
  const q = countryQualityOfLife[country];
  const pension = pensionOf(country);
  const visaText = visaNote(country);
  const regime = applyRegime(base.grossSalary, country, data.expatRegime, base.incomeTax);
  const visa = blueCardCheck(base.grossSalary, country, base.currency);

  // Top-10 comparison: same profile, net converted to EUR.
  const ranked = euCountries
    .map((c) => {
      const cur = TAX_RULES_2025[c]?.currency ?? 'EUR';
      const net = deterministicNet(base.grossSalary, c, data.maritalStatus, data.children).net;
      return { country: c, netSalary: Math.round(net / (TO_EUR[cur] ?? 1)), currency: 'EUR' as string };
    })
    .sort((a, b) => b.netSalary - a.netSalary);
  const top10 = ranked.slice(0, 10);
  if (!top10.some((r) => r.country === country) && ranked.length > 10) {
    const self = ranked.find((r) => r.country === country)!;
    top10[top10.length - 1] = self;
  }

  // Lifestyle score from local quality-of-life data (0–100).
  const score = q
    ? Math.round((q.safety + q.healthcare + q.internet + q.purchasingPower + (100 - q.pollution)) / 5)
    : 65;
  const pros: string[] = [];
  const cons: string[] = [];
  if (q) {
    if (q.safety >= 75) pros.push('High personal safety');
    if (q.healthcare >= 80) pros.push('Strong public healthcare');
    if (q.internet >= 85) pros.push('Excellent internet for remote work');
    if (q.purchasingPower >= 75) pros.push('Strong local purchasing power');
    if (q.pollution >= 40) cons.push('Air quality can be poor in larger cities');
    if (q.purchasingPower < 60) cons.push('Below-average local purchasing power');
    if (q.healthcare < 65) cons.push('Public healthcare rated below EU average');
  }
  if (base.disposableIncome > 0) pros.push('Positive disposable income after local costs');
  else cons.push('Tight budget after local living costs');
  if (pros.length === 0) pros.push(COUNTRY_GUIDES[country]?.blurb ?? 'EU-wide labour protections apply');
  if (cons.length === 0) cons.push('Regional taxes and rents vary — verify locally');

  const nomadScore = q ? Math.round((q.internet + q.safety + q.purchasingPower) / 3) : 65;
  const shortage = BLUE_CARD_SHORTAGE[country];
  const requirements = [
    visa.eligible
      ? `Salary €${visa.grossEur.toLocaleString()} meets the Blue Card threshold (€${visa.thresholdEur.toLocaleString()})`
      : `Salary €${visa.grossEur.toLocaleString()} is below the Blue Card threshold (€${visa.thresholdEur.toLocaleString()}) — a national permit may fit better`,
    visaText,
    ...(shortage ? [`Shortage-occupation route from €${shortage.toLocaleString()}`] : []),
    ...(regime.savings > 0 ? [`${data.expatRegime} tax relief available (${regime.note})`] : []),
  ].slice(0, 4);

  return {
    ...base,
    countryComparison: top10,
    socialRights: {
      unemployment: 'Earnings-related unemployment insurance funded by social contributions; EU coordination lets you export benefits while job-seeking in another member state.',
      retirement: `Statutory pension accrues through contributions (reference age ${pension.age}); see the pension projection card for a rough estimate.`,
      healthInsurance: 'Residence-based public healthcare funded by social contributions; your EHIC covers medically necessary care anywhere in the EU.',
    },
    lifestyleMatch: {
      score,
      pros: pros.slice(0, 3),
      cons: cons.slice(0, 3),
      recommendation: score >= 75
        ? `${country} scores well for remote workers — strong basics with a liveable cost base.`
        : score >= 60
          ? `${country} is a solid base with trade-offs — check housing costs in ${city || 'the capital'} before committing.`
          : `${country} can stretch a budget, but verify healthcare access and housing in ${city || 'your target city'} first.`,
    },
    visaGuidance: {
      type: visa.eligible ? 'EU Blue Card' : 'National work permit',
      requirements,
      process: visaText,
    },
    nomadIndex: {
      score: nomadScore,
      vibe: city ? `${city} remote-work base` : `${country} remote-work base`,
      internetSpeed: q ? `${q.internet}/100 connectivity index` : 'Varies by provider',
      nightlife: city ? `${city}: varies by district — check local guides` : 'City-dependent',
    },
    expatSavings: regime.savings > 0 ? { amount: regime.savings, explanation: regime.note } : undefined,
    deterministic: true,
  };
}

