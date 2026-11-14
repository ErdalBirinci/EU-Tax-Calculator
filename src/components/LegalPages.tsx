/**
 * Privacy Policy & Legal Notice (GDPR / ePrivacy transparency).
 * English version prevails; the app itself ships in 6 languages.
 */
import React from 'react';
import { ShieldCheck, Scale, Trash2 } from 'lucide-react';
import { wipeAllStoredData, KNOWN_STORAGE_KEYS } from '../services/storage';

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <a href="#top" className="text-sm font-bold text-blue-700 dark:text-gold-400 hover:underline">← EU Tax Calculator</a>
      <div className="premium-card p-6 sm:p-10 mt-4">{children}</div>
    </main>
  );
}

const h1 = 'font-display text-3xl sm:text-4xl tracking-tight text-slate-900 dark:text-white';
const h2 = 'font-extrabold text-lg text-slate-900 dark:text-white mt-8 mb-2';
const p = 'text-sm text-slate-600 dark:text-white/70 leading-relaxed mt-2';
const li = 'text-sm text-slate-600 dark:text-white/70 leading-relaxed';
const a = 'text-blue-700 dark:text-gold-400 hover:underline font-semibold';

export function PrivacyPolicy() {
  const [wiped, setWiped] = React.useState(false);
  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-950 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-gold-400" />
        </div>
        <h1 className={h1}>Privacy Policy</h1>
      </div>
      <p className={p}>Last updated: November 2026. The English version of this policy prevails.</p>

      <h2 className={h2}>1. Who we are</h2>
      <p className={p}>
        EU Tax Calculator is an independent, non-commercial open-source project by its repository
        owner (<a className={a} href="https://github.com/ErdalBirinci" target="_blank" rel="noreferrer">github.com/ErdalBirinci</a>).
        Contact: please open an issue at{' '}
        <a className={a} href="https://github.com/ErdalBirinci/EU-Tax-Calculator" target="_blank" rel="noreferrer">the public repository</a>.
        The site is statically hosted on GitHub Pages (GitHub, Inc.).
      </p>

      <h2 className={h2}>2. No accounts, no tracking, no data transfers</h2>
      <p className={p}>
        Everything happens in your browser. We operate no backend, set no cookies, run no analytics,
        serve no ads and use no AI or external APIs. Fonts are bundled with the site, so loading a page
        sends no request to any third party. Nothing you type — salary, country, family situation — ever
        leaves your device, except when <em>you</em> choose to share it (share link, e-mail report, PDF you save yourself).
      </p>

      <h2 className={h2}>3. What may be stored on your device</h2>
      <p className={p}>
        Only with your consent (see the banner on your first visit, ePrivacy Directive Art. 5(3) / GDPR Art. 6(1)(a)).
        With “Essential only”, the app runs session-only in memory and stores nothing except your choice itself:
      </p>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        <li className={li}><strong>eutax_consent</strong> — remembers your storage choice (strictly necessary, always kept).</li>
        <li className={li}><strong>eutax_theme</strong> — dark/light preference.</li>
        <li className={li}><strong>eutax_saved</strong> — scenarios you explicitly save for comparison.</li>
        <li className={li}><strong>eutax_history</strong> — your last 10 calculations.</li>
        <li className={li}><strong>tax_calc_cache_v3</strong> — cached results so repeat calculations are instant.</li>
      </ul>
      <p className={p}>
        All entries stay until you clear them — technically: {KNOWN_STORAGE_KEYS.join(', ')}. No expiry is set;
        your browser controls eviction.
      </p>
      <button
        onClick={() => { wipeAllStoredData(); setWiped(true); }}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete all data stored on this device
      </button>
      {wiped && <p className={p} role="status">Done — every key listed above was removed from this browser.</p>}

      <h2 className={h2}>4. Your rights (GDPR Chapter III)</h2>
      <p className={p}>
        Because we hold no personal data about you on any server, rights of access, rectification and erasure
        are exercised directly on your device via the button above or your browser’s “clear site data” function.
        You may withdraw storage consent at any time with the same effect. You also have the right to lodge a
        complaint with your national data protection authority.
      </p>

      <h2 className={h2}>5. Children</h2>
      <p className={p}>This tool is aimed at adults comparing employment income. We knowingly collect nothing from anyone.</p>

      <h2 className={h2}>6. Changes</h2>
      <p className={p}>Material changes will be noted here with a new “last updated” date.</p>
    </PageShell>
  );
}

export function LegalNotice() {
  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-950 flex items-center justify-center">
          <Scale className="w-5 h-5 text-gold-400" />
        </div>
        <h1 className={h1}>Legal Notice</h1>
      </div>
      <p className={p}>Last updated: November 2026.</p>

      <h2 className={h2}>Operator & hosting</h2>
      <p className={p}>
        Independent private project by the repository owner
        (<a className={a} href="https://github.com/ErdalBirinci" target="_blank" rel="noreferrer">github.com/ErdalBirinci</a>).
        Static hosting: GitHub Pages (GitHub, Inc., USA). Contact via the public repository.
      </p>

      <h2 className={h2}>No official affiliation</h2>
      <p className={p}>
        This project is not affiliated with, endorsed by, or acting on behalf of the European Union,
        its institutions, or any member-state tax authority. Links to official sources are provided for
        verification only and do not imply endorsement in either direction.
      </p>

      <h2 className={h2}>Estimates, not advice</h2>
      <p className={p}>
        Results are non-binding estimates from published 2025/2026 brackets. Regional surcharges, church tax
        and individual deductions may not be modelled. Nothing here constitutes tax, legal or financial advice.
        Verify with your local tax authority or a qualified adviser before making decisions. Liability is excluded
        to the extent permitted by law.
      </p>

      <h2 className={h2}>Intellectual property</h2>
      <p className={p}>
        Site source is published on GitHub. Tax law texts, authority names and public statistics remain the
        property of their respective publishers. Country boundary data is used for illustration only and carries
        no legal meaning for borders.
      </p>

      <h2 className={h2}>Donations</h2>
      <p className={p}>
        Voluntary donations via the linked Wise page support hosting and development costs. Donations buy no
        goods, services, influence over results, or priority support.
      </p>

      <h2 className={h2}>No automated decision-making or AI</h2>
      <p className={p}>
        The site contains no AI system within the meaning of Regulation (EU) 2024/1689 (AI Act). All figures are
        computed deterministically from fixed tables; editorial text comes from built-in datasets.
      </p>
    </PageShell>
  );
}
