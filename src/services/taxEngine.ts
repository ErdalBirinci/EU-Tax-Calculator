import { GoogleGenAI, Type } from "@google/genai";
import { calculateDeterministic, TAX_RULES_2025 } from "../data/taxRules";
import { REGIME_EFFECTS, EMPLOYER_RATES, PPP_INDEX, TO_EUR, BLUE_CARD, TAX_RULES_VERSION } from "../data/marketExtras";
import { familyRule, bonusRule, CITY_COL } from "../data/socialExtras";

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
  /** true when numbers come from the offline deterministic engine (no AI hallucination). */
  deterministic?: boolean;
}

const getPersistentCache = () => {
  try {
    const stored = localStorage.getItem('tax_calc_cache_v2');
    if (stored) return new Map<string, TaxResult>(JSON.parse(stored));
  } catch (e) {
    console.error('Failed to load cache', e);
  }
  return new Map<string, TaxResult>();
};

const savePersistentCache = (cache: Map<string, TaxResult>) => {
  try {
    const entries = Array.from(cache.entries()).slice(-50);
    localStorage.setItem('tax_calc_cache_v2', JSON.stringify(entries));
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
  const det = calculateDeterministic(country, baseGross);
  const fullSocial = calculateDeterministic(country, annualGross).socialSecurity;
  let discount = 0;
  if (maritalStatus === 'married') discount += det.incomeTax * rule.married;
  discount += Math.min(children, 4) * det.incomeTax * rule.perChild;
  discount = Math.min(discount, det.incomeTax * rule.cap);
  const incomeTax = Math.round(det.incomeTax - discount + bonusTax);
  const breakdown = bonusTax > 0
    ? [...det.breakdown, { bracket: 'Bonus payments (flat)', rate: `${Math.round(bonus.rate * 100)}%`, amount: bonusTax }]
    : det.breakdown;
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
  const reduced = calculateDeterministic(country, annualGross * (1 - eff.exemptFraction));
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

  const apiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY
    ?? (typeof process !== 'undefined' ? (process as unknown as { env?: Record<string, string> }).env?.GEMINI_API_KEY : undefined);

  // No key → return fast, exact offline result immediately.
  if (!apiKey) {
    cache.set(cacheKey, base);
    savePersistentCache(cache);
    return base;
  }

  // With key → enrich the exact numbers with AI context (COL, tips, lifestyle, visa…).
  try {
    const enriched = await enrichWithAI(data, base, apiKey);
    cache.set(cacheKey, enriched);
    savePersistentCache(cache);
    return enriched;
  } catch (e) {
    console.warn('[TaxEngine] AI enrichment failed, using deterministic core', e);
    cache.set(cacheKey, base);
    savePersistentCache(cache);
    return base;
  }
}

async function enrichWithAI(
  data: { country: string; city: string; grossSalary: number; period: string; language: string; expatRegime?: string; taxYear: number; currencyCode: string },
  base: TaxResult,
  apiKey: string,
): Promise<TaxResult> {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You enrich a PRE-COMPUTED tax result. NEVER change these numbers: gross=${base.grossSalary}, incomeTax=${base.incomeTax}, social=${base.socialSecurity}, net=${base.netSalary} (${base.currency}).\nCountry=${data.country}, city=${data.city || 'capital'}, year=${data.taxYear}, language=${data.language}, expat=${data.expatRegime || 'none'}.\nReturn JSON with: explanation (markdown, ${data.language}, must state the tax-free allowance), costOfLiving {total monthly, breakdown[5]}, disposableIncome (monthly net - total), optimizationTips[3], socialRights, lifestyleMatch, visaGuidance, nomadIndex, taxSankeyData, countryComparison[10 EU, EUR net, desc].`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      seed: 42, temperature: 0, responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          costOfLiving: {
            type: Type.OBJECT,
            properties: {
              total: { type: Type.NUMBER },
              breakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                category: { type: Type.STRING }, amount: { type: Type.NUMBER }, icon: { type: Type.STRING } } } },
            },
          },
          disposableIncome: { type: Type.NUMBER },
          optimizationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          countryComparison: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
            country: { type: Type.STRING }, netSalary: { type: Type.NUMBER }, currency: { type: Type.STRING } } } },
          socialRights: { type: Type.OBJECT, properties: {
            unemployment: { type: Type.STRING }, retirement: { type: Type.STRING }, healthInsurance: { type: Type.STRING } } },
          lifestyleMatch: { type: Type.OBJECT, properties: {
            score: { type: Type.NUMBER }, pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendation: { type: Type.STRING } } },
          visaGuidance: { type: Type.OBJECT, properties: {
            type: { type: Type.STRING }, requirements: { type: Type.ARRAY, items: { type: Type.STRING } }, process: { type: Type.STRING } } },
          nomadIndex: { type: Type.OBJECT, properties: {
            score: { type: Type.NUMBER }, vibe: { type: Type.STRING }, internetSpeed: { type: Type.STRING }, nightlife: { type: Type.STRING } } },
          taxSankeyData: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
            source: { type: Type.STRING }, target: { type: Type.STRING }, value: { type: Type.NUMBER }, label: { type: Type.STRING } } } },
        },
      },
    },
  });
  if (!response.text) return base;
  const extra = JSON.parse(response.text);
  return {
    ...base,
    explanation: extra.explanation ?? base.explanation,
    costOfLiving: extra.costOfLiving ?? base.costOfLiving,
    disposableIncome: extra.disposableIncome ?? base.disposableIncome,
    optimizationTips: extra.optimizationTips ?? base.optimizationTips,
    countryComparison: extra.countryComparison ?? [],
    socialRights: extra.socialRights,
    lifestyleMatch: extra.lifestyleMatch,
    visaGuidance: extra.visaGuidance,
    nomadIndex: extra.nomadIndex,
    taxSankeyData: extra.taxSankeyData ?? base.taxSankeyData,
    deterministic: true,
  };
}
