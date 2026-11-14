/**
 * Offline invariant + official spot-check harness for the deterministic tax engine.
 * Run: npm run verify-taxes
 *
 * Anchors are values computed *by hand from the official tariff texts* (not from
 * this code): German §32a formula, Austrian Tarifstufen, Dutch Box 1 + heffingskorting,
 * French barème + 10 % abattement, etc. If the engine drifts, these fail.
 */
import { TAX_RULES_BY_YEAR, SUPPORTED_TAX_YEARS, calculateDeterministic, socialSecurityOf } from '../src/data/taxRules';
import { deterministicNet, solveGrossFromNet, applyRegime } from '../src/services/taxEngine';
import { TO_EUR } from '../src/data/marketExtras';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL:', msg); };

const COUNTRIES = Object.keys(TAX_RULES_BY_YEAR[2026]);
const GROSS_LEVELS = [0, 5000, 12000, 25000, 40000, 60000, 100000, 150000, 250000, 500000, 1000000, 2000000];
const MARITAL: Array<'single' | 'married'> = ['single', 'married'];

const approx = (label: string, got: number, want: number, tolPct: number) => {
  const tol = Math.max(2, Math.abs(want) * tolPct);
  if (Math.abs(got - want) > tol) fail(`${label}: got ${Math.round(got)}, want ≈${want} (tol ±${tol.toFixed(0)})`);
};

// ── 1. Structural consistency across both tax years ──────────────────────────
for (const year of SUPPORTED_TAX_YEARS) {
  const table = TAX_RULES_BY_YEAR[year];
  const keys = Object.keys(table);
  if (keys.length !== 27) fail(`${year}: expected 27 countries, got ${keys.length}`);
  if (JSON.stringify(keys.sort()) !== JSON.stringify(COUNTRIES.sort())) fail(`${year}: country list differs from 2026`);

  for (const c of keys) {
    const r = table[c];
    if (!(r.currency in TO_EUR)) fail(`${year} ${c}: currency ${r.currency} missing from TO_EUR`);
    if (r.socialParts.length === 0 && !r.socialBrackets && c !== 'Sweden') fail(`${year} ${c}: no social component defined`);
    // brackets must be strictly increasing and end open-ended
    let prev = -Infinity;
    r.brackets.forEach((b, i) => {
      const up = b.upTo ?? Infinity;
      if (up <= prev) fail(`${year} ${c}: bracket ${i} not increasing (${prev} → ${up})`);
      if (b.rate < 0 || b.rate > 0.6) fail(`${year} ${c}: implausible rate ${b.rate}`);
      if (i === r.brackets.length - 1 && b.upTo !== undefined) fail(`${year} ${c}: top bracket must be open-ended`);
      prev = up;
    });
  }
}

// ── 2. Accounting identity, non-negativity, monotonicity ─────────────────────
for (const year of SUPPORTED_TAX_YEARS) {
  for (const c of COUNTRIES) {
    for (const m of MARITAL) {
      for (const kids of [0, 2]) {
        for (const g of GROSS_LEVELS) {
          const r = deterministicNet(g, c, m, kids, 12, year);
          const sum = r.incomeTax + r.socialSecurity + r.net;
          if (Math.abs(sum - g) > 2) fail(`${year} ${c} ${m} kids=${kids} gross=${g}: identity off by ${sum - g}`);
          if (r.net < 0) fail(`${year} ${c} ${m} kids=${kids} gross=${g}: negative net ${r.net}`);
          if (r.incomeTax < 0 || r.socialSecurity < 0) fail(`${year} ${c} ${m} gross=${g}: negative component`);
          if (r.incomeTax > g + 1) fail(`${year} ${c} gross=${g}: income tax exceeds gross`);
          const social = socialSecurityOf(c, g, year);
          const rule = TAX_RULES_BY_YEAR[year][c];
          const maxSocial = rule.socialParts.reduce((acc, p) => acc + Math.min(g, p.cap ?? Infinity) * p.rate, 0)
            + (rule.socialBrackets ? g * 0.1 : 0);
          if (social > maxSocial + 2) fail(`${year} ${c} gross=${g}: social ${social} exceeds max ${maxSocial}`);
        }
        let prev = -Infinity;
        for (const g of GROSS_LEVELS) {
          const n = deterministicNet(g, c, m, kids, 12, year).net;
          if (n < prev) fail(`${year} ${c} ${m} kids=${kids}: net fell ${prev} → ${n} at ${g}`);
          prev = n;
        }
      }
    }
  }
}

