import React from 'react';
import { COUNTRY_GUIDES } from '../data/marketExtras';
import { TAX_RULES_2025 } from '../data/taxRules';
import { taxAuthorities, defaultTaxAuthority } from '../data/taxAuthorities';
import { countryCities } from '../data/cities';
import { ArrowLeft, Globe, Building2 } from 'lucide-react';

export function slugify(c: string) {
  return c.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function GuidesGrid({ onOpen }: { onOpen: (country: string) => void }) {
  const countries = Object.keys(COUNTRY_GUIDES).sort();
  return (
    <section id="guides" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h2 className="font-display text-3xl md:text-4xl text-slate-900 dark:text-white tracking-tight">Country tax guides</h2>
      <p className="text-slate-600 dark:text-slate-300 mt-2 max-w-2xl text-[15px]">Payroll rules, pitfalls and official sources for every EU country — then run the numbers in the calculator.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {countries.map((c) => (
          <button
            key={c}
            onClick={() => onOpen(c)}
            className="premium-card p-5 text-left hover:border-gold-400/60 hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-slate-900 dark:text-white">{c}</p>
              <span className="text-[11px] font-extrabold text-slate-400 group-hover:text-gold-600">→</span>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed line-clamp-2">{COUNTRY_GUIDES[c].blurb}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-3">{(countryCities[c] ?? []).slice(0, 4).join(' · ')}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function GuidePage({ country, onBack, onCalculate }: { country: string; onBack: () => void; onCalculate: (country: string) => void }) {
  const guide = COUNTRY_GUIDES[country];
  const rule = TAX_RULES_2025[country];
  const auth = taxAuthorities[country] ?? defaultTaxAuthority;
  if (!guide) return null;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> All guides
      </button>
      <p className="eyebrow text-gold-600">2025 / 2026 · {country}</p>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-slate-900 dark:text-white mt-3">{country} payroll & tax guide</h1>
      <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mt-4">{guide.blurb}</p>
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <div className="premium-card p-6">
          <h2 className="font-extrabold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2"><Building2 className="w-4 h-4" /> Payroll</h2>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mt-3">{guide.payroll}</p>
        </div>
        <div className="premium-card p-6">
          <h2 className="font-extrabold text-sm uppercase tracking-widest text-slate-400">Watch out</h2>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mt-3">{guide.pitfalls}</p>
        </div>
      </div>
      {rule && (
        <div className="premium-card p-6 mt-4">
          <h2 className="font-extrabold text-sm uppercase tracking-widest text-slate-400">Income brackets ({rule.currency})</h2>
          <div className="mt-3 space-y-2">
            {rule.brackets.map((b, i) => (
              <div key={i} className="flex justify-between text-sm p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                <span className="font-bold text-slate-600 dark:text-slate-300">{b.upTo ? `Up to ${b.upTo.toLocaleString()}` : 'Above top threshold'}</span>
                <span className="font-black text-slate-900 dark:text-white">{(b.rate * 100).toFixed(b.rate * 100 % 1 ? 2 : 0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-8">
        <button onClick={() => onCalculate(country)} className="gold-btn rounded-xl px-6 py-3 text-sm">Calculate salary in {country}</button>
        <a href={auth.url} target="_blank" rel="noreferrer" className="rounded-xl px-6 py-3 text-sm font-bold border border-slate-200 dark:border-white/15 inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Globe className="w-4 h-4" /> {auth.name}
        </a>
      </div>
    </div>
  );
}
