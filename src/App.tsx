/**
 * EU Tax Calculator — premium shell (header / hero / methodology / footer)
 */
import React, { useEffect, useState } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { TaxCalculator } from './components/TaxCalculator';
import { GuidesGrid, GuidePage, slugify } from './components/CountryGuide';
import { COUNTRY_GUIDES } from './data/marketExtras';
import { taxAuthorities } from './data/taxAuthorities';
import { Globe, ShieldCheck, Zap, Languages, Moon, Sun } from 'lucide-react';
import { Language } from './i18n/translations';

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('eutax_theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('eutax_theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);
  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
    >
      {dark ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4 text-white/70" />}
    </button>
  );
}

function Header() {
  const { language, setLanguage } = useLanguage();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
            <span className="text-ink-950 font-black text-sm tracking-tight">EU</span>
          </div>
          <div className="leading-none">
            <p className="text-white font-extrabold tracking-tight text-[15px]">EU Tax Calculator</p>
            <p className="text-white/50 text-[11px] font-medium tracking-wide">Gross → Net · 27 countries</p>
          </div>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-white/70">
          <a href="#calculator" className="hover:text-white transition-colors">Calculator</a>
          <a href="#methodology" className="hover:text-white transition-colors">Methodology</a>
          <a href="#sources" className="hover:text-white transition-colors">Official sources</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
          <Globe className="w-4 h-4 text-gold-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-white text-[13px] font-semibold outline-none cursor-pointer [&>option]:text-slate-900"
            aria-label="Language"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
            <option value="it">Italiano</option>
            <option value="es">Español</option>
            <option value="tr">Türkçe</option>
          </select>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="premium-hero relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14 relative">
        <div className="max-w-3xl">
          <span className="eyebrow text-gold-400">
            <span className="w-8 h-px bg-gold-400/70" />
            2025 / 2026 tax year · Offline engine
          </span>
          <h1 className="font-display text-white text-4xl md:text-6xl leading-[1.02] mt-4 tracking-tight">
            Know your true <em className="not-italic text-gold-400">net salary</em> anywhere in Europe.
          </h1>
          <p className="text-white/70 text-[15px] md:text-lg mt-5 max-w-2xl leading-relaxed">
            {t('subtitle')}. Instant deterministic calculation with official brackets — no waiting,
            no sign-up. AI enrichment adds cost of living, optimization tips and visa guidance when available.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <a href="#calculator" className="gold-btn rounded-xl px-6 py-3 text-sm">Calculate my net pay</a>
            <a href="#methodology" className="rounded-xl px-6 py-3 text-sm font-bold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all">How it works</a>
          </div>
          <dl className="grid grid-cols-3 max-w-xl gap-6 mt-10">
            {[
              ['27', 'EU countries'],
              ['<100ms', 'Offline result'],
              ['6', 'Languages'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl md:text-3xl text-white">{v}</dd>
                <dd className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 mt-1">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="h-10 bg-surface-bg rounded-t-[2rem]" />
    </section>
  );
}

function Methodology() {
  const items = [
    { icon: Zap, title: 'Deterministic core', text: 'National 2025/2026 brackets and employee social-security rates run locally. Same input → same numbers, every time. No hallucinated rates.' },
    { icon: Languages, title: 'AI enrichment (optional)', text: 'When a Gemini key is configured, the engine adds cost-of-living estimates, optimization tips, lifestyle and visa notes — without ever changing the computed numbers.' },
    { icon: ShieldCheck, title: 'Estimate, not advice', text: 'Regional surcharges and personal deductions vary. Always confirm with your local tax authority or accountant before signing a contract.' },
  ];
  return (
    <section id="methodology" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid md:grid-cols-3 gap-5">
        {items.map((it) => (
          <div key={it.title} className="premium-card p-6">
            <div className="w-10 h-10 rounded-xl bg-ink-950 flex items-center justify-center mb-4">
              <it.icon className="w-5 h-5 text-gold-400" />
            </div>
            <h3 className="font-extrabold tracking-tight text-[15px]">{it.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="sources" className="bg-ink-950 text-white/60 mt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <span className="text-ink-950 font-black text-xs">EU</span>
            </div>
            <p className="text-white font-extrabold text-sm">EU Tax Calculator</p>
          </div>
          <p className="text-xs leading-relaxed max-w-xs">
            Open-source estimate tool. Tax rules change frequently — verify with official sources
            before making financial decisions.
          </p>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="text-white font-bold text-xs uppercase tracking-[0.18em] mb-3">Official sources · all 27 EU tax authorities</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[12px]">
            <li><a className="hover:text-gold-400" href="https://taxation-customs.ec.europa.eu/" target="_blank" rel="noreferrer">EU — Taxation & Customs Union</a></li>
            {Object.entries(taxAuthorities).sort(([a], [b]) => a.localeCompare(b)).map(([c, a]) => (
              <li key={c}><a className="hover:text-gold-400" href={a.url} target="_blank" rel="noreferrer">{c} — {a.name}</a></li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="text-white font-bold text-xs uppercase tracking-[0.18em] mb-3">Project</p>
          <ul className="space-y-2 text-[13px]">
            <li><a className="hover:text-gold-400" href="https://buymeacoffee.com/eutaxcalculator" target="_blank" rel="noreferrer">Support the project</a></li>
            <li><a className="hover:text-gold-400" href="#top">Back to top</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between gap-2 text-[11px]">
          <p>© {new Date().getFullYear()} EU Tax Calculator · For informational purposes only.</p>
          <p className="num-tabular">Deterministic engine v2 · brackets 2025/2026</p>
        </div>
      </div>
    </footer>
  );
}

function guideFromHash(): string | null {
  const m = window.location.hash.match(/^#\/guide\/([a-z0-9-]+)/);
  if (!m) return null;
  return Object.keys(COUNTRY_GUIDES).find((c) => slugify(c) === m[1]) ?? null;
}

function AppContent() {
  const [guide, setGuide] = useState<string | null>(() => guideFromHash());
  useEffect(() => {
    const onHash = () => { setGuide(guideFromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const openGuide = (c: string) => { window.location.hash = `/guide/${slugify(c)}`; };
  const calcInCountry = (c: string) => {
    window.location.hash = '';
    setGuide(null);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('eutax:country', { detail: c }));
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };
  if (guide) {
    return (
      <div id="top" className="min-h-screen font-sans">
        <Header />
        <GuidePage country={guide} onBack={() => { window.location.hash = ''; setGuide(null); }} onCalculate={calcInCountry} />
        <Footer />
      </div>
    );
  }
  return (
    <div id="top" className="min-h-screen font-sans">
      <Header />
      <Hero />
      <main id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-4 scroll-mt-20">
        <TaxCalculator />
      </main>
      <Methodology />
      <GuidesGrid onOpen={openGuide} />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
