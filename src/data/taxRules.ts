/**
 * Deterministic EU tax rules — 2025/2026 estimates.
 *
 * IMPORTANT: These are simplified national-level approximations for instant,
 * offline calculation. Regional surcharges (Spain, Italy, Belgium communes,
 * Swiss-style church tax in DE, etc.) and special deductions are NOT fully
 * modelled. The AI layer (taxEngine) adds explanation + cost-of-living on top.
 * Values reviewed against EC Taxation Trends + national ministries, Nov 2026.
 *
 * All bracket thresholds are ANNUAL amounts in LOCAL currency.
 */

export interface TaxBracket {
  /** Upper bound of this bracket (inclusive). Omit for top / open-ended bracket. */
  upTo?: number;
  rate: number; // e.g. 0.42 = 42%
}

export interface CountryTaxRule {
  currency: string;
  brackets: TaxBracket[];
  /** Basic personal allowance already reflected in brackets? If >0 and brackets start at 0-taxed, engine subtracts first. */
  allowance: number;
  /** Employee social-security rate applied on gross (capped at socialCap where set). */
  socialRate: number;
  socialCap?: number;
  /** Effective top marginal (income tax + social) for heatmap display. */
  effectiveTopRate: number;
  notesTr?: string;
  notesEn?: string;
}

const R = (
  currency: string,
  brackets: TaxBracket[],
  socialRate: number,
  effectiveTopRate: number,
  allowance = 0,
  socialCap?: number,
): CountryTaxRule => ({ currency, brackets, socialRate, effectiveTopRate, allowance, socialCap });

export const TAX_RULES_2025: Record<string, CountryTaxRule> = {
  // DACH + Benelux
  Germany: R('EUR', [
    { upTo: 12096, rate: 0 }, { upTo: 17443, rate: 0.14 }, { upTo: 68479, rate: 0.30 },
    { upTo: 277826, rate: 0.42 }, { rate: 0.45 },
  ], 0.205, 47, 0, 96600),
  Austria: R('EUR', [
    { upTo: 13270, rate: 0 }, { upTo: 19799, rate: 0.20 }, { upTo: 32000, rate: 0.30 },
    { upTo: 62000, rate: 0.40 }, { upTo: 93000, rate: 0.48 }, { upTo: 1000000, rate: 0.50 }, { rate: 0.55 },
  ], 0.1812, 55, 0, 90000),
  Netherlands: R('EUR', [
    { upTo: 38441, rate: 0.3582 }, { upTo: 76817, rate: 0.3748 }, { rate: 0.495 },
  ], 0.02, 49.5),
  Belgium: R('EUR', [
    { upTo: 15440, rate: 0.25 }, { upTo: 27270, rate: 0.40 }, { upTo: 47870, rate: 0.45 }, { rate: 0.50 },
  ], 0.1307, 53),
  Luxembourg: R('EUR', [
    { upTo: 12460, rate: 0 }, { upTo: 14976, rate: 0.08 }, { upTo: 20004, rate: 0.10 },
    { upTo: 24160, rate: 0.14 }, { upTo: 44208, rate: 0.24 }, { upTo: 60000, rate: 0.32 },
    { upTo: 100000, rate: 0.40 }, { rate: 0.42 },
  ], 0.125, 45),
  // France + South
  France: R('EUR', [
    { upTo: 11294, rate: 0 }, { upTo: 28797, rate: 0.11 }, { upTo: 82341, rate: 0.30 },
    { upTo: 177106, rate: 0.41 }, { rate: 0.45 },
  ], 0.22, 55),
  Spain: R('EUR', [
    { upTo: 12450, rate: 0.19 }, { upTo: 20200, rate: 0.24 }, { upTo: 35200, rate: 0.30 },
    { upTo: 60000, rate: 0.37 }, { upTo: 300000, rate: 0.45 }, { rate: 0.47 },
  ], 0.0635, 50),
  Portugal: R('EUR', [
    { upTo: 7703, rate: 0.1325 }, { upTo: 11623, rate: 0.181 }, { upTo: 16472, rate: 0.245 },
    { upTo: 21321, rate: 0.281 }, { upTo: 27146, rate: 0.329 }, { upTo: 39791, rate: 0.375 },
    { upTo: 43000, rate: 0.413 }, { upTo: 80000, rate: 0.435 }, { rate: 0.48 },
  ], 0.11, 53),
  Italy: R('EUR', [
    { upTo: 28000, rate: 0.23 }, { upTo: 50000, rate: 0.25 }, { rate: 0.35 },
  ], 0.095, 47),
  Greece: R('EUR', [
    { upTo: 10000, rate: 0.09 }, { upTo: 20000, rate: 0.22 }, { upTo: 30000, rate: 0.28 },
    { upTo: 40000, rate: 0.36 }, { rate: 0.44 },
  ], 0.1387, 52),
  Cyprus: R('EUR', [
    { upTo: 19500, rate: 0 }, { upTo: 28000, rate: 0.20 }, { upTo: 36300, rate: 0.25 },
    { upTo: 60000, rate: 0.30 }, { rate: 0.35 },
  ], 0.083, 38),
  Malta: R('EUR', [
    { upTo: 12700, rate: 0 }, { upTo: 21200, rate: 0.15 }, { upTo: 60000, rate: 0.25 }, { rate: 0.35 },
  ], 0.10, 42),
  // Nordics
  Sweden: R('SEK', [
    { upTo: 24000, rate: 0 }, { upTo: 598500, rate: 0.322 }, { rate: 0.522 },
  ], 0.07, 55),
  Denmark: R('DKK', [
    { upTo: 50000, rate: 0.08 }, { upTo: 588514, rate: 0.38 }, { rate: 0.53 },
  ], 0.08, 56),
  Finland: R('EUR', [
    { upTo: 19900, rate: 0.1264 }, { upTo: 29700, rate: 0.1725 }, { upTo: 49000, rate: 0.2125 },
    { upTo: 85500, rate: 0.2725 }, { rate: 0.3125 },
  ], 0.105, 51),
  Ireland: R('EUR', [
    { upTo: 44000, rate: 0.20 }, { rate: 0.40 },
  ], 0.045, 48),
  // Central / East
  Poland: R('PLN', [
    { upTo: 30000, rate: 0 }, { upTo: 120000, rate: 0.12 }, { rate: 0.32 },
  ], 0.1371, 39),
  'Czech Republic': R('CZK', [
    { upTo: 1612968, rate: 0.15 }, { rate: 0.23 },
  ], 0.116, 30, 0),
  Slovakia: R('EUR', [
    { upTo: 47019, rate: 0.19 }, { rate: 0.25 },
  ], 0.134, 38),
  Slovenia: R('EUR', [
    { upTo: 8755, rate: 0.16 }, { upTo: 26224, rate: 0.26 }, { upTo: 51567, rate: 0.33 },
    { upTo: 74109, rate: 0.39 }, { rate: 0.45 },
  ], 0.221, 55),
  Hungary: R('HUF', [{ rate: 0.15 }], 0.185, 33.5),
  Romania: R('RON', [{ rate: 0.10 }], 0.35, 45),
  Bulgaria: R('BGN', [{ rate: 0.10 }], 0.138, 24),
  Croatia: R('EUR', [
    { upTo: 50340, rate: 0.20 }, { rate: 0.30 },
  ], 0.20, 44),
  Estonia: R('EUR', [{ rate: 0.22 }], 0.016, 24),
  Latvia: R('EUR', [
    { upTo: 20004, rate: 0.20 }, { upTo: 78100, rate: 0.23 }, { rate: 0.31 },
  ], 0.105, 38),
  Lithuania: R('EUR', [
    { upTo: 101002, rate: 0.20 }, { rate: 0.32 },
  ], 0.195, 42),
};

