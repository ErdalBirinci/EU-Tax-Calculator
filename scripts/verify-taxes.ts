/** Offline invariant + spot-check harness for the deterministic tax engine. Run via esbuild (see package scripts comment). */
import { TAX_RULES_2025, calculateDeterministic } from '../src/data/taxRules';
import { deterministicNet, solveGrossFromNet, applyRegime } from '../src/services/taxEngine';
import { TO_EUR } from '../src/data/marketExtras';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('FAIL:', msg); };

const COUNTRIES = Object.keys(TAX_RULES_2025);
const GROSS_LEVELS = [0, 5000, 12000, 25000, 40000, 60000, 100000, 150000, 250000, 500000, 1000000, 2000000];
const MARITAL: Array<'single' | 'married'> = ['single', 'married'];

// 1. Accounting identity + non-negativity + monotonicity
const nets: Record<string, number[]> = {};
for (const c of COUNTRIES) {
  for (const m of MARITAL) {
    for (const kids of [0, 2]) {
      for (const g of GROSS_LEVELS) {
        const r = deterministicNet(g, c, m, kids);
        const sum = r.incomeTax + r.socialSecurity + r.net;
        if (Math.abs(sum - g) > 2) fail(`${c} ${m} kids=${kids} gross=${g}: identity off by ${sum - g} (tax=${r.incomeTax} soc=${r.socialSecurity} net=${r.net})`);
        if (r.net < 0) fail(`${c} ${m} kids=${kids} gross=${g}: negative net ${r.net}`);
        if (r.incomeTax < 0 || r.socialSecurity < 0) fail(`${c} ${m} kids=${kids} gross=${g}: negative component`);
        if (r.incomeTax > g + 1) fail(`${c} gross=${g}: incomeTax ${r.incomeTax} exceeds gross`);
      }
      // monotonicity of net in gross
      let prev = -Infinity;
      for (const g of GROSS_LEVELS) {
        const n = deterministicNet(g, c, m, kids).net;
        if (n < prev) fail(`${c} ${m} kids=${kids}: net decreased ${prev} -> ${n} at gross ${g}`);
        prev = n;
      }
      const key = `${c}|${m}|${kids}`;
      nets[key] = GROSS_LEVELS.map((g) => deterministicNet(g, c, m, kids).net);
    }
  }
}
void nets;

// 2. Solver roundtrip
for (const c of COUNTRIES) {
  for (const m of MARITAL) {
    for (const target of [15000, 40000, 80000]) {
      const g = solveGrossFromNet(target, c, m, 1);
      const got = deterministicNet(g, c, m, 1).net;
      if (Math.abs(got - target) > 5) fail(`${c} ${m}: solver roundtrip target=${target} got=${got} (gross=${g})`);
      if (g < target) fail(`${c} ${m}: solved gross ${g} below target net ${target}`);
    }
  }
}

// 3. Spot-checks against official tariffs (linear brackets => exact; Germany fit => ±8%)
const approx = (label: string, got: number, want: number, tolPct: number) => {
  const tol = Math.max(1, Math.abs(want) * tolPct);
  if (Math.abs(got - want) > tol) fail(`${label}: got ${got}, want ≈${want} (tol ±${tol.toFixed(0)})`);
};
const T = (c: string, g: number) => calculateDeterministic(c, g).incomeTax;
approx('DE single 60k', T('Germany', 60000), 14233, 0.08);
approx('DE married 80k splitting', deterministicNet(80000, 'Germany', 'married', 0).incomeTax, 14420, 0.08);
approx('FR single 60k', T('France', 60000), 11104, 0.01);
// FR married 2 kids: 3 parts × tariff(20k)=3×924=2,772; ref 2×tariff(30k)=4,208; saving 1,436 < cap 3,614 → 2,772.
approx('FR married 2kids 60k quotient', deterministicNet(60000, 'France', 'married', 2).incomeTax, 2772, 0.01);
approx('FR single 60k no kids (no benefit)', deterministicNet(60000, 'France', 'single', 0).incomeTax, 11104, 0.01);
approx('IT single 60k', T('Italy', 60000), 16240, 0.01);
approx('AT single 60k', T('Austria', 60000), 15593, 0.01);
approx('BE single 60k', T('Belgium', 60000), 23620, 0.01);
approx('PL single 60k PLN', T('Poland', 60000), 3600, 0.01);
approx('LV single 60k', T('Latvia', 60000), 15300, 0.01);
approx('LT single 130k', T('Lithuania', 130000), 26416, 0.01);
approx('ES single 60k', T('Spain', 60000), 17902, 0.02);
approx('NL single 60k', T('Netherlands', 60000), 21850, 0.02);
approx('SE single 700k SEK', T('Sweden', 700000), 232512, 0.02);
approx('CZ single 2M CZK', T('Czech Republic', 2000000), 325916, 0.01);
approx('SK single 60k', T('Slovakia', 60000), 12094, 0.01);
approx('IE single 60k', T('Ireland', 60000), 15200, 0.01);
approx('DK single 700k DKK income tax', T('Denmark', 700000), 253312, 0.03);
approx('HR single 60k', T('Croatia', 60000), 12966, 0.02);
approx('SI single 60k', T('Slovenia', 60000), 17595, 0.03);
approx('CY single 60k', T('Cyprus', 60000), 10885, 0.02);
approx('MT single 60k', T('Malta', 60000), 10975, 0.02);
approx('GR single 60k', T('Greece', 60000), 18300, 0.02);
approx('LU single 60k', T('Luxembourg', 60000), 11151, 0.03);
approx('PT single 60k', T('Portugal', 60000), 19050, 0.01);
approx('FI single 60k', T('Finland', 60000), 11305, 0.05);
approx('RO single 100k RON', T('Romania', 100000), 10000, 0.01);
approx('BG single 50k BGN', T('Bulgaria', 50000), 5000, 0.01);
approx('HU single 10M HUF', T('Hungary', 10000000), 1500000, 0.01);

// 4. Currency map consistency: every rule currency must exist in TO_EUR
for (const c of COUNTRIES) {
  const cur = TAX_RULES_2025[c].currency;
  if (!(cur in TO_EUR)) fail(`${c}: currency ${cur} missing from TO_EUR`);
}

// 5. Regime sanity: exemptions must reduce (or keep) tax, flat rates exact
const r1 = applyRegime(200000, 'Ireland', 'sarp', T('Ireland', 200000));
if (!(r1.incomeTax < T('Ireland', 200000))) fail('SARP did not reduce Irish tax');
approx('SARP 200k (30% of 100k over)', r1.incomeTax, T('Ireland', 170000), 0.01);
const r2 = applyRegime(80000, 'Ireland', 'sarp', T('Ireland', 80000));
if (r2.incomeTax !== T('Ireland', 80000)) fail('SARP wrongly applied below €100k threshold');
const r3 = applyRegime(100000, 'Spain', 'beckham_law', T('Spain', 100000));
approx('Beckham 100k flat 24%', r3.incomeTax, 24000, 0.001);

// 6. Social caps respected
for (const c of COUNTRIES) {
  const rule = TAX_RULES_2025[c];
  if (rule.socialCap) {
    const s = calculateDeterministic(c, rule.socialCap * 3).socialSecurity;
    const want = Math.round(rule.socialCap * rule.socialRate);
    if (Math.abs(s - want) > 2) fail(`${c}: social cap not respected (got ${s}, want ${want})`);
  }
}

console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
