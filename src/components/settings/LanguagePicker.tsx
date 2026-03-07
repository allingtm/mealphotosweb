'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/routing';

export function LanguagePicker() {
  const t = useTranslations('settings');
  const currentLocale = useLocale();

  const setLocale = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    window.location.reload();
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--text-secondary)' }}>
          <Globe size={20} strokeWidth={1.5} />
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>
          {t('language')}
        </span>
      </div>
      <select
        value={currentLocale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--accent-primary)',
          backgroundColor: 'var(--bg-elevated)',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          appearance: 'auto',
        }}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