// ── 3. Net → gross solver round-trip ────────────────────────────────────────
for (const year of SUPPORTED_TAX_YEARS) {
  for (const c of COUNTRIES) {
    for (const m of MARITAL) {
      for (const target of [15000, 40000, 80000]) {
        const g = solveGrossFromNet(target, c, m, 1, 12, year);
        const got = deterministicNet(g, c, m, 1, 12, year).net;
        if (Math.abs(got - target) > 5) fail(`${year} ${c} ${m}: solver round-trip target=${target} got=${got}`);
        if (g < target) fail(`${year} ${c} ${m}: solved gross ${g} below target net ${target}`);
      }
    }
  }
}

// ── 4. Official anchors — 2026 ───────────────────────────────────────────────
const T = (c: string, g: number, y = 2026) => calculateDeterministic(c, g, y).incomeTax;
const N = (c: string, g: number, y = 2026) => calculateDeterministic(c, g, y);

// Germany §32a EStG 2026: zvE 60,000 → (176.64·z + 2,397)·z + 1,025.93 with z=4.2557 = 14,414 €.
approx('DE 2026 tax 60k (§32a formula)', T('Germany', 60000), 14414, 0.01);
approx('DE 2026 social 60k (21.45 %)', N('Germany', 60000).socialSecurity, 12870, 0.01);
// 2025: z=(60,000−17,443)/10,000=4.2557 → (176.64·z + 2,397)·z + 1,015.13 = 14,497 €.
approx('DE 2025 tax 60k (§32a formula)', T('Germany', 60000, 2025), 14497, 0.01);
// Austria BMF 2026 Tarifstufen, 18.07 % social up to 97,020.
approx('AT 2026 tax 60k', T('Austria', 60000), 15447, 0.005);
approx('AT 2026 net 60k', N('Austria', 60000).net, 33711, 0.005);
// Netherlands 2026 Box 1 (8.10 / 37.56) + algemene heffingskorting 3,115.
// 21,832 levy (8.10 / 37.56 bands) − 5,279 credits (general 782 + arbeids 4,497)
// = 16,553 total, of which 10,751 is national insurance → 5,802 income tax.
approx('NL 2026 tax 60k incl. credits', T('Netherlands', 60000), 5802, 0.01);
// 2025: 3,141 + 8,081 = 11,222 levy − 5,526 credits = 5,695 income-tax share.
approx('NL 2025 tax 60k incl. credits', T('Netherlands', 60000, 2025), 5695, 0.01);
approx('NL 2026 net 60k', N('Netherlands', 60000).net, 43447, 0.01);
// Belgium 2026: 25/40/45/50 on gross − social − 11,550.
// Base 52,158 (gross − 13.07 %); 4,180 + 5,116 + 10,192 = 19,488 − 2,888 credit = 16,600.
approx('BE 2026 tax 60k (25 % credit)', T('Belgium', 60000), 16600, 0.01);
// 2025: base 52,158 → 4,080 + 4,992 + 9,468 + 1,159 = 19,699 − 2,728 credit = 16,971.
approx('BE 2025 tax 60k (25 % credit)', T('Belgium', 60000, 2025), 16971, 0.01);
// Luxembourg 2026 class-1 ladder, 12.95 % social.
approx('LU 2026 tax 60k', T('Luxembourg', 60000), 8292, 0.02);
// France 2026 barème + 10 % abattement (cap 14,555), quotient familial.
approx('FR 2026 tax 60k (after abattement)', T('France', 60000), 6133, 0.02);
approx('FR 2026 net 60k', N('France', 60000).net, 42121, 0.02);
// 3 parts: 3 × tariff(43,428/3) = 949 vs 2 × tariff(21,714) = 2,225 → 949.
approx('FR married 2 kids 60k (quotient familial)', deterministicNet(60000, 'France', 'married', 2, 12, 2026).incomeTax, 949, 0.05);
// Spain 2026: state+regional, mínimo personal 5,550, 6.50 % social capped 61,214.
approx('ES 2026 tax 60k', T('Spain', 60000), 15848, 0.01);
// Portugal 2026 (DL 212/2026) rates, specific deduction 4,587.
approx('PT 2026 tax 60k', T('Portugal', 60000), 16101, 0.01);
// Italy 2026: 23 / 33 / 43 (the 2025 middle rate of 35 % was cut to 33 %).
// Base 54,486 (contributions deductible): 6,440 + 7,260 + 1,929 = 15,629.
approx('IT 2026 tax 60k (33 % band)', T('Italy', 60000), 15629, 0.01);
approx('IT 2025 tax 60k (35 % band)', T('Italy', 60000, 2025), 16069, 0.01);
// Greece 2026 scale (Law 5246/2025) + €777 credit that tapers out.
approx('GR 2026 tax 60k', T('Greece', 60000), 16700, 0.01);
// 2025 scale: 9 %/22 %/28 %/36 %/44 % → 18,300 € (the €777 credit has tapered out).
approx('GR 2025 tax 60k', T('Greece', 60000, 2025), 18300, 0.02);
// Cyprus 2026 reform: tax-free 22,000, bands 32/42/72k.
approx('CY 2026 tax 60k', T('Cyprus', 60000), 9900, 0.01);
// Malta 2026 single scale + capped Class 1 contribution.
approx('MT 2026 tax 60k', T('Malta', 60000), 11600, 0.01);
// Sweden 2026: 32.38 % municipal on 682,600 (after grundavdrag) + 20 % state above 643,000
// = 221,026 + 7,920 = 228,946.
approx('SE 2026 tax 700k', T('Sweden', 700000), 228946, 0.01);
// Denmark 2026: AM 8 %, bundskat+municipal 37.06 % (mellem/top only above 641,200).
approx('DK 2026 tax 700k', T('Denmark', 700000), 218617, 0.01);
approx('DK 2026 social 700k (AM 8 %)', N('Denmark', 700000).socialSecurity, 56000, 0.01);
// Finland 2026: state 12.64–37.5 % + municipal 7.60 %.
approx('FI 2026 tax 60k', T('Finland', 60000), 18535, 0.01);
// Ireland 2026: 20/40 with €4,000 credits, USC + PRSI.
approx('IE 2026 tax 60k', T('Ireland', 60000), 11200, 0.01);
approx('IE 2026 social 60k (USC + PRSI)', N('Ireland', 60000).socialSecurity, 3853, 0.02);
// Poland 2026: 12 % above 30,000 PLN after the deductible ZUS (13.71 %); the 9 % health
// contribution is NOT deductible → (60,000 − 8,226 − 30,000) × 12 % = 2,613.
approx('PL 2026 tax 60k PLN', T('Poland', 60000), 2613, 0.01);
// Czechia 2026: 15 % to 1,762,812 CZK with the 30,840 CZK credit.
approx('CZ 2026 tax 2M CZK', T('Czech Republic', 2000000), 288135, 0.01);
// Slovakia 2026: four brackets, tapered allowance, health 5 %.
approx('SK 2026 tax 60k', T('Slovakia', 60000), 10201, 0.01);
// Slovenia 2026: 16/26/33/39/50 on the net base (social deducted first).
approx('SI 2026 tax 60k', T('Slovenia', 60000), 10420, 0.01);
// Hungary: flat 15 % on gross.
approx('HU 2026 tax 10M HUF', T('Hungary', 10000000), 1500000, 0.01);
// Romania: 10 % on gross − CAS 25 % − CASS 10 % − personal deduction.
approx('RO 2026 tax 60k RON', T('Romania', 60000), 2862, 0.02);
// Bulgaria 2026 (euro area): 10 % on gross − 13.78 % capped at €2,300/month.
approx('BG 2026 tax 60k EUR', T('Bulgaria', 60000), 5638, 0.02);
// Croatia: 20 % on gross − 20 % pension − €600/month allowance.
approx('HR 2026 tax 60k', T('Croatia', 60000), 8160, 0.01);
// Estonia: 22 % on gross − €8,400 basic exemption.
approx('EE 2026 tax 60k', T('Estonia', 60000), 11352, 0.01);
// Latvia: 25.5 % on gross − €6,600 non-taxable minimum.
approx('LV 2026 tax 60k', T('Latvia', 60000), 13617, 0.01);
// Lithuania: 20 % up to 83,237.40, 25 % to 138,729.
approx('LT 2026 tax 60k', T('Lithuania', 60000), 12000, 0.01);
approx('LT 2026 tax 100k (25 % band)', T('Lithuania', 100000), 20809, 0.01);

