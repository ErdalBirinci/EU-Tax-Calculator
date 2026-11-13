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
  // DE 2026 (§32a EStG, BMF): Grundfreibetrag 12,348; official formula is quadratic.
  // Piecewise-linear fit matches the official tariff within ~7% (verified at 25/30/40/50k).
  Germany: R('EUR', [
    { upTo: 12348, rate: 0 }, { upTo: 17799, rate: 0.19 }, { upTo: 40000, rate: 0.28 },
    { upTo: 69878, rate: 0.37 }, { upTo: 277825, rate: 0.42 }, { rate: 0.45 },
  ], 0.205, 47, 0, 96600),
  // NOTE: single social cap (pension 96,600); health caps lower (~66,150).
  // AT 2025: BMF tariff — 40% (not 41%) since 2024; thresholds inflation-indexed.
  Austria: R('EUR', [
    { upTo: 13308, rate: 0 }, { upTo: 21617, rate: 0.20 }, { upTo: 35836, rate: 0.30 },
    { upTo: 69166, rate: 0.40 }, { upTo: 103072, rate: 0.48 }, { upTo: 1000000, rate: 0.50 }, { rate: 0.55 },
  ], 0.1807, 55, 0, 86940),
  // NOTE: AT social cap = 2025 Höchstbeitragsgrundlage €6,210/mo × 14.
  Netherlands: R('EUR', [
    { upTo: 38441, rate: 0.3582 }, { upTo: 76817, rate: 0.3748 }, { rate: 0.495 },
  ], 0.02, 49.5),
  // BE income year 2025 (PwC Tax Summaries: 16,320 / 28,800 / 49,840).
  Belgium: R('EUR', [
    { upTo: 16320, rate: 0.25 }, { upTo: 28800, rate: 0.40 }, { upTo: 49840, rate: 0.45 }, { rate: 0.50 },
  ], 0.1307, 53),
  Luxembourg: R('EUR', [
    { upTo: 12460, rate: 0 }, { upTo: 14976, rate: 0.08 }, { upTo: 20004, rate: 0.10 },
    { upTo: 24160, rate: 0.14 }, { upTo: 44208, rate: 0.24 }, { upTo: 60000, rate: 0.32 },
    { upTo: 100000, rate: 0.40 }, { rate: 0.42 },
  ], 0.125, 45),
  // France + South
  // FR 2026 barème (revenus 2025, service-public.fr): 11,600 / 29,579 / 84,577 / 181,917.
  France: R('EUR', [
    { upTo: 11600, rate: 0 }, { upTo: 29579, rate: 0.11 }, { upTo: 84577, rate: 0.30 },
    { upTo: 181917, rate: 0.41 }, { rate: 0.45 },
  ], 0.22, 55),
  Spain: R('EUR', [
    { upTo: 12450, rate: 0.19 }, { upTo: 20200, rate: 0.24 }, { upTo: 35200, rate: 0.30 },
    { upTo: 60000, rate: 0.37 }, { upTo: 300000, rate: 0.45 }, { rate: 0.47 },
  ], 0.0635, 50),
  // PT 2025 (State Budget: thresholds +4.62%; rates cut by Lei 33/2024).
  Portugal: R('EUR', [
    { upTo: 8059, rate: 0.13 }, { upTo: 12160, rate: 0.165 }, { upTo: 17233, rate: 0.22 },
    { upTo: 22306, rate: 0.25 }, { upTo: 28400, rate: 0.32 }, { upTo: 41629, rate: 0.355 },
    { upTo: 44987, rate: 0.436 }, { upTo: 83696, rate: 0.455 }, { rate: 0.48 },
  ], 0.11, 53),
  // IT IRPEF 2025 (AdE): 23/25/43 — the old 35% top rate was abolished in 2024.
  Italy: R('EUR', [
    { upTo: 28000, rate: 0.23 }, { upTo: 50000, rate: 0.25 }, { rate: 0.43 },
  ], 0.095, 52),
  Greece: R('EUR', [
    { upTo: 10000, rate: 0.09 }, { upTo: 20000, rate: 0.22 }, { upTo: 30000, rate: 0.28 },
    { upTo: 40000, rate: 0.36 }, { rate: 0.44 },
  ], 0.1387, 52),
  Cyprus: R('EUR', [
    { upTo: 19500, rate: 0 }, { upTo: 28000, rate: 0.20 }, { upTo: 36300, rate: 0.25 },
    { upTo: 60000, rate: 0.30 }, { rate: 0.35 },
  ], 0.105, 38),
  Malta: R('EUR', [
    { upTo: 12700, rate: 0 }, { upTo: 21200, rate: 0.15 }, { upTo: 60000, rate: 0.25 }, { rate: 0.35 },
  ], 0.10, 42),
  // Nordics
  // SE 2025: skiktgräns 625,800 kr (Skatteverket); municipal avg ~32.2%.
  Sweden: R('SEK', [
    { upTo: 24000, rate: 0 }, { upTo: 625800, rate: 0.322 }, { rate: 0.522 },
  ], 0.07, 55),
  // DK 2025: personfradrag 51,600; AM 8% (modelled as social); bottom+municipal ~37.02%;
  // topskat 15% above 611,800 after AM; skatteloft caps BST+MT+top at 52.07%.
  Denmark: R('DKK', [
    { upTo: 51600, rate: 0 }, { upTo: 611800, rate: 0.3702 }, { rate: 0.5207 },
  ], 0.08, 60),
  Finland: R('EUR', [
    { upTo: 19900, rate: 0.1264 }, { upTo: 29700, rate: 0.1725 }, { upTo: 49000, rate: 0.2125 },
    { upTo: 85500, rate: 0.2725 }, { rate: 0.3125 },
  ], 0.095, 51),
  // NOTE: FI social ≈ pension 7.15% + unemployment/health ~2%; brackets incl. avg municipal.
  Ireland: R('EUR', [
    { upTo: 44000, rate: 0.20 }, { rate: 0.40 },
  ], 0.06, 48),
  // Central / East
  Poland: R('PLN', [
    { upTo: 30000, rate: 0 }, { upTo: 120000, rate: 0.12 }, { rate: 0.32 },
  ], 0.1371, 39),
  // NOTE: 0% band models the 30,000 PLN allowance (tax value 3,600) at the 12% rate.
  // CZ 2025: 23% above 36x avg wage = 1,676,052 CZK; social 6.5% + health 4.5%.
  'Czech Republic': R('CZK', [
    { upTo: 1676052, rate: 0.15 }, { rate: 0.23 },
  ], 0.11, 30, 0, 2234736),
  // SK 2025: 19% to 48,441.43 (176.8x subsistence); 2026 adds 30%/35% tiers (not modelled).
  Slovakia: R('EUR', [
    { upTo: 48441, rate: 0.19 }, { rate: 0.25 },
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
  // EE 2025: flat 22%; employee social = 1.6% unemployment + 2% pension.
  // Basic exemption (up to €7,848, phased out) not modelled — low incomes slightly overstated.
  Estonia: R('EUR', [{ rate: 0.22 }], 0.036, 26),
  // LV 2025 reform (MoF): 25.5% to 105,300; 33% above; +3pp over 200,000.
  Latvia: R('EUR', [
    { upTo: 105300, rate: 0.255 }, { upTo: 200000, rate: 0.33 }, { rate: 0.36 },
  ], 0.105, 40),
  // LT 2025: 20% to 60 avg wages = 126,533 EUR; 32% above.
  Lithuania: R('EUR', [
    { upTo: 126533, rate: 0.20 }, { rate: 0.32 },
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
