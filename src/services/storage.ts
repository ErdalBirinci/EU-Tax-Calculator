/**
 * Consent-gated browser storage (ePrivacy / GDPR).
 *
 * Nothing is written to persistent storage until the visitor accepts
 * non-essential storage in the consent banner. With "essential only",
 * values live in an in-memory map so the app keeps working for the
 * session without leaving traces on the device.
 *
 * The consent choice itself (`eutax_consent`) is strictly necessary
 * storage and is always persisted.
 */
export type ConsentChoice = 'all' | 'essential';

const CONSENT_KEY = 'eutax_consent';
const memory = new Map<string, string>();

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'all' || v === 'essential' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* storage unavailable — session-only mode */
  }
  if (choice === 'essential') memory.clear();
}

export function storageGet(key: string): string | null {
  if (getConsent() === 'all') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

export function storageSet(key: string, value: string): void {
  if (getConsent() === 'all') {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      /* quota/private mode — fall back to memory */
    }
  }
  memory.set(key, value);
}

export function storageRemove(key: string): void {
  memory.delete(key);
  if (getConsent() === 'all') {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** Delete every key the app may have persisted (privacy page / consent withdrawal). */
export function wipeAllStoredData(): void {
  memory.clear();
  if (typeof localStorage === 'undefined') return;
  try {
    for (const k of KNOWN_STORAGE_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Keys the app may persist (listed in the Privacy Policy). */
export const KNOWN_STORAGE_KEYS = [
  'eutax_consent',
  'eutax_theme',
  'eutax_saved',
  'eutax_history',
  'tax_calc_cache_v3',
] as const;
