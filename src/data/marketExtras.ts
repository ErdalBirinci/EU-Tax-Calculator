/** Market/SEO extras: employer cost, PPP, FX, visa thresholds, guides. Estimates 2025/2026. */

export const TAX_RULES_VERSION = '2026.1';

/** Employer social charges as fraction of gross (approx, capped systems simplified). */
export const EMPLOYER_RATES: Record<string, number> = {
  France: 0.42, Italy: 0.30, Spain: 0.315, Belgium: 0.35, Sweden: 0.3142,
  Germany: 0.21, Austria: 0.21, Netherlands: 0.18, Finland: 0.20, Denmark: 0.02,
  Ireland: 0.1115, Portugal: 0.2375, Greece: 0.22, Luxembourg: 0.16, Malta: 0.10,
  Cyprus: 0.12, Slovenia: 0.16, Croatia: 0.165, Slovakia: 0.352, 'Czech Republic': 0.338,
  Poland: 0.208, Hungary: 0.13, Romania: 0.0225, Bulgaria: 0.19, Estonia: 0.338,
  Latvia: 0.24, Lithuania: 0.0177,
};

/** Eurostat comparative price levels, EU=100 (2024, approx). Higher = more expensive. */
export const PPP_INDEX: Record<string, number> = {
  Denmark: 143, Ireland: 138, Luxembourg: 135, Finland: 127, Sweden: 125,
  Netherlands: 120, France: 115, Germany: 109, Austria: 110, Belgium: 118,
  Italy: 102, Spain: 95, Portugal: 90, Greece: 88, Malta: 88, Cyprus: 92,
  Slovenia: 88, Estonia: 91, Latvia: 78, Lithuania: 75, Slovakia: 82,
  'Czech Republic': 80, Croatia: 76, Poland: 72, Hungary: 72, Romania: 60, Bulgaria: 62,
};

/** Local currency units per 1 EUR (approx 2025 avg, for conversion only). */
export const TO_EUR: Record<string, number> = {
  EUR: 1, BGN: 1.9558, CZK: 25.1, DKK: 7.46, HUF: 395, PLN: 4.31, RON: 4.97, SEK: 11.4,
};

/** EU Blue Card salary thresholds 2025, annual gross EUR (standard route, approx). */
export const BLUE_CARD: Record<string, number> = {
  Germany: 48300, France: 53700, Netherlands: 46100, Spain: 33500, Italy: 33500,
  Portugal: 33500, Ireland: 65000, Denmark: 55000, Sweden: 52000, Finland: 38000,
  Austria: 48000, Belgium: 47000, Luxembourg: 58000, Greece: 33000, Poland: 33000,
  'Czech Republic': 33000, Slovakia: 33000, Slovenia: 33000, Croatia: 33000,
  Hungary: 33000, Romania: 33000, Bulgaria: 33000, Estonia: 33000, Latvia: 33000,
  Lithuania: 33000, Cyprus: 33000, Malta: 33000,
};

/** Deterministic expat-regime effects applied on top of standard brackets. */
export interface RegimeEffect { exemptFraction: number; flatRate?: number; note: string }
export const REGIME_EFFECTS: Record<string, RegimeEffect> = {
  '30_ruling': { exemptFraction: 0.30, note: '30% of gross exempt from income tax (NL 30% ruling, simplified).' },
  beckham_law: { exemptFraction: 0, flatRate: 0.24, note: 'Flat 24% income tax up to €600k (Beckham Law, simplified).' },
  impatriati: { exemptFraction: 0.50, note: '50% of income excluded from taxable base (Italy impatriati, simplified).' },
  impatriate: { exemptFraction: 0.30, note: '30% exemption on assignment income (France impatriate, simplified).' },
  nhr: { exemptFraction: 0, flatRate: 0.20, note: 'Flat 20% on eligible income (Portugal NHR/IFIC, simplified).' },
  expert_tax: { exemptFraction: 0.25, note: '25% of income exempt (Sweden expert relief, simplified).' },
  expat_scheme: { exemptFraction: 0, flatRate: 0.27, note: 'Flat 27% + labour-market contribution (Denmark scheme, simplified).' },
  key_employee: { exemptFraction: 0, flatRate: 0.25, note: 'Flat 25% key-employee tax (Finland, simplified).' },
  sarp: { exemptFraction: 0.30, note: '30% of income over €100k disregarded (Ireland SARP, simplified).' },
  '50_exemption': { exemptFraction: 0.50, note: '50% exemption for employment income over €55k (Cyprus, simplified).' },
  '20_exemption': { exemptFraction: 0.20, note: '20% exemption (Cyprus, simplified).' },
  foreign_resident: { exemptFraction: 0.50, note: '50% exemption for relocated workers (Greece, simplified).' },
  hqp: { exemptFraction: 0, flatRate: 0.15, note: 'Flat 15% for highly qualified persons (Malta, simplified).' },
  expat_status: { exemptFraction: 0.20, note: 'Expat allowances treated favourably (Belgium, simplified 20%).' },
};

