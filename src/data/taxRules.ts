/**
 * Deterministic EU tax rules — 2025 and 2026, single employee.
 *
 * Every figure below was re-checked against primary national sources in Nov 2026
 * (BMF, Belastingdienst, FOD Financiën, service-public/BOFiP, AEAT, Autoridade
 * Tributária, Agenzia delle Entrate, minfin/AADE, Tax Department CY, MTCA,
 * Revenue, Skatteverket, skat.dk, Vero, podatki.gov.pl, Finanční správa,
 * Finančná správa, FURS, NAV, ANAF, NRA, Porezna uprava, EMTA, VID, VMI, Sodra).
 *
 * Model (per country, per year):
 *   social    = Σ min(gross, cap) × rate  (+ progressive socialBrackets)
 *   taxBase   = gross − (social if baseExcludesSocial) − professionalDeduction − allowance
 *   tax       = progressive brackets(taxBase) − taxCredit
 *   net       = gross − social − tax
 *
 * Deliberately NOT modelled (documented in README): regional/municipal
 * surcharges that vary by locality, church tax, wealth/property taxes,
 * non-standard deductions (commuting, home office), and benefit phase-outs
 * beyond the ones encoded here.
 */

export type TaxYear = 2025 | 2026;

export const SUPPORTED_TAX_YEARS: TaxYear[] = [2025, 2026];
export const DEFAULT_TAX_YEAR: TaxYear = 2026;

export interface TaxBracket {
  /** Upper bound of this bracket on the taxable base (inclusive). Omit for the open-ended top bracket. */
  upTo?: number;
  rate: number; // 0.42 = 42 %
}

export interface SocialPart {
  rate: number;
  /** Contribution ceiling (annual). Omitted = no ceiling. */
  cap?: number;
}

export interface CountryTaxRule {
  currency: string;
  brackets: TaxBracket[];
  /** Flat personal allowance deducted from the taxable base. */
  allowance: number;
  /** Income-dependent allowance: above `start` it shrinks by `rate` per unit of gross. */
  allowanceTaper?: { start: number; rate: number };
  /** Allowance only applies up to this gross income (e.g. Romania's personal deduction). */
  allowanceMaxIncome?: number;
  /** Proportional professional-expense deduction (e.g. France 10 %). */
  deductionRate?: number;
  deductionCap?: number;
  /** Employee contributions. Multiple parts = different ceilings (health vs pension). */
  socialParts: SocialPart[];
  /** Progressive social charge on gross (e.g. Irish USC). */
  socialBrackets?: TaxBracket[];
  /** True when the income-tax base is gross minus employee social contributions. */
  baseExcludesSocial?: boolean;
  /**
   * Share of the employee contributions that is deductible when only part of them is
   * (Poland: ZUS is deductible, the 9 % health contribution is not).
   */
  deductibleSocialShare?: number;
  /** Flat credit subtracted from the computed income tax (personal/PAYE credits). */
  taxCredit?: number;
  /** Credit phase-out: above `over`, the credit drops by `rate` per unit of gross. */
  creditTaper?: { over: number; rate: number };
  /**
   * Credit schedule (gross income → total credit), linearly interpolated. Used where the
   * statutory credit rises and then phases out (NL heffingskortingen: general + labour).
   * Overrides taxCredit / creditTaper when present.
   */
  creditSchedule?: Array<{ upTo: number; amount: number }>;
  /** Income tax + social at the top, for the heat map / comparisons. */
  effectiveTopRate: number;
  notesEn?: string;
}

const LU_LADDER = (): TaxBracket[] => {
  // Luxembourg class-1 scale (unchanged for 2025 and 2026): 0 % up to 13,230,
  // then 8–12 % steps of 2,205, then 14–38 % in thirteen 2,205 steps to 52,920.
  const b: TaxBracket[] = [
    { upTo: 13230, rate: 0 },
    { upTo: 15435, rate: 0.08 },
    { upTo: 17640, rate: 0.09 },
    { upTo: 19845, rate: 0.1 },
    { upTo: 22050, rate: 0.11 },
    { upTo: 24255, rate: 0.12 },
  ];
  let upper = 24255;
  for (let r = 14; r <= 38; r += 2) {
    upper += 2205;
    b.push({ upTo: upper, rate: r / 100 });
  }
  b.push({ upTo: 54090, rate: 0.38 });
  b.push({ upTo: 117450, rate: 0.39 });
  b.push({ upTo: 176160, rate: 0.4 });
  b.push({ upTo: 234870, rate: 0.41 });
  b.push({ rate: 0.42 });
  return b;
};

