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

  // Diagnostics — visible on mobile for debugging
  const errorInfo = {
    message: error?.message ?? 'unknown',
    name: error?.name ?? 'unknown',
    digest: error?.digest ?? 'none',
    stack: error?.stack?.slice(0, 500) ?? 'no stack',
  };

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

      {/* Debug info — remove after diagnosing mobile issue */}
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
        <p><strong>Name:</strong> {errorInfo.name}</p>
        <p><strong>Message:</strong> {errorInfo.message}</p>
        <p><strong>Digest:</strong> {errorInfo.digest}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}><strong>Stack:</strong> {errorInfo.stack}</p>
      </details>
    </div>
  );
}
