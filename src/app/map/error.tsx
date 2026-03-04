'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MapError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('map');
  const tCommon = useTranslations('common');

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-center px-8"
      style={{ height: 'calc(100dvh - 56px)', backgroundColor: 'var(--bg-primary)' }}
    >
      <AlertTriangle size={48} strokeWidth={1.5} style={{ color: 'var(--status-error)' }} />
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
        }}
      >
        {t('unavailable')}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
        }}
      >
        {t('unavailableDesc')}
      </p>
      <button
        onClick={reset}
        className="rounded-full px-6 py-3 transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {tCommon('tryAgain')}
      </button>
    </div>
  );
}
