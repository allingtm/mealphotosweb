'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function FeedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('feed');
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
        {t('failedToLoad')}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
        }}
      >
        {t('failedToLoadDesc')}
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

      {/* TODO: remove after confirming CSP fix */}
      <details
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          fontSize: 11,
          textAlign: 'left',
          maxWidth: '90vw',
          wordBreak: 'break-all',
        }}
      >
        <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error details</summary>
        <p><strong>Name:</strong> {error?.name ?? 'unknown'}</p>
        <p><strong>Message:</strong> {error?.message ?? 'unknown'}</p>
        <p><strong>Digest:</strong> {error?.digest ?? 'none'}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}><strong>Stack:</strong> {error?.stack?.slice(0, 500) ?? 'no stack'}</p>
      </details>
    </div>
  );
}
