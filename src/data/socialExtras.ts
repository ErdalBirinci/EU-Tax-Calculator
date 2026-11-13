/** Country-tuned family relief, bonus-pay taxation, city costs, expat detail, visa + pension data. Estimates 2025/2026. */

/** Family relief as fraction of income tax: married relief + per-child relief, capped. */
export const FAMILY_RULES: Record<string, { married: number; perChild: number; cap: number }> = {
  France: { married: 0.10, perChild: 0.02, cap: 0.20 },
  Germany: { married: 0.05, perChild: 0.01, cap: 0.12 },
  Luxembourg: { married: 0.08, perChild: 0.02, cap: 0.18 },
  Belgium: { married: 0.06, perChild: 0.02, cap: 0.16 },
  Portugal: { married: 0.05, perChild: 0.02, cap: 0.15 },
  default: { married: 0.04, perChild: 0.01, cap: 0.12 },
};
export const familyRule = (country: string) => FAMILY_RULES[country] ?? FAMILY_RULES.default;

/** Bonus (13th/14th) salary taxed at a flat rate on the bonus slice (e.g. AT 6%). */
export const BONUS_TAX: Record<string, { rate: number; note: string }> = {
  Austria: { rate: 0.06, note: 'Holiday/Christmas bonuses taxed at a flat 6% up to statutory caps (AT).' },
};
export const bonusRule = (country: string) => BONUS_TAX[country];

/** Monthly cost-of-living estimates for major cities (1 person, local EUR-pegged). */
export const CITY_COL: Record<string, number> = {
  Paris: 1950, Munich: 1750, Dublin: 1900, Amsterdam: 1800, Copenhagen: 1850,
  Stockholm: 1750, Helsinki: 1700, "Luxembourg City": 2000,
  Berlin: 1500, Hamburg: 1500, Frankfurt: 1600, Lyon: 1500, Marseille: 1350,
  Madrid: 1400, Barcelona: 1450, Milan: 1500, Rome: 1350, Lisbon: 1200, Porto: 1050,
  Vienna: 1400, Brussels: 1400, Prague: 1100, Warsaw: 950, Krakow: 900,
  Budapest: 900, Bucharest: 850, Sofia: 800, Athens: 1050, Zagreb: 950,
};

/** Expat regime eligibility detail. */
export interface ExpatDetail { who: string; duration: string; apply: string }
export const EXPAT_DETAIL: Record<string, ExpatDetail> = {
  '30_ruling': { who: 'Hired from abroad, scarce expertise, min. salary test', duration: '5 years (30/20/10% phase-down)', apply: 'Employer files with Belastingdienst before payroll starts' },
  beckham_law: { who: 'New Spanish tax residents, not resident 10 prior years', duration: 'Year of move + 5 years', apply: 'Option within 6 months via Agencia Tributaria (Modelo 149)' },
  impatriati: { who: 'Workers moving tax residence to Italy, 2+ yrs abroad', duration: '5 years (+3 with home/kids)', apply: 'Claim via employer payroll or tax return' },
  impatriate: { who: 'Assigned/hired from abroad by French employer', duration: '8 years', apply: 'Automatic via payroll if conditions met' },
  nhr: { who: 'New residents in research/innovation/startup roles (IFIC)', duration: '10 years', apply: 'Register with Portal das Finanças' },
  expert_tax: { who: 'Foreign experts, researchers, key staff', duration: '3 years (ext. to 5)', apply: 'Skatteverket decision before/during employment' },
  expat_scheme: { who: 'Approved researchers/highly-paid staff', duration: 'Up to 7 years', apply: 'Employer + SKAT approval' },
  key_employee: { who: 'Foreign key employees, €5.8k+/mo', duration: '48 months max', apply: 'Vero key-employee tax card' },
  sarp: { who: 'Assigned/promoted to Ireland, €100k+', duration: '5 years', apply: 'Employer SARP certification' },
  '50_exemption': { who: 'First-time Cyprus employment, €55k+', duration: '17 years', apply: 'Employer declaration to Tax Dept' },
  '20_exemption': { who: 'First-time Cyprus employment under €55k', duration: '7 years', apply: 'Employer declaration to Tax Dept' },
  foreign_resident: { who: 'Investors/relocators transferring tax residence', duration: 'Up to 15 years', apply: 'Application to AADE' },
  hqp: { who: 'Highly qualified persons (finance/iGaming/aviation)', duration: '5 years (ext. possible)', apply: 'Malta Enterprise + CfR approval' },
  expat_status: { who: 'Foreign executives/specialists (transitional regime)', duration: 'Case-by-case', apply: 'Ruling request via employer' },
};

/** Reduced Blue Card thresholds (shortage occupations) + notes, EUR annual. */
export const BLUE_CARD_SHORTAGE: Record<string, number> = {
  Germany: 45041, Netherlands: 38000, Sweden: 46000, France: 43000,
};
export const VISA_NOTES: Record<string, string> = {
  Germany: 'EU Blue Card €48,300 standard / ~€45,041 shortage. Chancenkarte points route exists without a job offer.',
  France: 'Passeport Talent from ~€41k for qualified employees; Blue Card ~€53,700.',
  Netherlands: 'Highly Skilled Migrant €46,100 (under-30 reduced); 30% ruling needs separate approval.',
  Spain: 'Highly Qualified Professional permit; Beckham Law is a tax regime, not a visa.',
  Italy: 'Decreto Flussi quotas + EU Blue Card for graduates/professionals.',
  Portugal: 'Digital Nomad D8 (~4× minimum wage income proof) or D2 entrepreneur route.',
  Ireland: 'Critical Skills Permit €38k–€64k by occupation; SARP is tax-only.',
  Denmark: 'Pay Limit Scheme ~DKK 495k; Positive Lists for shortage roles.',
  Sweden: 'Work permit via Migrationsverket; salary must cover living costs + insurance.',
  default: 'EU Blue Card ~1.0–1.6× average salary; national permits often simpler for shortage roles.',
};
export const visaNote = (country: string) => VISA_NOTES[country] ?? VISA_NOTES.default;

/** Pension: gross replacement at average wage + statutory age snapshot. */
export const PENSION: Record<string, { replacement: number; age: string }> = {
  Netherlands: { replacement: 0.80, age: '67' }, Luxembourg: { replacement: 0.78, age: '65' },
  Austria: { replacement: 0.78, age: '65' }, Spain: { replacement: 0.72, age: '66y8m' },
  Italy: { replacement: 0.68, age: '67' }, Portugal: { replacement: 0.74, age: '66y7m' },
  France: { replacement: 0.60, age: '64' }, Germany: { replacement: 0.52, age: '67' },
  Belgium: { replacement: 0.50, age: '66' }, Finland: { replacement: 0.56, age: '65' },
  Sweden: { replacement: 0.55, age: '66' }, Denmark: { replacement: 0.60, age: '67' },
  Ireland: { replacement: 0.42, age: '66' }, Poland: { replacement: 0.45, age: '65/60' },
  default: { replacement: 0.55, age: '65' },
};
export const pensionOf = (country: string) => PENSION[country] ?? PENSION.default;