export const TAX_RULES_BY_YEAR: Record<TaxYear, Record<string, CountryTaxRule>> = {
  // ─────────────────────────────── 2026 ───────────────────────────────
  2026: {
    // DE 2026 (§32a EStG): Grundfreibetrag 12,348. The progressive zone is
    // quadratic; it is fitted with six linear slices (max deviation ≈0.2 %).
    Germany: {
      currency: 'EUR',
      allowance: 12348,
      brackets: [
        { upTo: 5451, rate: 0.19 },
        { upTo: 14131.67, rate: 0.2554 },
        { upTo: 22811.33, rate: 0.2869 },
        { upTo: 31491, rate: 0.3184 },
        { upTo: 40170.67, rate: 0.3498 },
        { upTo: 48850.33, rate: 0.3813 },
        { upTo: 57530, rate: 0.4127 },
        { upTo: 265477, rate: 0.42 },
        { rate: 0.45 },
      ],
      // KV+PV 10.85 % (7.00 + 1.45 avg. Zusatzbeitrag + 2.40 PV) capped 69,750;
      // RV 9.30 % + ALV 1.30 % capped 101,400.
      socialParts: [{ rate: 0.1085, cap: 69750 }, { rate: 0.106, cap: 101400 }],
      effectiveTopRate: 45,
      notesEn: 'Health/care cap €69,750, pension/unemployment cap €101,400. Saxony care split differs.',
    },
    // AT 2026: BMF Tarifstufen (indexed); employee social 18.07 %, ceiling 6,930×14 = 97,020.
    Austria: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 13539, rate: 0 },
        { upTo: 21992, rate: 0.2 },
        { upTo: 36458, rate: 0.3 },
        { upTo: 70365, rate: 0.4 },
        { upTo: 104859, rate: 0.48 },
        { upTo: 1000000, rate: 0.5 },
        { rate: 0.55 },
      ],
      socialParts: [{ rate: 0.1807, cap: 97020 }],
      effectiveTopRate: 55,
    },
    // NL 2026: Box 1 income tax 8.10 / 37.56 / 49.5; national insurance 27.65 % capped 38,883.
    // General tax credit €3,115 (phases out above €24,813 — not modelled).
    Netherlands: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 38883, rate: 0.081 },
        { upTo: 78426, rate: 0.3756 },
        { rate: 0.495 },
      ],
      socialParts: [{ rate: 0.2765, cap: 38883 }],
      // Algemene heffingskorting (3,115, phasing out at 6.63 % above 24,813) plus
      // arbeidskorting (max 5,599, phasing out at 6.51 % above 43,071).
      creditSchedule: [
        { upTo: 12169, amount: 4088 },
        { upTo: 26288, amount: 8226 },
        { upTo: 43071, amount: 7504 },
        { upTo: 60000, amount: 5279 },
        { upTo: 71797, amount: 3729 },
        { upTo: 78426, amount: 3297 },
        { upTo: 100000, amount: 1893 },
        { upTo: 129078, amount: 0 },
      ],
      effectiveTopRate: 49.5,
      notesEn: 'Combined first-bracket burden 35.75 %. Credits include arbeidskorting. Employee insurances (WW/WIA) are employer-paid.',
    },
    // BE 2026 (income year 2026): brackets 16,720 / 29,510 / 51,070. The tax-free sum
    // (11,550) is a tax *credit* at 25 % — it must not be deducted from the base.
    Belgium: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 16720, rate: 0.25 },
        { upTo: 29510, rate: 0.4 },
        { upTo: 51070, rate: 0.45 },
        { rate: 0.5 },
      ],
      socialParts: [{ rate: 0.1307 }],
      baseExcludesSocial: true,
      taxCredit: 2888,
      effectiveTopRate: 53,
      notesEn: 'Tax-free sum counted as a 25 % credit (2,887.50). Municipal surcharges (0–9 %) not modelled.',
    },
    Luxembourg: {
      currency: 'EUR',
      allowance: 0,
      brackets: LU_LADDER(),
      socialParts: [{ rate: 0.1295, cap: 162224 }],
      baseExcludesSocial: true,
      effectiveTopRate: 45,
    },
    // FR 2026 (revenus 2025): barème 11,600 / 29,579 / 84,577 / 181,917.
    // 10 % abattement capped at 14,555; employee contributions ≈ 21 %.
    France: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 11600, rate: 0 },
        { upTo: 29579, rate: 0.11 },
        { upTo: 84577, rate: 0.3 },
        { upTo: 181917, rate: 0.41 },
        { rate: 0.45 },
      ],
      deductionRate: 0.1,
      deductionCap: 14555,
      socialParts: [{ rate: 0.069, cap: 48060 }, { rate: 0.1405 }],
      baseExcludesSocial: true,
      effectiveTopRate: 55,
      notesEn: 'CSG/CRDS 9.53 %, pension 7.3 % (capped at the PASS €48,060), Agirc-Arrco ≈ 4 %.',
    },
    // ES: state + regional combined 19–47 %; mínimo personal 5,550; employee 6.50 % (incl. MEI), cap 61,214.
    Spain: {
      currency: 'EUR',
      allowance: 5550,
      brackets: [
        { upTo: 12450, rate: 0.19 },
        { upTo: 20200, rate: 0.24 },
        { upTo: 35200, rate: 0.3 },
        { upTo: 60000, rate: 0.37 },
        { upTo: 300000, rate: 0.45 },
        { rate: 0.47 },
      ],
      socialParts: [{ rate: 0.065, cap: 61214 }],
      effectiveTopRate: 50,
      notesEn: 'Regional scales differ; 19–47 % is the national + average regional combination.',
    },
    // PT 2026 (DL 212/2026): 12.2 → 48 %; specific deduction €4,587; social 11 % uncapped.
    Portugal: {
      currency: 'EUR',
      allowance: 4587,
      brackets: [
        { upTo: 8342, rate: 0.122 },
        { upTo: 12587, rate: 0.152 },
        { upTo: 17838, rate: 0.207 },
        { upTo: 23089, rate: 0.236 },
        { upTo: 29397, rate: 0.306 },
        { upTo: 43090, rate: 0.346 },
        { upTo: 46566, rate: 0.431 },
        { upTo: 86634, rate: 0.446 },
        { rate: 0.48 },
      ],
      socialParts: [{ rate: 0.11 }],
      effectiveTopRate: 53,
      notesEn: 'Mínimo de existência and regional surtaxes not modelled.',
    },
    // IT 2026: 23 / 33 / 43 (Legge 199/2025 lowered the middle rate to 33 %).
    Italy: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 28000, rate: 0.23 },
        { upTo: 50000, rate: 0.33 },
        { rate: 0.43 },
      ],
      socialParts: [{ rate: 0.0919, cap: 122295 }],
      // Contributi previdenziali are deductible from the IRPEF base (art. 10 TUIR).
      baseExcludesSocial: true,
      effectiveTopRate: 52,
      notesEn: 'Regional (1.23–3.33 %) and municipal surcharges not modelled; +1 % above €56,224 and the lavoro-dipendente detrazione not modelled.',
    },
    // GR 2026 (Law 5246/2025): 9 / 20 / 26 / 34 / 39 / 44 with a €777 credit tapering above €12,000.
    Greece: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 10000, rate: 0.09 },
        { upTo: 20000, rate: 0.2 },
        { upTo: 30000, rate: 0.26 },
        { upTo: 40000, rate: 0.34 },
        { upTo: 60000, rate: 0.39 },
        { rate: 0.44 },
      ],
      socialParts: [{ rate: 0.1337, cap: 108667 }],
      taxCredit: 777,
      creditTaper: { over: 12000, rate: 0.02 },
      effectiveTopRate: 52,
    },
    // CY 2026 reform: tax-free 22,000; 20 / 25 / 30 / 35. Social 8.8 % (cap 68,904) + GHS 2.65 % (cap 180,000).
    Cyprus: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 22000, rate: 0 },
        { upTo: 32000, rate: 0.2 },
        { upTo: 42000, rate: 0.25 },
        { upTo: 72000, rate: 0.3 },
        { rate: 0.35 },
      ],
      socialParts: [{ rate: 0.088, cap: 68904 }, { rate: 0.0265, cap: 180000 }],
      effectiveTopRate: 38,
    },
    // MT 2026 (single): 0 up to 12,000; 15 / 25 / 35. Class 1 contribution caps at ≈€2,908/yr.
    Malta: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 12000, rate: 0 },
        { upTo: 16000, rate: 0.15 },
        { upTo: 60000, rate: 0.25 },
        { rate: 0.35 },
      ],
      socialParts: [{ rate: 0.1, cap: 29080 }],
      effectiveTopRate: 42,
      notesEn: 'Class 1 contributions are a flat weekly cap (10 % up to the ceiling).',
    },
    // SE 2026: municipal 32.38 %, state 20 % above skiktgräns 643,000 (taxable).
    // The 7 % allmän pensionsavgift is 100 % offset by a tax reduction → no net charge.
    Sweden: {
      currency: 'SEK',
      allowance: 17400,
      brackets: [
        { upTo: 643000, rate: 0.3238 },
        { rate: 0.5238 },
      ],
      socialParts: [],
      effectiveTopRate: 55,
      notesEn: 'Grundavdrag is income-dependent (min. 17,400). The 7 % pension contribution is fully credited back.',
    },
    // DK 2026: AM 8 %; personfradrag 54,100; bundskat 12.01 + municipal 25.049;
    // mellemskat 7.5 % above 641,200; topskat 7.5 % above 777,900; toptopskat 5 % above 2,592,700.
    Denmark: {
      currency: 'DKK',
      allowance: 54100,
      brackets: [
        { upTo: 641200, rate: 0.3706 },
        { upTo: 777900, rate: 0.4456 },
        { upTo: 2592700, rate: 0.5206 },
        { rate: 0.5706 },
      ],
      socialParts: [{ rate: 0.08 }],
      baseExcludesSocial: true,
      effectiveTopRate: 60,
      notesEn: 'Municipal rate is local (avg. 25.05 %). ATP ≈ DKK 99/month not modelled.',
    },
    // FI 2026: state scale (top steps removed) + municipal 7.60 % combined here;
    // employee contributions 7.30 (TyEL) + 0.89 (unemployment) + 1.10 + 0.88 (health) = 10.17 %.
    Finland: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 22000, rate: 0.2024 },
        { upTo: 32600, rate: 0.266 },
        { upTo: 40100, rate: 0.3785 },
        { upTo: 52100, rate: 0.4085 },
        { rate: 0.451 },
      ],
      socialParts: [{ rate: 0.1017 }],
      effectiveTopRate: 51,
      notesEn: 'Municipal rate varies 4.7–10.9 % (7.60 % average used). Basic deduction not modelled.',
    },
    // IE 2026: 20 % to €44,000, 40 % above; credits €2,000 personal + €2,000 PAYE;
    // PRSI 4.2 % + USC (0.5 / 2 / 3 / 8).
    Ireland: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 44000, rate: 0.2 },
        { rate: 0.4 },
      ],
      socialParts: [{ rate: 0.042 }],
      socialBrackets: [
        { upTo: 12012, rate: 0.005 },
        { upTo: 28700, rate: 0.02 },
        { upTo: 70044, rate: 0.03 },
        { rate: 0.08 },
      ],
      taxCredit: 4000,
      effectiveTopRate: 48,
      notesEn: 'USC and PRSI modelled separately; PRSI rises to 4.35 % from Oct 2026.',
    },
    // PL 2026: 12 % to 120,000 PLN (30,000 allowance), 32 % above.
    // ZUS 13.71 % capped 282,600; health 9 % of (gross − ZUS) ≈ 7.77 % of gross.
    Poland: {
      currency: 'PLN',
      allowance: 0,
      brackets: [
        { upTo: 30000, rate: 0 },
        { upTo: 120000, rate: 0.12 },
        { rate: 0.32 },
      ],
      socialParts: [{ rate: 0.1371, cap: 282600 }, { rate: 0.0777 }],
      deductibleSocialShare: 0.1371 / (0.1371 + 0.0777),
      effectiveTopRate: 39,
      notesEn: 'Only ZUS (13.71 %) is deductible; the 9 % health contribution is not. Tax-free 30,000 PLN modelled as a 0 % band.',
    },
    // CZ 2026: 15 % to 1,762,812 CZK (36× avg. wage), 23 % above; credit 30,840 CZK.
    // Social 7.1 % capped 2,350,416; health 4.5 % uncapped.
    'Czech Republic': {
      currency: 'CZK',
      allowance: 0,
      brackets: [
        { upTo: 1762812, rate: 0.15 },
        { rate: 0.23 },
      ],
      socialParts: [{ rate: 0.065, cap: 2350416 }, { rate: 0.045 }],
      taxCredit: 30840,
      effectiveTopRate: 30,
    },
    // SK 2026: 19 / 25 / 30 / 35 with thresholds 43,983.32 / 60,349.21 / 75,010.32.
    // Allowance tapers as 14,661.11 − ⅓ × base; social 9.4 % (cap 201,168) + health 5 %.
    Slovakia: {
      currency: 'EUR',
      allowance: 5966.73,
      allowanceTaper: { start: 26083.13, rate: 1 / 3 },
      brackets: [
        { upTo: 43983.32, rate: 0.19 },
        { upTo: 60349.21, rate: 0.25 },
        { upTo: 75010.32, rate: 0.3 },
        { rate: 0.35 },
      ],
      socialParts: [{ rate: 0.094, cap: 201168 }, { rate: 0.05 }],
      baseExcludesSocial: true,
      effectiveTopRate: 38,
    },
    // SI 2026: 16 / 26 / 33 / 39 / 50 with general allowance 5,551.93; social 23.10 %, no ceiling.
    Slovenia: {
      currency: 'EUR',
      allowance: 5551.93,
      brackets: [
        { upTo: 9721.43, rate: 0.16 },
        { upTo: 28592.44, rate: 0.26 },
        { upTo: 57184.88, rate: 0.33 },
        { upTo: 82346.23, rate: 0.39 },
        { rate: 0.5 },
      ],
      socialParts: [{ rate: 0.231 }],
      baseExcludesSocial: true,
      effectiveTopRate: 55,
      notesEn: 'Additional low-income allowance and the flat €39.36/month OZP not modelled.',
    },
    Hungary: {
      currency: 'HUF',
      allowance: 0,
      brackets: [{ rate: 0.15 }],
      socialParts: [{ rate: 0.185 }],
      effectiveTopRate: 33.5,
      notesEn: 'Flat 15 % on gross (the 18.5 % contribution is not deductible); family/under-25 base allowances not modelled.',
    },
    // RO 2026: 10 % on gross − CAS 25 % − CASS 10 %; personal deduction 20 % of the
    // minimum wage (≈865 lei/month) only up to minimum wage + 2,000 lei.
    Romania: {
      currency: 'RON',
      allowance: 10380,
      allowanceMaxIncome: 75900,
      brackets: [{ rate: 0.1 }],
      socialParts: [{ rate: 0.35 }],
      baseExcludesSocial: true,
      effectiveTopRate: 45,
    },
    // BG 2026: euro area member since 1 Jan 2026 (fixed 1.95583 BGN/EUR).
    // 10 % flat on gross − 13.78 % contributions; max insurable income €2,300/month.
    Bulgaria: {
      currency: 'EUR',
      allowance: 0,
      brackets: [{ rate: 0.1 }],
      socialParts: [{ rate: 0.1378, cap: 26281 }],
      baseExcludesSocial: true,
      effectiveTopRate: 24,
    },
    // HR 2026: 20 % to €60,000, 30 % above; allowance €600/month; pension 20 % (cap €143,496).
    Croatia: {
      currency: 'EUR',
      allowance: 7200,
      brackets: [
        { upTo: 60000, rate: 0.2 },
        { rate: 0.3 },
      ],
      socialParts: [{ rate: 0.2, cap: 143496 }],
      baseExcludesSocial: true,
      effectiveTopRate: 44,
      notesEn: 'Municipal rates range 15–23 % / 25–33 %; 20/30 is the default when none is set.',
    },
    // EE 2026: 22 % flat, basic exemption €700/month (8,400) without taper.
    Estonia: {
      currency: 'EUR',
      allowance: 8400,
      brackets: [{ rate: 0.22 }],
      socialParts: [{ rate: 0.036 }],
      effectiveTopRate: 26,
      notesEn: 'Employee pays 1.6 % unemployment + 2 % funded pension; social tax is employer-paid.',
    },
    // LV 2026: 25.5 % to 105,300; 33 % to 200,000; 36 % above; non-taxable minimum €550/month.
    Latvia: {
      currency: 'EUR',
      allowance: 6600,
      brackets: [
        { upTo: 105300, rate: 0.255 },
        { upTo: 200000, rate: 0.33 },
        { rate: 0.36 },
      ],
      socialParts: [{ rate: 0.105, cap: 105300 }],
      effectiveTopRate: 40,
    },
    // LT 2026: 20 % to 83,237.40; 25 % to 138,729; 32 % above.
    // NPD = 747/month tapering; VSD 12.52 % capped, health 6.98 % uncapped.
    Lithuania: {
      currency: 'EUR',
      allowance: 8964,
      allowanceTaper: { start: 13836, rate: 0.49 },
      brackets: [
        { upTo: 83237.4, rate: 0.2 },
        { upTo: 138729, rate: 0.25 },
        { rate: 0.32 },
      ],
      socialParts: [{ rate: 0.1252, cap: 138729 }, { rate: 0.0698 }],
      effectiveTopRate: 42,
    },
  },

  // ─────────────────────────────── 2025 ───────────────────────────────
  2025: {
    // DE 2025: Grundfreibetrag 12,096; zone 3 quadratic (fitted with six slices, max deviation ≈0.3 %).
    Germany: {
      currency: 'EUR',
      allowance: 12096,
      brackets: [
        { upTo: 5347, rate: 0.19 },
        { upTo: 13854, rate: 0.2551 },
        { upTo: 22360, rate: 0.2859 },
        { upTo: 30866, rate: 0.3168 },
        { upTo: 39372, rate: 0.3476 },
        { upTo: 47878, rate: 0.3784 },
        { upTo: 56384, rate: 0.4092 },
        { upTo: 265729, rate: 0.42 },
        { rate: 0.45 },
      ],
      socialParts: [{ rate: 0.1065, cap: 66150 }, { rate: 0.106, cap: 96600 }],
      effectiveTopRate: 45,
      notesEn: 'Health/care cap €66,150, pension/unemployment cap €96,600.',
    },
    Austria: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 13308, rate: 0 },
        { upTo: 21617, rate: 0.2 },
        { upTo: 35836, rate: 0.3 },
        { upTo: 69166, rate: 0.4 },
        { upTo: 103072, rate: 0.48 },
        { upTo: 1000000, rate: 0.5 },
        { rate: 0.55 },
      ],
      socialParts: [{ rate: 0.1807, cap: 90300 }],
      effectiveTopRate: 55,
    },
    Netherlands: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 38441, rate: 0.0817 },
        { upTo: 76817, rate: 0.3748 },
        { rate: 0.495 },
      ],
      socialParts: [{ rate: 0.2765, cap: 38441 }],
      creditSchedule: [
        { upTo: 12169, amount: 4335 },
        { upTo: 26288, amount: 8473 },
        { upTo: 43071, amount: 7751 },
        { upTo: 60000, amount: 5526 },
        { upTo: 75519, amount: 3487 },
        { upTo: 100000, amount: 1893 },
        { upTo: 129077, amount: 0 },
      ],
      effectiveTopRate: 49.5,
      notesEn: 'Combined first-bracket burden 35.82 %. Credits include arbeidskorting.',
    },
    Belgium: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 16320, rate: 0.25 },
        { upTo: 28800, rate: 0.4 },
        { upTo: 49840, rate: 0.45 },
        { rate: 0.5 },
      ],
      socialParts: [{ rate: 0.1307 }],
      baseExcludesSocial: true,
      taxCredit: 2728,
      effectiveTopRate: 53,
      notesEn: 'Tax-free sum 10,910 counted as a 25 % credit (2,727.50).',
    },
    Luxembourg: {
      currency: 'EUR',
      allowance: 0,
      brackets: LU_LADDER(),
      socialParts: [{ rate: 0.1245, cap: 162224 }],
      baseExcludesSocial: true,
      effectiveTopRate: 45,
    },
    // FR 2025 (revenus 2024): 11,497 / 29,315 / 83,823 / 180,294; abattement cap 14,171.
    France: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 11497, rate: 0 },
        { upTo: 29315, rate: 0.11 },
        { upTo: 83823, rate: 0.3 },
        { upTo: 180294, rate: 0.41 },
        { rate: 0.45 },
      ],
      deductionRate: 0.1,
      deductionCap: 14171,
      socialParts: [{ rate: 0.069, cap: 47100 }, { rate: 0.1405 }],
      baseExcludesSocial: true,
      effectiveTopRate: 55,
    },
    Spain: {
      currency: 'EUR',
      allowance: 5550,
      brackets: [
        { upTo: 12450, rate: 0.19 },
        { upTo: 20200, rate: 0.24 },
        { upTo: 35200, rate: 0.3 },
        { upTo: 60000, rate: 0.37 },
        { upTo: 300000, rate: 0.45 },
        { rate: 0.47 },
      ],
      socialParts: [{ rate: 0.0648, cap: 58914 }],
      effectiveTopRate: 50,
    },
    // PT 2025: 12.5 → 48 % (Lei 33/2024); specific deduction €4,462.15.
    Portugal: {
      currency: 'EUR',
      allowance: 4462,
      brackets: [
        { upTo: 8059, rate: 0.125 },
        { upTo: 12160, rate: 0.165 },
        { upTo: 17233, rate: 0.22 },
        { upTo: 22306, rate: 0.25 },
        { upTo: 28400, rate: 0.32 },
        { upTo: 41629, rate: 0.355 },
        { upTo: 44987, rate: 0.436 },
        { upTo: 83696, rate: 0.455 },
        { rate: 0.48 },
      ],
      socialParts: [{ rate: 0.11 }],
      effectiveTopRate: 53,
    },
    // IT 2025: 23 / 35 / 43.
    Italy: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 28000, rate: 0.23 },
        { upTo: 50000, rate: 0.35 },
        { rate: 0.43 },
      ],
      socialParts: [{ rate: 0.0919, cap: 120607 }],
      baseExcludesSocial: true,
      effectiveTopRate: 52,
    },
    // GR 2025: 9 / 22 / 28 / 36 / 44.
    Greece: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 10000, rate: 0.09 },
        { upTo: 20000, rate: 0.22 },
        { upTo: 30000, rate: 0.28 },
        { upTo: 40000, rate: 0.36 },
        { rate: 0.44 },
      ],
      socialParts: [{ rate: 0.1337, cap: 106017 }],
      taxCredit: 777,
      creditTaper: { over: 12000, rate: 0.02 },
      effectiveTopRate: 52,
    },
    Cyprus: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 19500, rate: 0 },
        { upTo: 28000, rate: 0.2 },
        { upTo: 36300, rate: 0.25 },
        { upTo: 60000, rate: 0.3 },
        { rate: 0.35 },
      ],
      socialParts: [{ rate: 0.088, cap: 66612 }, { rate: 0.0265, cap: 180000 }],
      effectiveTopRate: 38,
    },
    Malta: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 12000, rate: 0 },
        { upTo: 16000, rate: 0.15 },
        { upTo: 60000, rate: 0.25 },
        { rate: 0.35 },
      ],
      socialParts: [{ rate: 0.1, cap: 28300 }],
      effectiveTopRate: 42,
    },
    Sweden: {
      currency: 'SEK',
      allowance: 17300,
      brackets: [
        { upTo: 625800, rate: 0.3255 },
        { rate: 0.5255 },
      ],
      socialParts: [],
      effectiveTopRate: 55,
      notesEn: 'Municipal average 32.55 %; state 20 % above skiktgräns 625,800.',
    },
    Denmark: {
      currency: 'DKK',
      allowance: 51600,
      brackets: [
        { upTo: 611800, rate: 0.3702 },
        { rate: 0.5207 },
      ],
      socialParts: [{ rate: 0.08 }],
      baseExcludesSocial: true,
      effectiveTopRate: 60,
    },
    // FI 2025: state scale + municipal 7.54 %; contributions 7.15 + 0.59 + 1.06 + 0.84.
    Finland: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 21200, rate: 0.2018 },
        { upTo: 31500, rate: 0.2654 },
        { upTo: 52100, rate: 0.3779 },
        { upTo: 88200, rate: 0.4154 },
        { upTo: 150000, rate: 0.4929 },
        { rate: 0.5179 },
      ],
      socialParts: [{ rate: 0.0964 }],
      effectiveTopRate: 51,
    },
    Ireland: {
      currency: 'EUR',
      allowance: 0,
      brackets: [
        { upTo: 44000, rate: 0.2 },
        { rate: 0.4 },
      ],
      socialParts: [{ rate: 0.041 }],
      socialBrackets: [
        { upTo: 12012, rate: 0.005 },
        { upTo: 27382, rate: 0.02 },
        { upTo: 70044, rate: 0.03 },
        { rate: 0.08 },
      ],
      taxCredit: 4000,
      effectiveTopRate: 48,
    },
    Poland: {
      currency: 'PLN',
      allowance: 0,
      brackets: [
        { upTo: 30000, rate: 0 },
        { upTo: 120000, rate: 0.12 },
        { rate: 0.32 },
      ],
      socialParts: [{ rate: 0.1371, cap: 260190 }, { rate: 0.0777 }],
      deductibleSocialShare: 0.1371 / (0.1371 + 0.0777),
      effectiveTopRate: 39,
    },
    'Czech Republic': {
      currency: 'CZK',
      allowance: 0,
      brackets: [
        { upTo: 1676052, rate: 0.15 },
        { rate: 0.23 },
      ],
      socialParts: [{ rate: 0.065, cap: 2234736 }, { rate: 0.045 }],
      taxCredit: 30840,
      effectiveTopRate: 30,
    },
    Slovakia: {
      currency: 'EUR',
      allowance: 5753.79,
      allowanceTaper: { start: 25426.27, rate: 0.25 },
      brackets: [
        { upTo: 48441.43, rate: 0.19 },
        { rate: 0.25 },
      ],
      socialParts: [{ rate: 0.094, cap: 201168 }, { rate: 0.04 }],
      baseExcludesSocial: true,
      effectiveTopRate: 38,
    },
    Slovenia: {
      currency: 'EUR',
      allowance: 5260,
      brackets: [
        { upTo: 9210.26, rate: 0.16 },
        { upTo: 27089, rate: 0.26 },
        { upTo: 54178, rate: 0.33 },
        { upTo: 78016.32, rate: 0.39 },
        { rate: 0.5 },
      ],
      socialParts: [{ rate: 0.231 }],
      baseExcludesSocial: true,
      effectiveTopRate: 55,
    },
    Hungary: {
      currency: 'HUF',
      allowance: 0,
      brackets: [{ rate: 0.15 }],
      socialParts: [{ rate: 0.185 }],
      effectiveTopRate: 33.5,
    },
    Romania: {
      currency: 'RON',
      allowance: 9720,
      allowanceMaxIncome: 72600,
      brackets: [{ rate: 0.1 }],
      socialParts: [{ rate: 0.35 }],
      baseExcludesSocial: true,
      effectiveTopRate: 45,
    },
    // BG 2025: still BGN (lev), fixed conversion 1.95583 per euro.
    Bulgaria: {
      currency: 'BGN',
      allowance: 0,
      brackets: [{ rate: 0.1 }],
      socialParts: [{ rate: 0.1378, cap: 49560 }],
      baseExcludesSocial: true,
      effectiveTopRate: 24,
    },
    Croatia: {
      currency: 'EUR',
      allowance: 7200,
      brackets: [
        { upTo: 60000, rate: 0.2 },
        { rate: 0.3 },
      ],
      socialParts: [{ rate: 0.2, cap: 129456 }],
      baseExcludesSocial: true,
      effectiveTopRate: 44,
    },
    // EE 2025: 22 % flat, basic exemption €654/month tapering out above €25,200.
    Estonia: {
      currency: 'EUR',
      allowance: 7848,
      allowanceTaper: { start: 14400, rate: 7848 / 10800 },
      brackets: [{ rate: 0.22 }],
      socialParts: [{ rate: 0.036 }],
      effectiveTopRate: 26,
    },
    Latvia: {
      currency: 'EUR',
      allowance: 6120,
      brackets: [
        { upTo: 105300, rate: 0.255 },
        { upTo: 200000, rate: 0.33 },
        { rate: 0.36 },
      ],
      socialParts: [{ rate: 0.105, cap: 105300 }],
      effectiveTopRate: 40,
    },
    Lithuania: {
      currency: 'EUR',
      allowance: 8964,
      allowanceTaper: { start: 13836, rate: 0.49 },
      brackets: [
        { upTo: 126532.8, rate: 0.2 },
        { rate: 0.32 },
      ],
      socialParts: [{ rate: 0.1252, cap: 126532.8 }, { rate: 0.0698 }],
      effectiveTopRate: 42,
    },
  },
};

