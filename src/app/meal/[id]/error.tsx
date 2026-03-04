'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function MealError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-center px-8"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }}
    >
      <AlertTriangle size={48} strokeWidth={1.5} style={{ color: 'var(--status-error)' }} />
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
        }}
      >
        {t('mealUnavailable')}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
        }}
      >
        {t('mealUnavailableDesc')}
      </p>
      <div className="flex gap-3">
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
        <Link
          href="/feed"
          className="rounded-full px-6 py-3 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid var(--bg-elevated)',
          }}
        >
          {tCommon('backToFeed')}
        </Link>
      </div>
    </div>
  );
}