// ── 5. Year sensitivity: rules that genuinely changed must differ ───────────
const differs = (c: string, g: number) => Math.abs(T(c, g, 2026) - T(c, g, 2025)) > 1;
for (const c of ['Italy', 'Greece', 'Cyprus', 'Denmark', 'Finland', 'Slovakia', 'Portugal', 'Austria', 'Belgium']) {
  if (!differs(c, 60000)) fail(`${c}: 2025 and 2026 income tax are identical at 60k — expected a legal change`);
}
// Lithuania added a 25 % band for 2026 that only bites above 83,237.40 €.
if (!differs('Lithuania', 100000)) fail('Lithuania: 2025 and 2026 income tax are identical at 100k');
if (TAX_RULES_BY_YEAR[2025].Bulgaria.currency !== 'BGN') fail('Bulgaria 2025 must be in BGN');
if (TAX_RULES_BY_YEAR[2026].Bulgaria.currency !== 'EUR') fail('Bulgaria 2026 must be in EUR (euro adoption 1 Jan 2026)');

// ── 6. Family relief & expat regimes ───────────────────────────────────────
const deSingle = deterministicNet(80000, 'Germany', 'single', 0, 12, 2026).incomeTax;
const deMarried = deterministicNet(80000, 'Germany', 'married', 0, 12, 2026).incomeTax;
// Single 80k: zone 4 → 0.42 × 80,000 − 10,911.92 = 22,688 €.
approx('DE 2026 single 80k', deSingle, 22688, 0.01);
// Married 80k: splitting → 2 × tariff(zvE 46,174) = 2 × 9,360 = 18,720 €.
approx('DE 2026 married 80k (splitting)', deMarried, 18720, 0.01);