export function rulesFor(country: string, year?: number): CountryTaxRule | undefined {
  const y = (SUPPORTED_TAX_YEARS as number[]).includes(year ?? -1) ? (year as TaxYear) : DEFAULT_TAX_YEAR;
  return TAX_RULES_BY_YEAR[y][country];
}

/** Current-year table, for heat maps, guides and comparisons. */
export const TAX_RULES_CURRENT = TAX_RULES_BY_YEAR[DEFAULT_TAX_YEAR];

function allowanceOf(rule: CountryTaxRule, gross: number): number {
  if (rule.allowanceMaxIncome !== undefined && gross > rule.allowanceMaxIncome) return 0;
  if (!rule.allowanceTaper) return rule.allowance;
  const { start, rate } = rule.allowanceTaper;
  if (gross <= start) return rule.allowance;
  return Math.max(0, rule.allowance - rate * (gross - start));
}

function progressive(base: number, brackets: TaxBracket[]): number {
  let remaining = base;
  let lower = 0;
  let total = 0;
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity;
    const slice = Math.min(remaining, upper - lower);
    if (slice <= 0) {
      lower = upper;
      continue;
    }
    total += slice * b.rate;
    remaining -= slice;
    lower = upper;
    if (remaining <= 0) break;
  }
  return total;
}