export function calculateDeterministic(
  country: string,
  annualGross: number,
): { incomeTax: number; socialSecurity: number; net: number; breakdown: { bracket: string; rate: string; amount: number }[] } {
  const rule = TAX_RULES_2025[country];
  if (!rule) {
    // Fallback: EU-average ~32% effective
    const incomeTax = annualGross * 0.22;
    const social = annualGross * 0.12;
    return {
      incomeTax: Math.round(incomeTax),
      socialSecurity: Math.round(social),
      net: Math.round(annualGross - incomeTax - social),
      breakdown: [
        { bracket: 'Estimated income tax (EU avg)', rate: '22%', amount: Math.round(incomeTax) },
        { bracket: 'Estimated social security (EU avg)', rate: '12%', amount: Math.round(social) },
      ],
    };
  }
  const taxableBase = Math.max(0, annualGross - rule.allowance);
  let remaining = taxableBase;
  let lower = 0;
  const breakdown: { bracket: string; rate: string; amount: number }[] = [];
  let incomeTax = 0;
  for (const b of rule.brackets) {
    const upper = b.upTo ?? Infinity;
    const slice = Math.min(remaining, upper - lower);
    if (slice <= 0) {
      lower = upper;
      continue;
    }
    const amt = slice * b.rate;
    incomeTax += amt;
    if (b.rate > 0 && slice > 1) {
      breakdown.push({
        bracket: upper === Infinity ? `${fmt(lower)}+` : `${fmt(lower)} – ${fmt(upper)}`,
        rate: `${(b.rate * 100).toFixed(b.rate * 100 % 1 ? 2 : 0)}%`,
        amount: Math.round(amt),
      });
    }
    remaining -= slice;
    lower = upper;
    if (remaining <= 0) break;
  }
  const socialBase = rule.socialCap ? Math.min(annualGross, rule.socialCap) : annualGross;
  const socialSecurity = socialBase * rule.socialRate;
  const net = annualGross - incomeTax - socialSecurity;
  return { incomeTax: Math.round(incomeTax), socialSecurity: Math.round(socialSecurity), net: Math.round(net), breakdown };
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
