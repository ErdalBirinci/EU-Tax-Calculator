import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { euCountries } from '../i18n/translations';
import { countryCities } from '../data/cities';
import { expatRegimes } from '../data/expatRegimes';
import { countryCurrencies } from '../data/currencies';
import { calculateTaxes, TaxResult, solveGrossFromNet, deterministicNet, applyRegime, employerCost, pppAdjustedNet, blueCardCheck, TAX_RULES_VERSION } from '../services/taxEngine';
import { TAX_RULES_2025 } from '../data/taxRules';
import { CountryCompare } from './CountryCompare';
import { COUNTRY_GUIDES } from '../data/marketExtras';
import { EXPAT_DETAIL, visaNote, pensionOf, BLUE_CARD_SHORTAGE } from '../data/socialExtras';
import { CountUp } from './CountUp';
import { taxAuthorities, defaultTaxAuthority } from '../data/taxAuthorities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaxSankey } from './TaxSankey';
import { Calculator, MapPin, Users, Baby, Loader2, AlertCircle, Briefcase, Calendar, Lightbulb, Wallet, Scale, Globe, Download, BarChart3, FileText, Sparkles, TrendingUp, ShieldCheck, CheckCircle2, Info, Home, ShoppingBag, Bus, Zap, Coffee, Utensils, Heart, Plane, Compass, Star, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import EuropeMap from './EuropeMap';
import { countryQualityOfLife } from '../data/qualityOfLife';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Copy } from 'lucide-react';