export function socialSecurityOf(country: string, annualGross: number, year?: number): number {
  const rule = rulesFor(country, year);
  if (!rule) return annualGross * 0.12;
  let social = 0;
  for (const part of rule.socialParts) {
    social += Math.min(annualGross, part.cap ?? Infinity) * part.rate;
  }
  if (rule.socialBrackets) social += progressive(annualGross, rule.socialBrackets);
  return social;
}

/** Taxable base: gross minus (social where deductible) minus professional deduction minus allowance. */
export function taxableBaseOf(country: string, annualGross: number, year?: number): number {
  const rule = rulesFor(country, year);
  if (!rule) return Math.max(0, annualGross);
  const social = rule.baseExcludesSocial || rule.deductibleSocialShare !== undefined
    ? socialSecurityOf(country, annualGross, year) * (rule.deductibleSocialShare ?? 1)
    : 0;
  const incomeAfterSocial = Math.max(0, annualGross - social);
  const deduction = rule.deductionRate
    ? Math.min(incomeAfterSocial * rule.deductionRate, rule.deductionCap ?? Infinity)
    : 0;
  return Math.max(0, incomeAfterSocial - deduction - allowanceOf(rule, annualGross));
}

/** Income tax on an already-computed taxable base (used by parts-based systems). */
export function incomeTaxFromBase(country: string, base: number, annualGross: number, year?: number): number {
  const rule = rulesFor(country, year);
  if (!rule) return base * 0.22;
  let tax = progressive(Math.max(0, base), rule.brackets);
  const credit = creditAt(rule, annualGross);
  if (credit > 0) tax = Math.max(0, tax - credit);
  return tax;
}

