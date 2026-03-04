'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import {
  hasConsentBeenRecorded,
  acceptAllCookies,
  declineOptionalCookies,
  setConsent,
  getConsent,
} from '@/lib/cookies';
import posthog from 'posthog-js';

export function CookieConsentBanner() {
  const t = useTranslations('cookies');
  const isVisible = useAppStore((s) => s.isCookieBannerVisible);
  const showBanner = useAppStore((s) => s.showCookieBanner);
  const hideBanner = useAppStore((s) => s.hideCookieBanner);
  const isPrefsOpen = useAppStore((s) => s.isCookiePreferencesOpen);
  const openPrefs = useAppStore((s) => s.openCookiePreferences);

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    if (!hasConsentBeenRecorded()) {
      showBanner();
    }
  }, [showBanner]);

  useEffect(() => {
    if (isPrefsOpen) {
      setAnalyticsEnabled(getConsent().analytics);
    }
  }, [isPrefsOpen]);

  const handleAcceptAll = () => {
    acceptAllCookies();
    posthog.opt_in_capturing();
    hideBanner();
  };

  const handleDecline = () => {
    declineOptionalCookies();
    posthog.opt_out_capturing();
    hideBanner();
  };

  const handleSavePreferences = () => {
    setConsent({ analytics: analyticsEnabled });
    if (analyticsEnabled) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
    hideBanner();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[90] flex justify-center p-4">
      <div
        className="w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--bg-elevated)',
          borderRadius: 'var(--radius-modal)',
          padding: '20px 24px',
        }}
        role="dialog"
        aria-label={t('bannerTitle')}
      >
        {!isPrefsOpen ? (
          <>
            <h3
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {t('bannerTitle')}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {t('bannerDescription')}
            </p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleDecline}
                className="flex-1 rounded-xl transition-opacity"
                style={{
                  height: 44,
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t('declineOptional')}
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-xl transition-opacity"
                style={{
                  height: 44,
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {t('acceptAll')}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={openPrefs}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {t('managePreferences')}
              </button>
              <a
                href="/legal/cookies"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {t('policyTitle')}
              </a>
            </div>
          </>
        ) : (
          <>
            <h3
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 16,
              }}
            >
              {t('preferencesTitle')}
            </h3>

            {/* Essential — always on */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 mb-3"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {t('essential')}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t('essentialDescription')}
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  marginLeft: 12,
                }}
              >
                {t('alwaysOn')}
              </span>
            </div>

            {/* Analytics — toggleable */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 mb-4"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {t('analytics')}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t('analyticsDescription')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analyticsEnabled ? 'true' : 'false'}
                aria-label={t('analytics')}
                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                className="flex-shrink-0 ml-3 relative rounded-full transition-colors"
                style={{
                  width: 44,
                  height: 24,
                  backgroundColor: analyticsEnabled
                    ? 'var(--accent-primary)'
                    : 'var(--bg-surface)',
                  border: analyticsEnabled
                    ? 'none'
                    : '1px solid var(--text-secondary)',
                }}
              >
                <span
                  className="block rounded-full transition-transform"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: analyticsEnabled
                      ? 'var(--bg-primary)'
                      : 'var(--text-secondary)',
                    transform: analyticsEnabled
                      ? 'translateX(22px)'
                      : 'translateX(3px)',
                    marginTop: 3,
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="w-full rounded-xl transition-opacity"
              style={{
                height: 44,
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {t('savePreferences')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