export interface CountryGuide {
  blurb: string;
  payroll: string;
  pitfalls: string;
}
export const COUNTRY_GUIDES: Record<string, CountryGuide> = {
  Germany: { blurb: 'Progressive income tax (0–45%) plus ~20.5% employee social charges. Church tax (8–9%) may apply on top in most states.', payroll: 'Monthly payroll, annual Lohnsteuerbescheinigung. 13th salary common but not statutory.', pitfalls: 'Solidarity surcharge mostly abolished for employees; splitting benefit (Ehegattensplitting) only if married.' },
  France: { blurb: 'Progressive brackets (0–45%) plus CSG/CRDS ~9.7%. Monthly PAYE (prélèvement à la source) since 2019.', payroll: '12 monthly payments; 13th month common in collective agreements.', pitfalls: 'Family quotient (quotient familial) lowers tax for families — declare spouse/children correctly.' },
  Netherlands: { blurb: 'Box 1 rates up to 49.5%. The 30% ruling is phasing to 30/20/10% bands — check 2026 status before signing.', payroll: 'Monthly salary + 8% holiday allowance paid in May.', pitfalls: 'Wealth in Box 3 is taxed separately on a deemed return.' },
  Spain: { blurb: 'State + regional rates combined (19–47%). Beckham Law offers flat 24% up to €600k for inbound workers.', payroll: '14 payments typical (double salary in summer & Christmas).', pitfalls: 'Autonomous-community rates differ by several points — select the right region/city.' },
  Italy: { blurb: 'Consolidated 3-bracket IRPEF (23/25/35%). Impatriati regime can exclude 50% of income for returnees.', payroll: '13th month (tredicesima) standard; 14th common in commerce.', pitfalls: 'Regional/municipal surcharges (up to ~3.3%) apply on top of IRPEF.' },
  Portugal: { blurb: 'Up to 9 progressive brackets (13.25–48%). NHR replaced by IFIC incentive for scientific/innovative roles.', payroll: '14 monthly payments (holiday + Christmas allowances).', pitfalls: 'Social security 11% employee + 23.75% employer is among the highest in the EU.' },
  Poland: { blurb: '12% up to 120k PLN, 32% above, with 30k PLN tax-free allowance. PPK pension adds ~2% employee cost.', payroll: 'Monthly; 13th salary common in public sector.', pitfalls: 'Health contribution (9%) is no longer deductible from tax since 2022.' },
  Austria: { blurb: 'Brackets 0–55% with full inflation indexation ("kalte Progression" abolished). 13th/14th salary taxed at a flat 6% up to caps.', payroll: '14 payments standard (holiday + Christmas bonus).', pitfalls: 'Compare annual vs monthly figures carefully — bonuses distort monthly rates.' },
  Belgium: { blurb: 'High labour taxes (25–50%) but 2026 reform phase 2 trims middle brackets. Holiday pay + 13th month standard.', payroll: '13.92 payments incl. holiday pay; monthly withholding (bedrijfsvoorheffing).', pitfalls: 'Communal taxes (up to 9%) ride on top of federal tax.' },
  Sweden: { blurb: 'Municipal ~32% + state 20% above ~598k SEK. Expert relief exempts 25% for qualifying specialists.', payroll: 'Monthly; holiday pay 12–13% of annual.', pitfalls: 'Church fee (~1%) applies unless you opt out via the tax agency.' },
  Denmark: { blurb: 'Top marginal ~56%. ATP + AM-bidrag 8% levied before income tax. Expat scheme: flat 27% for up to 7 years.', payroll: 'Monthly + 12.5% holiday allowance (feriepenge).', pitfalls: 'Deductions (befordringsfradrag, interest) materially change the result — keep receipts.' },
  Finland: { blurb: 'State 12.6–31.25% + municipal ~7–9% + Yle 2.5%. Key-employee flat 25% available.', payroll: 'Monthly + holiday bonus (lomaraha) ~50% of holiday pay.', pitfalls: 'Church tax 1–2% if you belong to a parish.' },
  Ireland: { blurb: '20% up to €44k single, 40% above. USC (0.5–8%) + PRSI 4% on top. SARP relief for assignees.', payroll: 'Monthly or 4-weekly; no statutory 13th month.', pitfalls: 'Tax credits (personal + employee ~€1,875 each) matter more than brackets.' },
  Luxembourg: { blurb: '23 progressive brackets (0–42%). Generous allowances; impatriate bonus schemes for skilled hires.', payroll: '13th month statutory for most employees.', pitfalls: 'Solidarity surcharge 7–9% of income tax funds employment measures.' },
  Greece: { blurb: '9–44% progressive. 50% exemption for foreign tax residents relocating to Greece.', payroll: '14 salaries (Easter, summer, Christmas gifts).', pitfalls: 'Solidarity levy abolished for private employees but check 2026 status.' },
  'Czech Republic': { blurb: '15% up to ~1.6M CZK, 23% above. Employee social+health ~11.6%.', payroll: 'Monthly; 13th salary common in larger firms.', pitfalls: 'Contractor (OSVČ) paušální daň can be far cheaper than employment — compare B2B.' },
  Slovakia: { blurb: '19% up to ~€47k, 25% above. High employer charges (~35%).', payroll: 'Monthly + summer/Christmas bonuses ~€500+ each.', pitfalls: 'Non-taxable allowance (~€4,900) must be claimed via annual settlement.' },
  Slovenia: { blurb: '16–45% in 5 brackets, plus ~22% employee social — one of the highest wedges in the EU.', payroll: 'Monthly + holiday allowance (regres) mandatory.', pitfalls: 'Seniority bonus (0.5%/year) compounds gross over time.' },
  Hungary: { blurb: 'Flat 15% income tax + 18.5% social — simple but family allowances change the picture a lot.', payroll: 'Monthly; 13th month spreading.', pitfalls: 'Family tax base reduction per child is significant — declare eligible children.' },
  Romania: { blurb: 'Flat 10% income tax + 35% social (pension + health + work insurance). IT workers may be exempt from income tax.', payroll: 'Monthly; no statutory 13th month.', pitfalls: 'Caps on social bases change yearly — verify CAS/CASS ceilings.' },
  Bulgaria: { blurb: 'Flat 10% — lowest in the EU — plus ~13.8% social. Simple and predictable.', payroll: 'Monthly; additional remuneration common in IT.', pitfalls: 'Max social-insurance income cap (~€2,000/mo) limits contributions.' },
  Croatia: { blurb: '20/30% brackets set by municipalities (plus optional surtax up to 18% in Zagreb).', payroll: 'Monthly + Christmas bonus (božićnica) ~€700 tax-free.', pitfalls: 'Surtax (prirez) varies by city — Zagreb vs Split differ.' },
  Estonia: { blurb: 'Flat 22% with a basic exemption that phases out. Fully digital filing in minutes.', payroll: 'Monthly; no statutory bonuses.', pitfalls: 'Exemption phase-out creates an effective hump around average wages.' },
  Latvia: { blurb: '20/23/31% progressive since 2018. Solidarity tax folded into the top rate.', payroll: 'Monthly; bonuses taxed at standard rates.', pitfalls: 'Differentiated non-taxable minimum depends on income — use annual settlement.' },
  Lithuania: { blurb: '20% up to ~€101k, 32% above. "Sodra" floor/ceiling rules matter for B2B.', payroll: 'Monthly; no statutory 13th month.', pitfalls: 'NPD (non-taxable amount) shrinks as income rises.' },
  Cyprus: { blurb: '0–35% with a generous €19.5k tax-free band. 50%/20% employment exemptions for newcomers.', payroll: '13th salary customary; 13th/14th in banking.', pitfalls: 'GHS health contribution (~2.65%) applies on top of income tax.' },
  Malta: { blurb: '0–35% with single/married/parent rate sets. HQP flat 15% for iGaming/finance specialists.', payroll: 'Monthly + statutory bonuses (~€500/yr in two parts).', pitfalls: 'Pick the right rate set (single vs parent) — differences are large.' },
};