/** Total tax credit for a gross income (flat, tapered or piecewise-scheduled). */
export function creditAt(rule: CountryTaxRule, annualGross: number): number {
  if (rule.creditSchedule && rule.creditSchedule.length > 0) {
    const pts = rule.creditSchedule;
    if (annualGross <= 0) return 0;
    if (annualGross >= pts[pts.length - 1].upTo) return pts[pts.length - 1].amount;
    let prevX = 0;
    let prevY = 0;
    for (const p of pts) {
      if (annualGross <= p.upTo) {
        const span = p.upTo - prevX;
        const t = span === 0 ? 1 : (annualGross - prevX) / span;
        return prevY + (p.amount - prevY) * t;
      }
      prevX = p.upTo;
      prevY = p.amount;
    }
    return prevY;
  }
  if (!rule.taxCredit) return 0;
  let credit = rule.taxCredit;
  if (rule.creditTaper) {
    credit = Math.max(0, credit - Math.max(0, annualGross - rule.creditTaper.over) * rule.creditTaper.rate);
  }
  return credit;
}

/** Income tax for a gross salary (social-aware base). */
export function incomeTaxOn(country: string, annualGross: number, year?: number): number {
  return incomeTaxFromBase(country, taxableBaseOf(country, annualGross, year), annualGross, year);
}

