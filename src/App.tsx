/**
 * EU Tax Calculator — premium shell (header / hero / methodology / footer)
 */
import React, { useEffect, useState } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { TaxCalculator } from './components/TaxCalculator';
import { GuidesGrid, GuidePage, slugify } from './components/CountryGuide';
import { COUNTRY_GUIDES } from './data/marketExtras';
import { taxAuthorities } from './data/taxAuthorities';
import { deterministicNet } from './services/taxEngine';
import { Globe, ShieldCheck, Zap, Languages, Moon, Sun, Calculator, Cookie } from 'lucide-react';
import { Language } from './i18n/translations';
import { storageGet, storageSet, getConsent, setConsent } from './services/storage';
import { PrivacyPolicy, LegalNotice } from './components/LegalPages';

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    return storageGet('eutax_theme') === 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    storageSet('eutax_theme', dark ? 'dark' : 'light');
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

function SkipLink({ target }: { target: string }) {
  const { t } = useLanguage();
  return (
    <a href={`#${target}`} className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:text-ink-950">
      {t('skipToContent')}
    </a>
  );
}

function ConsentBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(() => getConsent() === null);
  if (!visible) return null;
  const choose = (c: 'all' | 'essential') => { setConsent(c); setVisible(false); };
  return (
    <div role="region" aria-label="Cookie consent" className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-md z-[90] rounded-2xl border border-white/10 bg-ink-950/95 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <p className="text-[13px] leading-relaxed text-white/80">{t('consentMessage')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button onClick={() => choose('all')} className="rounded-xl bg-gold-400 px-4 py-2 text-[13px] font-extrabold text-ink-950 hover:bg-gold-300 transition-colors">{t('consentAccept')}</button>
        <button onClick={() => choose('essential')} className="rounded-xl border border-white/20 px-4 py-2 text-[13px] font-bold text-white/80 hover:bg-white/10 transition-colors">{t('consentEssential')}</button>
        <a href="#/privacy" className="text-[12px] font-bold text-gold-400 hover:underline ml-auto">{t('consentPrivacy')}</a>
      </div>
    </div>
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
          <a href="https://wise.com/pay/me/erdalb143" target="_blank" rel="noreferrer"
            className="rounded-full bg-gold-400 px-4 py-1.5 text-ink-950 font-extrabold hover:bg-gold-300 transition-colors">Donate</a>
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

const DEMO_COUNTRIES = ['Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Portugal', 'Poland', 'Ireland'];

function HeroDemo() {
  const [c, setC] = React.useState('Germany');
  const [g, setG] = React.useState<number>(60000);
  const net = React.useMemo(() => { try { return deterministicNet(Math.max(0, g || 0), c, 'single', 0).net; } catch { return 0; } }, [c, g]);
  return (
    <div className="mt-7 max-w-xl rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur px-4 py-3.5 flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-gold-400"><Calculator className="w-3.5 h-3.5" /> Try it</span>
      <select value={c} onChange={(e) => setC(e.target.value)} aria-label="Demo country"
        className="bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-white outline-none cursor-pointer [&>option]:text-slate-900">
        {DEMO_COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <input type="number" value={g} min={0} onChange={(e) => setG(Number(e.target.value))} aria-label="Demo gross"
        className="w-28 bg-white/10 border border-white/15 rounded-lg px-2.5 py-1.5 text-[13px] font-black text-white outline-none num-tabular" />
      <span className="text-[13px] font-bold text-white/70">→ net <span className="text-emerald-400 font-black num-tabular">≈{net.toLocaleString()} €/yr</span></span>
      <a href="#calculator" className="ml-auto text-[11px] font-extrabold text-gold-400 hover:text-gold-300">Details →</a>
    </div>
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
            no sign-up. The built-in enrichment engine adds cost of living, optimization tips and visa guidance, fully offline.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <a href="#calculator" className="gold-btn rounded-xl px-6 py-3 text-sm">Calculate my net pay</a>
            <a href="#methodology" className="rounded-xl px-6 py-3 text-sm font-bold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all">How it works</a>
          </div>
          <HeroDemo />
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
    { icon: Languages, title: 'Local enrichment engine', text: 'Cost-of-living estimates, optimization tips, lifestyle and visa notes are generated on-device from built-in datasets — without ever changing the computed numbers.' },
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
            before making financial decisions. Independent project — not affiliated with EU
            institutions or tax authorities.
          </p>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="text-white font-bold text-xs uppercase tracking-[0.18em] mb-3">Official sources · all 27 EU tax authorities</p>
          <a href="https://taxation-customs.ec.europa.eu/" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1.5 text-[12px] font-bold text-gold-300 hover:bg-gold-400/20 transition-all mb-4">
            EU level — Taxation & Customs Union ↗
          </a>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {[
              { title: 'Western Europe', countries: ['Austria', 'Belgium', 'France', 'Germany', 'Ireland', 'Luxembourg', 'Netherlands'] },
              { title: 'Nordics & Baltics', countries: ['Denmark', 'Estonia', 'Finland', 'Latvia', 'Lithuania', 'Sweden'] },
              { title: 'Southern Europe', countries: ['Cyprus', 'Greece', 'Italy', 'Malta', 'Portugal', 'Spain'] },
              { title: 'Central & Eastern Europe', countries: ['Bulgaria', 'Croatia', 'Czech Republic', 'Hungary', 'Poland', 'Romania', 'Slovakia', 'Slovenia'] },
            ].map((region) => (
              <div key={region.title}>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45 mb-2">{region.title}</p>
                <ul className="space-y-1.5 text-[12px]">
                  {region.countries.map((c) => {
                    const a = taxAuthorities[c];
                    if (!a) return null;
                    return (
                      <li key={c}>
                        <a className="text-white/60 hover:text-gold-400 transition-colors" href={a.url} target="_blank" rel="noreferrer" title={a.name}>
                          {c} <span className="text-white/30">· {a.name}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm">
          <p className="text-white font-bold text-xs uppercase tracking-[0.18em] mb-3">Project</p>
          <ul className="space-y-2 text-[13px]">
            <li><a className="hover:text-gold-400" href="https://wise.com/pay/me/erdalb143" target="_blank" rel="noreferrer">Donate</a></li>
            <li><a className="hover:text-gold-400" href="#/privacy">Privacy Policy</a></li>
            <li><a className="hover:text-gold-400" href="#/legal">Legal Notice</a></li>
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

type Page = { kind: 'home' } | { kind: 'guide'; country: string } | { kind: 'privacy' } | { kind: 'legal' };
function pageFromHash(): Page {
  const h = window.location.hash;
  if (h === '#/privacy') return { kind: 'privacy' };
  if (h === '#/legal') return { kind: 'legal' };
  const g = guideFromHash();
  return g ? { kind: 'guide', country: g } : { kind: 'home' };
}
function AppContent() {
  const [page, setPage] = useState<Page>(() => pageFromHash());
  useEffect(() => {
    const onHash = () => { setPage(pageFromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const openGuide = (c: string) => { window.location.hash = `/guide/${slugify(c)}`; };
  const guide = page.kind === 'guide' ? page.country : null;
  const calcInCountry = (c: string) => {
    window.location.hash = '';
    setPage({ kind: 'home' });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('eutax:country', { detail: c }));
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };
  const goHome = () => { window.location.hash = ''; setPage({ kind: 'home' }); };
  if (page.kind === 'privacy' || page.kind === 'legal') {
    return (
      <div id="top" className="min-h-screen font-sans bg-surface-bg dark:bg-ink-950">
        <SkipLink target="main-content" />
        <Header />
        {page.kind === 'privacy' ? <PrivacyPolicy /> : <LegalNotice />}
        <Footer />
        <ConsentBanner />
      </div>
    );
  }
  if (guide) {
    return (
      <div id="top" className="min-h-screen font-sans">
        <SkipLink target="main-content" />
        <Header />
        <main id="main-content">
          <GuidePage country={guide} onBack={goHome} onCalculate={calcInCountry} />
        </main>
        <Footer />
        <ConsentBanner />
      </div>
    );
  }
  return (
    <div id="top" className="min-h-screen font-sans">
      <SkipLink target="main-content" />
      <Header />
      <Hero />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-4">
        <div id="calculator" className="scroll-mt-20">
          <TaxCalculator />
        </div>
      </main>
      <Methodology />
      <GuidesGrid onOpen={openGuide} />
      <Footer />
      <ConsentBanner />
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
