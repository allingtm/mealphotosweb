import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  const tCommon = await getTranslations('common');

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-center px-8"
      style={{ height: '100dvh', backgroundColor: 'var(--bg-primary)' }}
    >
      <div style={{ fontSize: 64 }}>🍽️</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          color: 'var(--accent-primary)',
        }}
      >
        404
      </h1>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
        }}
      >
        {t('pageNotFound')}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
          maxWidth: 320,
        }}
      >
        {t('pageNotFoundDesc')}
      </p>
      <Link
        href="/feed"
        className="rounded-full px-6 py-3 transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {tCommon('goToFeed')}
      </Link>
    </div>
  );
}