/** Bracket rows for a taxable base, labelled on the gross-income scale. */
export function taxBreakdownFromBase(
  country: string,
  base: number,
  annualGross: number,
  year?: number,
): { bracket: string; rate: string; amount: number }[] {
  const rule = rulesFor(country, year);
  if (!rule) return [];
  const offset = annualGross - base;
  let remaining = base;
  let lower = 0;
  const rows: { bracket: string; rate: string; amount: number }[] = [];
  for (const b of rule.brackets) {
    const upper = b.upTo ?? Infinity;
    const slice = Math.min(remaining, upper - lower);
    if (slice <= 0) {
      lower = upper;
      continue;
    }
    if (b.rate > 0 && slice > 1) {
      rows.push({
        bracket: upper === Infinity ? `${fmt(lower + offset)}+` : `${fmt(lower + offset)} – ${fmt(upper + offset)}`,
        rate: `${(b.rate * 100).toFixed((b.rate * 100) % 1 ? 2 : 0)}%`,
        amount: Math.round(slice * b.rate),
      });
    }
    remaining -= slice;
    lower = upper;
    if (remaining <= 0) break;
  }
  return rows;
}

export function calculateDeterministic(
  country: string,
  annualGross: number,
  year?: number,
): { incomeTax: number; socialSecurity: number; net: number; breakdown: { bracket: string; rate: string; amount: number }[] } {
  const rule = rulesFor(country, year);
  if (!rule) {
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

  const base = taxableBaseOf(country, annualGross, year);
  const social = socialSecurityOf(country, annualGross, year);
  let incomeTax = progressive(base, rule.brackets);
  const breakdown = taxBreakdownFromBase(country, base, annualGross, year);
  if (rule.taxCredit || rule.creditSchedule) {
    const raw = incomeTax;
    incomeTax = incomeTaxFromBase(country, base, annualGross, year);
    const credit = Math.round(raw - incomeTax);
    if (credit > 1) breakdown.push({ bracket: 'Tax credits (personal / employment)', rate: '−', amount: -credit });
  }

  return {
    incomeTax: Math.round(incomeTax),
    socialSecurity: Math.round(social),
    net: Math.round(annualGross - incomeTax - social),
    breakdown,
  };
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
