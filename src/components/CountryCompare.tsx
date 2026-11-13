import React, { useMemo, useState } from 'react';
import { euCountries } from '../i18n/translations';
import { deterministicNet } from '../services/taxEngine';
import { TO_EUR } from '../data/marketExtras';
import { TAX_RULES_2025 } from '../data/taxRules';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Globe } from 'lucide-react';

/** Compare take-home pay across all 27 EU countries for one gross amount (EUR-normalized). */
export function CountryCompare({ highlight, onSelect }: { highlight?: string; onSelect?: (c: string) => void }) {
  const [gross, setGross] = useState(60000);
  const data = useMemo(() => {
    const g = Math.max(0, gross || 0);
    return euCountries
      .map((c) => {
        const r = deterministicNet(g, c, 'single', 0);
        const cur = TAX_RULES_2025[c]?.currency ?? 'EUR';
        return { country: c, net: Math.round(r.net / (TO_EUR[cur] ?? 1)) };
      })
      .sort((a, b) => b.net - a.net);
  }, [gross]);

  const best = data[0]?.net ?? 1;
  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 no-print">
      <div className="flex flex-wrap items-center gap-3 justify-between mb-2">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600" />
          All 27 countries compared
        </h3>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
          Gross / yr (local)
          <input
            type="number"
            value={gross}
            min={0}
            onChange={(e) => setGross(Number(e.target.value))}
            className="w-32 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 font-black num-tabular outline-none focus:border-blue-400"
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-400 font-medium mb-4">
        Net pay converted to EUR for comparability · single, no children · click a bar to calculate that country
      </p>
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="country"
              width={110}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(v: number | undefined) => [`€${(v ?? 0).toLocaleString()} net / yr`, 'Take-home']}
            />
            <Bar dataKey="net" radius={[0, 6, 6, 0]} barSize={14} background={{ fill: '#f1f5f8', radius: 6 } as never} onClick={(d) => { const c = (d as { country?: string })?.country; if (c && onSelect) onSelect(c); }} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
              {data.map((entry) => (
                <Cell
                  key={entry.country}
                  fill={entry.country === highlight ? '#c9a227' : entry.net >= best * 0.85 ? '#22c55e' : entry.net >= best * 0.6 ? '#3b82f6' : '#f97316'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