export function TaxCalculator() {
  const { t, language } = useLanguage();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [country, setCountry] = useState('');
  const [taxYear, setTaxYear] = useState<number>(currentYear);
  const [city, setCity] = useState('');
  const [grossSalary, setGrossSalary] = useState<number | ''>('');
  const [period, setPeriod] = useState('yearly');
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [children, setChildren] = useState<number>(0);
  const [expatRegime, setExpatRegime] = useState('none');
  const [employmentType, setEmploymentType] = useState('employment');
  const [calcMode, setCalcMode] = useState<'grossToNet' | 'netToGross'>('grossToNet');
  const [paymentsPerYear, setPaymentsPerYear] = useState<number>(12);
  const [solvedFromNet, setSolvedFromNet] = useState(false);
  interface SavedScenario { country: string; city: string; taxYear: number; gross: number; net: number; currency: string }
  const [saved, setSaved] = useState<SavedScenario[]>(() => {
    try { return JSON.parse(localStorage.getItem('eutax_saved') || '[]'); } catch { return []; }
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<TaxResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [sharedResult, setSharedResult] = useState<{ net: number; tax: number; social: number; currency: string } | null>(null);
  
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Load state from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('c')) setCountry(params.get('c') || '');
    if (params.has('y')) setTaxYear(Number(params.get('y')) || currentYear);
    if (params.has('ci')) setCity(params.get('ci') || '');
    if (params.has('g')) setGrossSalary(Number(params.get('g')) || '');
    if (params.has('p')) setPeriod(params.get('p') || 'yearly');
    if (params.has('m')) setMaritalStatus(params.get('m') || 'single');
    if (params.has('ch')) setChildren(Number(params.get('ch')) || 0);
    if (params.has('e')) setExpatRegime(params.get('e') || 'none');
    if (params.has('t')) setEmploymentType(params.get('t') || 'employment');
    try {
      const r = params.get('r');
      if (r) {
        const [n, ix, tx, ccy] = r.split('.');
        if (n) setSharedResult({ net: Number(n), tax: Number(ix || 0), social: Number(tx || 0), currency: ccy || 'EUR' });
      }
    } catch { /* ignore malformed share */ }
    const onCountryEvent = (ev: Event) => {
      const c = (ev as CustomEvent<string>).detail;
      if (c && countryCities[c]) handleMapSelect(c);
    };
    window.addEventListener('eutax:country', onCountryEvent);
    return () => window.removeEventListener('eutax:country', onCountryEvent);
  }, []);

  const handleShare = () => {
    const params = new URLSearchParams();
    if (country) params.set('c', country);
    params.set('y', taxYear.toString());
    if (city) params.set('ci', city);
    if (grossSalary) params.set('g', grossSalary.toString());
    params.set('p', period);
    params.set('m', maritalStatus);
    params.set('ch', children.toString());
    params.set('e', expatRegime);
    params.set('t', employmentType);
    if (result) params.set('r', `${Math.round(result.netSalary)}.${Math.round(result.incomeTax)}.${Math.round(result.socialSecurity)}.${result.currency}`);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveScenario = () => {
    if (!result) return;
    const entry = { country, city, taxYear, gross: result.grossSalary, net: result.netSalary, currency: result.currency };
    const next = [...saved.filter((s) => !(s.country === entry.country && s.gross === entry.gross)), entry].slice(-3);
    setSaved(next);
    try { localStorage.setItem('eutax_saved', JSON.stringify(next)); } catch { /* storage full */ }
  };

  const clearSaved = () => {
    setSaved([]);
    try { localStorage.removeItem('eutax_saved'); } catch { /* ignore */ }
  };

  const emailReport = () => {
    if (!result) return;
    const subject = encodeURIComponent(`My net salary estimate — ${country} ${taxYear}`);
    const body = encodeURIComponent(`Gross: ${result.grossSalary.toLocaleString()} ${result.currency}/yr\nNet: ${result.netSalary.toLocaleString()} ${result.currency}/yr\nIncome tax: ${result.incomeTax.toLocaleString()}\nSocial: ${result.socialSecurity.toLocaleString()}\n\nEstimated with EU Tax Calculator (deterministic engine v${TAX_RULES_VERSION}). Not tax advice.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copySummary = () => {
    if (!result || !insights) return;
    const lines = [
      `EU Tax Calculator — ${country} ${taxYear}`,
      `Gross: ${formatCurrency(result.grossSalary, result.currency)}/yr · Net: ${formatCurrency(result.netSalary, result.currency)}/yr`,
      `Monthly net: ${formatCurrency(result.netSalary / 12, result.currency)} · Tax burden: ${Math.round(((result.incomeTax + result.socialSecurity) / result.grossSalary) * 100)}%`,
      `Employer cost: ${formatCurrency(result.grossSalary + insights.emp, result.currency)}/yr · PPP net: €${insights.ppp.toLocaleString()}/yr`,
      `Blue Card: ${insights.visa.eligible ? 'likely eligible' : 'below threshold'} (€${insights.visa.grossEur.toLocaleString()} vs €${insights.visa.thresholdEur.toLocaleString()})`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const exportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`EU Tax Calculator — ${country} ${taxYear}`, 14, 18);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`${city} · Gross ${formatCurrency(result.grossSalary, result.currency)} / yr · Net ${formatCurrency(result.netSalary, result.currency)} / yr`, 14, 26);
      autoTable(pdf, {
        startY: 32,
        head: [[t('bracket'), t('rate'), t('amount')]],
        body: (result.taxBreakdown ?? []).map(b => [b.bracket, b.rate, formatCurrency(b.amount, result.currency)]),
        foot: [
          [t('incomeTax'), '', formatCurrency(result.incomeTax, result.currency)],
          [t('socialSecurity'), '', formatCurrency(result.socialSecurity, result.currency)],
          [t('net'), '', formatCurrency(result.netSalary, result.currency)],
        ],
      });
      const y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      pdf.setFontSize(9);
      pdf.text(t('disclaimerText').slice(0, 280) + '...', 14, y, { maxWidth: 180 });
      pdf.save(`tax-report-${country.toLowerCase()}-${taxYear}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setExporting(false);
    }
  };

  const chartData = result ? [
    { name: t('gross'), value: result.grossSalary, color: '#3B82F6' }, // Blue
    { name: t('incomeTax'), value: result.incomeTax, color: '#EF4444' }, // Red
    { name: t('socialSecurity'), value: result.socialSecurity, color: '#FACC15' }, // Yellow
    { name: t('net'), value: result.netSalary, color: '#22C55E' }, // Green
  ] : [];

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    handleMapSelect(selectedCountry);
  };

  const handleMapSelect = (selectedCountry: string) => {
    setCountry(selectedCountry);
    // Reset city when country changes, or auto-select the first city
    const availableCities = countryCities[selectedCountry] || [];
    setCity(availableCities.length > 0 ? availableCities[0] : '');
    // Reset expat regime
    setExpatRegime('none');
  };

  interface CalcInputs { country: string; city: string; grossSalary: number; period: string; maritalStatus: string; children: number; expatRegime: string; taxYear: number; employmentType: string; calcMode: 'grossToNet' | 'netToGross'; paymentsPerYear: number }

  const runCalc = async (inp: CalcInputs) => {
    if (!inp.country || !inp.grossSalary) return;
    setLoading(true);
    setError(null);
    try {
      const currentCurrency = countryCurrencies[inp.country] ?? { code: 'EUR', symbol: '€' };
      let annualInput = inp.period === 'monthly' ? Number(inp.grossSalary) * 12 : Number(inp.grossSalary);
      let fromNet = false;
      if (inp.calcMode === 'netToGross') {
        annualInput = solveGrossFromNet(annualInput, inp.country, inp.maritalStatus, inp.children, inp.paymentsPerYear);
        fromNet = true;
      }
      const res = await calculateTaxes({
        country: inp.country,
        city: inp.city,
        grossSalary: inp.period === 'monthly' ? annualInput / 12 : annualInput,
        period: inp.period,
        maritalStatus: inp.maritalStatus,
        children: inp.children,
        language,
        expatRegime: inp.expatRegime,
        taxYear: inp.taxYear,
        currencyCode: currentCurrency.code,
        employmentType: inp.employmentType,
        paymentsPerYear: inp.paymentsPerYear
      });
      setSolvedFromNet(fromNet);
      if (isComparing && result) {
        setComparisonResult(res);
      } else {
        setResult(res);
        setComparisonResult(null);
      }
      pushHistory(inp, res);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      console.error(err);
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCalc({ country, city, grossSalary: Number(grossSalary), period, maritalStatus, children, expatRegime, taxYear, employmentType, calcMode, paymentsPerYear });
  };

  interface HistoryEntry extends CalcInputs { net: number; currency: string; ts: number }
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('eutax_history') || '[]'); } catch { return []; }
  });
  const pushHistory = (inp: CalcInputs, res: TaxResult) => {
    const entry: HistoryEntry = { ...inp, net: res.netSalary, currency: res.currency, ts: Date.now() };
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => !(h.country === entry.country && h.grossSalary === entry.grossSalary && h.period === entry.period))].slice(0, 10);
      try { localStorage.setItem('eutax_history', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const restoreHistory = (h: HistoryEntry) => {
    setCountry(h.country);
    setCity(h.city);
    setGrossSalary(h.grossSalary);
    setPeriod(h.period);
    setMaritalStatus(h.maritalStatus);
    setChildren(h.children);
    setExpatRegime(h.expatRegime);
    setTaxYear(h.taxYear);
    setEmploymentType(h.employmentType);
    setCalcMode(h.calcMode);
    setPaymentsPerYear(h.paymentsPerYear);
    void runCalc(h);
  };
  const applyPreset = (p: { country: string; grossSalary: number; expatRegime?: string }) => {
    const cities = countryCities[p.country] ?? [];
    const inp: CalcInputs = { country: p.country, city: cities[0] ?? '', grossSalary: p.grossSalary, period: 'yearly', maritalStatus: 'single', children: 0, expatRegime: p.expatRegime ?? 'none', taxYear: currentYear, employmentType: 'employment', calcMode: 'grossToNet', paymentsPerYear: 12 };
    setCountry(inp.country); setCity(inp.city); setGrossSalary(inp.grossSalary); setPeriod('yearly');
    setMaritalStatus('single'); setChildren(0); setExpatRegime(inp.expatRegime); setTaxYear(currentYear);
    setEmploymentType('employment'); setCalcMode('grossToNet'); setPaymentsPerYear(12);
    void runCalc(inp);
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      // Try to use Intl.NumberFormat if it's a valid ISO code
      if (currency && currency.length === 3) {
        return new Intl.NumberFormat(language, { style: 'currency', currency: currency }).format(amount);
      }
      // Fallback for symbols like €
      return new Intl.NumberFormat(language, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' ' + (currency || '€');
    } catch (e) {
      return new Intl.NumberFormat(language, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' ' + (currency || '€');
    }
  };

  const availableCities = country ? countryCities[country] || [] : [];
  const availableExpatRegimes = country ? expatRegimes[country] || [] : [];
  const currentCurrency = country ? countryCurrencies[country] : { code: 'EUR', symbol: '€' };

  const pieData = result ? [
    { name: t('net'), value: result.netSalary, color: '#22C55E' }, // Green
    { name: t('incomeTax'), value: result.incomeTax, color: '#EF4444' }, // Red
    { name: t('socialSecurity'), value: result.socialSecurity, color: '#FACC15' }, // Yellow
  ] : [];

  const getHighlights = (text: string) => {
    if (!text) return [];
    // Simple heuristic to extract bullet points or sentences as highlights
    return text.split(/[.!?\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 150)
      .slice(0, 3);
  };

  const highlights = result ? getHighlights(result.explanation) : [];

  const insights = result ? (() => {
    const regime = applyRegime(result.grossSalary, country, expatRegime, result.incomeTax);
    const emp = employerCost(result.grossSalary, country);
    const ppp = pppAdjustedNet(result.netSalary, country, result.currency);
    const visa = blueCardCheck(result.grossSalary, country, result.currency);
    const guide = COUNTRY_GUIDES[country];
    const perPay = result.netSalary / paymentsPerYear;
    const pension = pensionOf(country);
    const pensionAnnual = Math.round(result.netSalary * pension.replacement);
    const expatDetail = expatRegime !== 'none' ? EXPAT_DETAIL[expatRegime] : undefined;
    const visaShortage = BLUE_CARD_SHORTAGE[country];
    const visaNoteText = visaNote(country);
    const burden = Math.round(((result.incomeTax + result.socialSecurity) / Math.max(1, result.grossSalary)) * 100);
    return { regime, emp, ppp, visa, guide, perPay, pension, pensionAnnual, expatDetail, visaShortage, visaNoteText, burden };
  })() : null;

  return (
    <div className="space-y-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Map Section - Now side by side with form on large screens */}
        <div className="lg:col-span-7 order-2 lg:order-1 no-print">
          <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="absolute top-4 left-4 z-[1001]">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  showHeatmap ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                {t('heatmap')}
              </button>
            </div>
            <EuropeMap selectedCountry={country} selectedCity={city} onSelectCountry={handleMapSelect} showHeatmap={showHeatmap} />
          </div>
          {country && TAX_RULES_2025[country] && (() => {
            const rule = TAX_RULES_2025[country];
            const ex = deterministicNet(60000, country, 'single', 0);
            const top = rule.brackets[rule.brackets.length - 1];
            return (
              <div className="mt-3 p-4 rounded-2xl bg-ink-950 text-white flex flex-wrap items-center gap-x-5 gap-y-1.5 no-print">
                <span className="text-sm font-black">{country}</span>
                <span className="text-[11px] font-bold text-white/60">Top rate <span className="text-gold-400 font-black">{Math.round(top.rate * 100)}%</span></span>
                <span className="text-[11px] font-bold text-white/60">Social <span className="text-gold-400 font-black">{(rule.socialRate * 100).toFixed(1)}%</span></span>
                <span className="text-[11px] font-bold text-white/60">€60k → net <span className="text-emerald-400 font-black num-tabular">{ex.net.toLocaleString()} {rule.currency}</span></span>
                <button onClick={() => applyPreset({ country, grossSalary: 60000 })} className="ml-auto text-[11px] font-extrabold text-gold-400 hover:text-gold-300">Calculate €60k →</button>
              </div>
            );
          })()}
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              {t('currencyNote')} {country && `Calculations are based on ${country}'s ${taxYear} tax laws.`}
            </p>
          </div>
          <details className="mt-3 premium-card p-4">
            <summary className="text-xs font-extrabold text-slate-600 cursor-pointer list-none flex items-center justify-between">{t('browseAll')}<span className="text-slate-400">+</span></summary>
            <div className="flex flex-wrap gap-1.5 mt-3" role="listbox" aria-label="EU countries">
              {euCountries.map((c) => (
                <button key={c} role="option" aria-selected={country === c} onClick={() => handleMapSelect(c)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${country === c ? 'bg-ink-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
              ))}
            </div>
          </details>

          <div className="mt-6 flex justify-center">
            <a 
              href="https://wise.com/pay/me/erdalb143" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative flex items-center gap-3 px-6 py-3 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black font-bold rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <Heart className="w-5 h-5 fill-black" />
              <span className="text-sm">Donate</span>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                Support us!
              </div>
            </a>
          </div>
        </div>

        {/* Form Section */}
        <div className="lg:col-span-5 order-1 lg:order-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-brand-blue" />
              </div>
              {t('title')}
            </div>
            <button
              onClick={() => {
                setIsComparing(!isComparing);
                if (!isComparing) setComparisonResult(null);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                isComparing ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {isComparing ? t('stopComparing') : t('compare')}
            </button>
          </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('country')}</label>
              <select 
                required
                value={country}
                onChange={handleCountryChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
              >
                <option value="" disabled>{t('selectCountry')}</option>
                {euCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('taxYear')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </div>
                <select 
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('city')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <select 
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!country || availableCities.length === 0}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!country ? (
                    <option value="" disabled>{t('selectCountryFirst')}</option>
                  ) : (
                    availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('employmentType')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                </div>
                <select 
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
                >
                  <option value="employment">{t('fullTime')}</option>
                  <option value="b2b">{t('b2b')}</option>
                </select>
              </div>
            </div>
          </div>

          {availableExpatRegimes.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-brand-blue mb-1">{t('expatAdvantage')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-brand-blue/60" />
                </div>
                <select 
                  value={expatRegime}
                  onChange={(e) => setExpatRegime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-blue-900 outline-none"
                >
                  <option value="none">{t('noExpatAdvantage')}</option>
                  {availableExpatRegimes.map(regime => (
                    <option key={regime.id} value={regime.id}>{regime.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button type="button" onClick={() => setCalcMode('grossToNet')} className={`py-2 rounded-lg text-xs font-extrabold transition-all ${calcMode === 'grossToNet' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Gross → Net</button>
            <button type="button" onClick={() => setCalcMode('netToGross')} className={`py-2 rounded-lg text-xs font-extrabold transition-all ${calcMode === 'netToGross' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Net → Gross</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{calcMode === 'netToGross' ? t('net') : t('grossSalary')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 font-medium sm:text-sm">{currentCurrency.symbol}</span>
                </div>
                <input 
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('period')}</label>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
              >
                <option value="yearly">{t('yearly')}</option>
                <option value="monthly">{t('monthly')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('paymentsY')}</label>
            <select
              value={paymentsPerYear}
              onChange={(e) => setPaymentsPerYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
            >
              <option value={12}>12 (monthly)</option>
              <option value={13}>13 (incl. Christmas)</option>
              <option value={14}>14 (Spain/Portugal/Greece)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('maritalStatus')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-slate-400" />
                </div>
                <select 
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-colors text-slate-900 outline-none"
                >
                  <option value="single">{t('single')}</option>
                  <option value="married">{t('married')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('children')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Baby className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="number"
                  min="0"
                  max="15"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !country || !grossSalary}
            className="w-full mt-4 bg-brand-yellow hover:bg-yellow-500 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
            {loading ? t('calculating') : t('calculate')}
          </button>
        </form>
        {history.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('recentCalc')}</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  const rows = ['country,gross,period,net,currency,date', ...history.map((h) => [h.country, h.grossSalary, h.period, h.net, h.currency, new Date(h.ts).toISOString()].join(','))];
                  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob); a.download = 'eu-tax-history.csv'; a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                }} className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800">Export CSV</button>
                <button onClick={() => { setHistory([]); try { localStorage.removeItem('eutax_history'); } catch { /* ignore */ } }} className="text-[10px] font-extrabold text-red-500 hover:text-red-700">Clear</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 5).map((h, i) => (
                <button key={i} onClick={() => restoreHistory(h)} className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-600 transition-all">
                  {h.country} · {Number(h.grossSalary).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* All-country comparison */}
      <div className="max-w-7xl mx-auto mt-8">
        <CountryCompare highlight={country || undefined} onSelect={(c) => { handleMapSelect(c); document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' }); }} />
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 text-red-700 p-4 rounded-2xl flex items-start gap-3 mb-6 border border-red-100"
            >
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[500px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed min-h-[400px]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <h3 className="text-lg font-black text-slate-900">{t('calculating')}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Running the offline tax engine…</p>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div 
              key="results"
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Disclaimer Banner */}
              <div className="lg:col-span-12 bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-black text-yellow-900 uppercase tracking-wider mb-1">{t('disclaimerTitle')}</h5>
                    <p className="text-xs text-yellow-800 font-medium leading-relaxed">
                      {t('disclaimerText')}
                    </p>
                  </div>
                </div>
                {(taxAuthorities[country] || defaultTaxAuthority) && (
                  <a 
                    href={(taxAuthorities[country] || defaultTaxAuthority).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-all text-xs font-bold whitespace-nowrap shadow-sm active:scale-95"
                  >
                    <Globe className="w-4 h-4" />
                    {t('visitOfficial')}: {(taxAuthorities[country] || defaultTaxAuthority).name}
                  </a>
                )}
              </div>

              {/* Left Column: Main Stats & Charts */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-20" />
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('results')}</h3>
                      <p className="text-sm text-slate-500 font-medium">{country} • {city} • {taxYear}</p>
                    </div>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-xs font-bold uppercase tracking-widest active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      {copied ? t('linkCopied') : t('share')}
                    </button>
                    <button
                      onClick={exportPDF}
                      disabled={exporting}
                      data-html2canvas-ignore
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {exporting ? 'Exporting...' : t('exportPDF')}
                    </button>
                  </div>

                  {sharedResult && (
                    <div className="mb-6 p-4 rounded-2xl bg-violet-50 border border-violet-200 relative z-10 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                      <p className="text-xs font-bold text-violet-900">Shared result: net <span className="font-black num-tabular">{formatCurrency(sharedResult.net, sharedResult.currency)}/yr</span> (tax {formatCurrency(sharedResult.tax, sharedResult.currency)}, social {formatCurrency(sharedResult.social, sharedResult.currency)}).</p>
                      <button onClick={() => setSharedResult(null)} className="text-[11px] font-extrabold text-violet-500 hover:text-violet-700 whitespace-nowrap">Dismiss</button>
                    </div>
                  )}

                  {insights && (
                    <div className="mb-6 flex flex-wrap items-center gap-2 relative z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" /> Deterministic v{TAX_RULES_VERSION} • {taxYear} brackets
                      </span>
                      {solvedFromNet && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-extrabold text-violet-700">Net → Gross solved</span>
                      )}
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-extrabold text-slate-600 num-tabular">{paymentsPerYear}× {formatCurrency(insights.perPay, result.currency)} / pay</span>
                      <button onClick={saveScenario} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-400/20 border border-gold-400/50 text-[11px] font-extrabold text-yellow-800 hover:bg-gold-400/30 transition-all">{t('saveB')}</button>
                      <button onClick={emailReport} className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-extrabold hover:bg-slate-700 transition-all">{t('emailB')}</button>
                      <button onClick={copySummary} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-600 hover:border-slate-400 transition-all">{copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}{copiedSummary ? t('copiedB') : t('copySummaryB')}</button>
                      {(taxAuthorities[country] || defaultTaxAuthority) && (
                        <a href={(taxAuthorities[country] || defaultTaxAuthority).url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-600 hover:border-slate-400 transition-all">Find a local advisor ↗</a>
                      )}
                    </div>
                  )}

                  {insights && insights.regime.savings > 0 && (
                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-ink-950 to-ink-800 text-white relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-400 mb-1">Expat regime — computed saving</p>
                      <p className="text-2xl font-black num-tabular">+{formatCurrency(insights.regime.savings, result.currency)} <span className="text-xs font-bold text-white/60">/ yr vs standard taxation</span></p>
                      <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
                        <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Standard tax</p>
                          <p className="text-sm font-black num-tabular">{formatCurrency(result.incomeTax, result.currency)}</p>
                        </div>
                        <div className="bg-gold-400/20 border border-gold-400/40 rounded-xl px-3 py-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gold-400">With regime</p>
                          <p className="text-sm font-black num-tabular text-gold-300">{formatCurrency(insights.regime.incomeTax, result.currency)}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/60 mt-2">{insights.regime.note}</p>
                      {insights.expatDetail && (
                        <div className="mt-3 grid sm:grid-cols-3 gap-2 text-left">
                          {[['Who qualifies', insights.expatDetail.who], ['Duration', insights.expatDetail.duration], ['How to apply', insights.expatDetail.apply]].map(([h, b]) => (
                            <div key={h} className="bg-white/10 border border-white/10 rounded-xl p-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gold-400 mb-1">{h}</p>
                              <p className="text-[11px] font-medium text-white/85 leading-relaxed">{b}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {insights && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Employer cost</p>
                        <p className="text-lg font-black text-slate-900 num-tabular">{formatCurrency(result.grossSalary + insights.emp, result.currency)}</p>
                        <p className="text-[11px] text-slate-500 font-medium">incl. +{formatCurrency(insights.emp, result.currency)} employer charges / yr</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Purchasing power</p>
                        <p className="text-lg font-black text-slate-900 num-tabular">€{insights.ppp.toLocaleString()} <span className="text-[11px] font-bold text-slate-400">PPP-adj / yr</span></p>
                        <p className="text-[11px] text-slate-500 font-medium">What your net buys vs EU average (=100)</p>
                      </div>
                      <div className={`p-4 rounded-2xl border ${insights.visa.eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">EU Blue Card</p>
                        <p className={`text-lg font-black ${insights.visa.eligible ? 'text-emerald-700' : 'text-amber-700'}`}>{insights.visa.eligible ? 'Likely eligible' : 'Below threshold'}</p>
                        <p className="text-[11px] text-slate-500 font-medium">€{insights.visa.grossEur.toLocaleString()} vs €{insights.visa.thresholdEur.toLocaleString()} required{insights.visaShortage ? ` · shortage route €${insights.visaShortage.toLocaleString()}` : ''}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">{insights.visaNoteText}</p>
                      </div>
                    </div>
                  )}

                  {insights && (
                    <div className="mb-6 p-5 rounded-2xl bg-white border border-slate-200 relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{t('pensionTitle')} · age {insights.pension.age}</p>
                        <p className="text-xl font-black text-slate-900 num-tabular">≈{formatCurrency(insights.pensionAnnual, result.currency)} <span className="text-xs font-bold text-slate-400">/ yr at retirement ({Math.round(insights.pension.replacement * 100)}% replacement)</span></p>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium max-w-xs">Rough projection from today's net — public pension only, before taxes in retirement.</p>
                    </div>
                  )}

                  {saved.length > 0 && (
                    <div className="mb-6 p-5 rounded-2xl bg-white border border-slate-200 relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('savedTitle')} ({saved.length}/3)</p>
                        <button onClick={clearSaved} className="text-[11px] font-bold text-red-500 hover:text-red-700">{t('clearBtn')}</button>
                      </div>
                      {saved.length >= 2 ? (
                        <div className="overflow-x-auto slim-scroll">
                          <table className="w-full text-sm min-w-[520px]">
                            <thead>
                              <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-2 pr-3">Scenario</th>
                                <th className="py-2 pr-3 text-right">Gross / yr</th>
                                <th className="py-2 pr-3 text-right">Net / yr</th>
                                <th className="py-2 pr-3 text-right">Burden</th>
                                <th className="py-2 text-right">PPP net</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const best = Math.max(...saved.map((s) => s.net));
                                return saved.map((s, i) => {
                                  const burden = Math.round(((s.gross - s.net) / Math.max(1, s.gross)) * 100);
                                  return (
                                    <tr key={i} className={`border-t border-slate-100 ${s.net === best ? 'bg-emerald-50/60' : ''}`}>
                                      <td className="py-2.5 pr-3 font-bold text-slate-700">{s.net === best ? '★ ' : ''}{s.country} · {s.taxYear}</td>
                                      <td className="py-2.5 pr-3 text-right font-bold text-slate-500 num-tabular">{formatCurrency(s.gross, s.currency)}</td>
                                      <td className="py-2.5 pr-3 text-right font-black text-slate-900 num-tabular">{formatCurrency(s.net, s.currency)}</td>
                                      <td className="py-2.5 pr-3 text-right font-bold text-slate-500 num-tabular">{burden}%</td>
                                      <td className="py-2.5 text-right font-bold text-slate-500 num-tabular">€{pppAdjustedNet(s.net, s.country, s.currency).toLocaleString()}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {saved.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="font-bold text-slate-700">{s.country} · {s.city} · {s.taxYear}</span>
                              <span className="font-black text-slate-900 num-tabular">{formatCurrency(s.net, s.currency)} <span className="text-[10px] font-bold text-slate-400">net / yr</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {insights && insights.guide && (
                    <div className="mb-6 p-5 rounded-2xl bg-gold-400/10 border border-gold-400/30 relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-700 mb-2">{country} payroll guide</p>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{insights.guide.blurb}</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-2"><span className="font-extrabold">Payroll:</span> {insights.guide.payroll}</p>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1"><span className="font-extrabold">Watch out:</span> {insights.guide.pitfalls}</p>
                    </div>
                  )}

                  <div className="space-y-8 p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 group transition-all hover:border-blue-200">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-2">{isComparing && comparisonResult ? t('scenario2') : t('gross')}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900"><CountUp value={result.grossSalary} format={(n) => formatCurrency(n, result.currency)} /></span>
                          <span className="text-sm font-bold text-slate-400">/ yr</span>
                        </div>
                        {comparisonResult && (
                          <div className="mt-2 text-xs font-bold text-slate-400">
                            vs {formatCurrency(comparisonResult.grossSalary, comparisonResult.currency)}
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-blue-200/50 flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{t('monthly')}</span>
                          <span className="text-sm font-black text-slate-700 num-tabular">{formatCurrency(result.grossSalary / 12, result.currency)}</span>
                        </div>
                      </div>

                      <div className="bg-green-600 p-6 rounded-2xl shadow-xl shadow-green-200 group transition-all hover:scale-[1.02]">
                        <p className="text-[10px] text-green-200 font-black uppercase tracking-[0.2em] mb-2">{isComparing && comparisonResult ? t('scenario2') : t('net')}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-white"><CountUp value={result.netSalary} format={(n) => formatCurrency(n, result.currency)} /></span>
                          <span className="text-sm font-bold text-green-300">/ yr</span>
                        </div>
                        {comparisonResult && (
                          <div className="mt-2 text-xs font-bold text-green-100">
                            vs {formatCurrency(comparisonResult.netSalary, comparisonResult.currency)}
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                          <span className="text-xs font-bold text-green-200 uppercase tracking-wider">{t('monthly')}</span>
                          <span className="text-lg font-black text-white num-tabular">{formatCurrency(result.netSalary / 12, result.currency)}</span>
                        </div>
                        {insights && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-black text-white num-tabular">Burden {insights.burden}%</span>
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-black text-white num-tabular">Take-home {Math.round((result.netSalary / Math.max(1, result.grossSalary)) * 100)}%</span>
                          </div>
                        )}
                        {insights && paymentsPerYear !== 12 && (
                          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-bold">
                            <span className="text-green-200/70">Gross / pay</span><span className="text-right text-white num-tabular">{formatCurrency(result.grossSalary / paymentsPerYear, result.currency)}</span>
                            <span className="text-green-200/70">Tax / pay</span><span className="text-right text-white num-tabular">{formatCurrency(result.incomeTax / paymentsPerYear, result.currency)}</span>
                            <span className="text-green-200/70">Social / pay</span><span className="text-right text-white num-tabular">{formatCurrency(result.socialSecurity / paymentsPerYear, result.currency)}</span>
                            <span className="text-green-200/70">Net / pay</span><span className="text-right text-gold-400 font-black num-tabular">{formatCurrency(insights.perPay, result.currency)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-6">Salary Breakdown</p>
                      <div className="w-full h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-slate-900">{Math.round((result.netSalary / result.grossSalary) * 100)}%</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Take Home</span>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-2 w-full">
                        {pieData.map(item => (
                          <div key={item.name} className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                            <span className="text-[9px] font-bold text-slate-500 uppercase truncate w-full text-center">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {/* Expat Savings Card */}
                {result.expatSavings && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">{t('expatAdvantage')} Applied</span>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div>
                          <p className="text-4xl font-black">+{formatCurrency(result.expatSavings.amount, result.currency)}</p>
                          <p className="text-sm font-bold opacity-80 mt-1">Estimated Annual Savings</p>
                        </div>
                        <div className="md:ml-auto max-w-md">
                          <p className="text-xs font-medium leading-relaxed bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            {result.expatSavings.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Key highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {highlights.map((highlight, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        {highlight}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Tax Sankey Visualization */}
                {result.taxSankeyData && result.taxSankeyData.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 no-print">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-600" />
                      {t('taxFlow')}
                    </h4>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <TaxSankey data={result.taxSankeyData} />
                      <p className="text-[10px] text-slate-400 mt-4 text-center font-medium uppercase tracking-wider">
                        * This diagram shows how your gross salary is distributed between taxes, social security, and public services.
                      </p>
                    </div>
                  </div>
                )}

                {/* Nomad Index & Lifestyle Match */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.nomadIndex && (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Compass className="w-5 h-5 text-blue-600" />
                        Nomad Index
                      </h4>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-4xl font-black text-blue-600">{result.nomadIndex.score}/100</div>
                        <div className="h-12 w-px bg-slate-100" />
                        <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Vibe</p>
                          <p className="text-sm font-bold text-slate-900">{result.nomadIndex.vibe}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Internet</span>
                          <span className="text-xs font-black text-slate-900">{result.nomadIndex.internetSpeed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Nightlife</span>
                          <span className="text-xs font-black text-slate-900">{result.nomadIndex.nightlife}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.lifestyleMatch && (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        Lifestyle Match
                      </h4>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-4xl font-black text-red-500">{result.lifestyleMatch.score}%</div>
                        <div className="h-12 w-px bg-slate-100" />
                        <p className="text-xs font-medium text-slate-600 leading-tight">
                          {result.lifestyleMatch.recommendation}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Pros</p>
                          {result.lifestyleMatch.pros.map((pro, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] font-bold text-slate-700">{pro}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Cons</p>
                          {result.lifestyleMatch.cons.map((con, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] font-bold text-slate-700">{con}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visa & Residency */}
                {result.visaGuidance && (
                  <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Plane className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        Visa & Residency
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-2xl font-black mb-2">{result.visaGuidance.type}</p>
                          <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            {result.visaGuidance.process}
                          </p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Key Requirements</p>
                          <ul className="space-y-3">
                            {result.visaGuidance.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <Check className="w-4 h-4 text-green-400 mt-0.5" />
                                <span className="text-xs font-medium text-slate-200">{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {countryQualityOfLife[country] && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      {t('qualityOfLife')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {[
                        { label: t('safety'), value: countryQualityOfLife[country].safety, icon: ShieldCheck, color: 'text-blue-500' },
                        { label: t('healthcare'), value: countryQualityOfLife[country].healthcare, icon: Utensils, color: 'text-green-500' },
                        { label: t('pollution'), value: 100 - countryQualityOfLife[country].pollution, icon: Zap, color: 'text-yellow-500' },
                        { label: t('internet'), value: countryQualityOfLife[country].internet, icon: Zap, color: 'text-purple-500' },
                        { label: t('purchasingPower'), value: countryQualityOfLife[country].purchasingPower, icon: Wallet, color: 'text-emerald-500' },
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <item.icon className={`w-4 h-4 ${item.color}`} />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{item.value}/100</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              className={`h-full ${item.color.replace('text', 'bg')}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Rights Section */}
                {result.socialRights && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      {t('socialRights')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">{t('unemployment')}</p>
                        <p className="text-xs font-medium text-blue-900 leading-relaxed">{result.socialRights.unemployment}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                        <p className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-2">{t('retirement')}</p>
                        <p className="text-xs font-medium text-green-900 leading-relaxed">{result.socialRights.retirement}</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-wider mb-2">{t('healthInsurance')}</p>
                        <p className="text-xs font-medium text-yellow-900 leading-relaxed">{result.socialRights.healthInsurance}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Breakdown Bar Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 no-print">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Income vs Deductions
                  </h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Other Deductions List */}
                {result.otherDeductions && result.otherDeductions.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      {t('otherTaxes')}
                    </h4>
                    <div className="space-y-3">
                      {result.otherDeductions.map((deduction, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-600">{deduction.name}</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(deduction.amount, result.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax Breakdown Table */}
                {result.taxBreakdown && result.taxBreakdown.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-600" />
                      {t('taxBreakdownTitle')}
                    </h4>
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{t('bracket')}</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">{t('rate')}</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">{t('amount')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.taxBreakdown.map((b, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-xs font-bold text-slate-700">{b.bracket}</td>
                              <td className="px-4 py-3 text-xs font-black text-blue-600 text-center">{b.rate}</td>
                              <td className="px-4 py-3 text-xs font-black text-slate-900 text-right">{formatCurrency(b.amount, result.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bracket waterfall */}
                {result.taxBreakdown && result.taxBreakdown.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6">{t('whereEuro')}</h4>
                    <div className="space-y-2.5">
                      {result.taxBreakdown.map((b, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-600">{b.bracket} · {b.rate}</span>
                            <span className="text-slate-900 num-tabular">{formatCurrency(b.amount, result.currency)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (b.amount / Math.max(1, result.grossSalary)) * 100)}%` }} className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Country Comparison */}
                {result.countryComparison && result.countryComparison.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      {t('euComparison')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...result.countryComparison]
                        .sort((a, b) => b.netSalary - a.netSalary)
                        .map((comp, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{comp.country}</p>
                            <p className="text-lg font-black text-slate-900">{formatCurrency(comp.netSalary, comp.currency)}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Explanation */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {t('explanation')}
                  </h4>
                  <div className="prose prose-slate prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed">
                    <ReactMarkdown>{result.explanation}</ReactMarkdown>
                  </div>
                </div>
              </div>

                             {/* Right Column: Insights & Comparison */}
              <div className="lg:col-span-4 space-y-6">
                {/* Cost of Living & Disposable Income */}
                {result.costOfLiving && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-green-500" />
                      {t('costOfLiving')}
                    </h4>
                    
                    <div className="space-y-3 mb-6">
                      {result.costOfLiving.breakdown.map((item, idx) => {
                        const IconComponent = {
                          Home,
                          ShoppingBag,
                          Bus,
                          Zap,
                          Coffee,
                          Utensils,
                          Car: Bus,
                          Train: Bus,
                          Wifi: Zap,
                          Smartphone: Zap,
                          Pizza: Utensils,
                          Apple: ShoppingBag
                        }[item.icon || 'Home'] || Home;

                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                <IconComponent className="w-4 h-4 text-slate-500" />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{item.category}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{formatCurrency(item.amount, result.currency)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Monthly Cost</span>
                        <span className="text-lg font-black text-slate-900">{formatCurrency(result.costOfLiving.total, result.currency)}</span>
                      </div>
                      
                      <div className="bg-green-600 p-6 rounded-2xl shadow-xl shadow-green-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                        <div className="relative z-10">
                          <p className="text-[10px] text-green-100 font-black uppercase tracking-[0.2em] mb-1">Disposable Income</p>
                          <p className="text-3xl font-black text-white">{formatCurrency(result.disposableIncome, result.currency)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optimization Tips */}
                {result.optimizationTips && result.optimizationTips.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      {t('optimizationTips')}
                    </h4>
                    <div className="space-y-4">
                      {result.optimizationTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-blue-200">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-blue-600">{idx + 1}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B2B Comparison */}
                {result.b2bComparison && (
                  <div className="bg-slate-900 p-8 rounded-3xl shadow-xl relative overflow-hidden group">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-400" />
                      B2B Alternative
                    </h4>
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Monthly</p>
                        <p className="text-2xl font-black text-blue-400">{formatCurrency(result.b2bComparison.netSalary / 12, result.currency)}</p>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(result.b2bComparison.netSalary / result.netSalary) * 50}%` }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                        Switching to a B2B contract could potentially increase your net take-home by {Math.round(((result.b2bComparison.netSalary - result.netSalary) / result.netSalary) * 100)}%.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200 border-dashed rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                <Calculator className="w-10 h-10 opacity-20 text-brand-blue" />
              </div>
              <p className="text-xl font-black text-slate-900 mb-2 tracking-tight">{t('subtitle')}</p>
              <p className="text-sm max-w-md text-slate-500 font-medium leading-relaxed">
                Select a country on the map or use the form to calculate your potential take-home pay across Europe.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <button onClick={() => applyPreset({ country: 'Germany', grossSalary: 80000 })} className="px-4 py-2 rounded-xl bg-ink-950 text-white text-xs font-extrabold hover:bg-ink-800 transition-all">Berlin · €80k → ?</button>
                <button onClick={() => applyPreset({ country: 'Portugal', grossSalary: 45000 })} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:border-slate-400 transition-all">Lisbon · €45k → ?</button>
                <button onClick={() => applyPreset({ country: 'Netherlands', grossSalary: 65000, expatRegime: '30_ruling' })} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:border-slate-400 transition-all">Amsterdam · €65k + ruling → ?</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {result && !loading && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-ink-950 text-white rounded-2xl shadow-2xl px-5 py-3.5 flex items-center justify-between no-print">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">{country} net</p>
            <p className="text-lg font-black num-tabular">{formatCurrency(result.netSalary, result.currency)}<span className="text-[10px] font-bold text-white/50"> / yr</span></p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Monthly</p>
            <p className="text-lg font-black text-gold-400 num-tabular">{formatCurrency(result.netSalary / 12, result.currency)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