const r1 = applyRegime(200000, 'Ireland', 'sarp', T('Ireland', 200000), 2026);
if (!(r1.incomeTax < T('Ireland', 200000))) fail('SARP did not reduce Irish tax');
const r2 = applyRegime(80000, 'Ireland', 'sarp', T('Ireland', 80000), 2026);
if (r2.incomeTax !== T('Ireland', 80000)) fail('SARP wrongly applied below the €100k threshold');
approx('Beckham Law 100k flat 24 %', applyRegime(100000, 'Spain', 'beckham_law', T('Spain', 100000), 2026).incomeTax, 24000, 0.001);
const r4 = applyRegime(65000, 'Netherlands', '30_ruling', T('Netherlands', 65000), 2026);
approx('30 % ruling 65k (taxable 45.5k)', r4.incomeTax, T('Netherlands', 45500), 0.001);
if (!(r4.savings > 0)) fail('30 % ruling produced no savings');

// ── 7. Contribution ceilings: fully capped systems must saturate ───────────
for (const year of SUPPORTED_TAX_YEARS) {
  for (const c of COUNTRIES) {
    const parts = TAX_RULES_BY_YEAR[year][c].socialParts;
    if (!parts.length || parts.some((p) => p.cap === undefined)) continue;
    const maxCap = Math.max(...parts.map((p) => p.cap!));
    const atCap = socialSecurityOf(c, maxCap, year);
    const farAbove = socialSecurityOf(c, maxCap * 10, year);
    if (Math.abs(farAbove - atCap) > 2) fail(`${year} ${c}: contributions do not saturate at the ceiling (${atCap} → ${farAbove})`);
  }
}

console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
