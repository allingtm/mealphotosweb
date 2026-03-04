export type CookieCategory = 'essential' | 'analytics';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
}

const COOKIE_CONSENT_KEY = 'mp_cookie_consent';

const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
  timestamp: '',
};

/** Check if the user has made a cookie consent choice */
export function hasConsentBeenRecorded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) !== null;
}

/** Get the current consent state */
export function getConsent(): CookieConsent {
  if (typeof window === 'undefined') return DEFAULT_CONSENT;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return DEFAULT_CONSENT;
    return JSON.parse(stored) as CookieConsent;
  } catch {
    return DEFAULT_CONSENT;
  }
}

/** Save consent preferences */
export function setConsent(
  consent: Omit<CookieConsent, 'timestamp' | 'essential'>
): void {
  const full: CookieConsent = {
    essential: true,
    analytics: consent.analytics,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(full));
}

/** Accept all cookie categories */
export function acceptAllCookies(): void {
  setConsent({ analytics: true });
}

/** Decline optional cookies (keep only essential) */
export function declineOptionalCookies(): void {
  setConsent({ analytics: false });
}
