'use client';

import { useTranslations } from 'next-intl';
import { Store, Heart, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const BUSINESS_FEATURES = [
  'businessFeature1',
  'businessFeature2',
  'businessFeature3',
  'businessFeature4',
] as const;

const CONSUMER_FEATURES = [
  'consumerFeature1',
  'consumerFeature2',
  'consumerFeature3',
  'consumerFeature4',
] as const;

export function UnauthenticatedState() {
  const t = useTranslations('mePage');
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  return (
    <div className="w-full mx-auto px-4 pt-8 pb-24 max-w-120 md:max-w-4xl md:overflow-y-auto md:flex-1 md:min-h-0">
      {/* Hero */}
      <h1
        className="text-center"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--accent-primary)',
          marginBottom: 8,
        }}
      >
        {t('heroTitle')}
      </h1>
      <p
        className="text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 32,
        }}
      >
        {t('heroSubtitle')}
      </p>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Consumer Card */}
        <div
          className="rounded-3xl p-6 flex flex-col md:flex-1"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--accent-primary)',
          }}
        >
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              backgroundColor: 'rgba(232, 168, 56, 0.15)',
            }}
          >
            <Heart size={24} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          </div>

          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            {t('consumerTitle')}
          </h2>

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}
          >
            {t('consumerSubtitle')}
          </p>

          <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
            {CONSUMER_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <Check
                  size={16}
                  strokeWidth={2}
                  style={{ color: 'var(--status-success)', marginTop: 2, flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: 'var(--accent-primary)',
              marginBottom: 16,
            }}
          >
            {t('consumerPrice')}
          </p>

          <button
            type="button"
            onClick={() => openAuthModal('signup')}
            className="w-full py-3 rounded-full transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {t('consumerCTA')}
          </button>
        </div>

        {/* Business Card */}
        <div
          className="rounded-3xl p-6 flex flex-col md:flex-1"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
          }}
        >
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              backgroundColor: 'rgba(245, 240, 232, 0.08)',
            }}
          >
            <Store size={24} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </div>

          <h2
            className="text-center"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            {t('businessTitle')}
          </h2>

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}
          >
            {t('businessSubtitle')}
          </p>

          <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
            {BUSINESS_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <Check
                  size={16}
                  strokeWidth={2}
                  style={{ color: 'var(--status-success)', marginTop: 2, flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>

          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}
          >
            {t('businessPrice')}
          </p>

          <button
            type="button"
            onClick={() => openAuthModal('signup')}
            className="w-full py-3 rounded-full transition-all bg-transparent text-[#121212] border-2 border-[#E8A838] hover:bg-[rgba(232,168,56,0.1)] hover:scale-[1.02] text-[15px] font-semibold"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {t('businessCTA')}
          </button>
        </div>
      </div>

      {/* Sign-in for existing users */}
      <p
        className="text-center mt-8"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}
      >
        {t('alreadyHaveAccount')}{' '}
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="hover:underline"
          style={{
            color: 'var(--accent-primary)',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
        >
          {t('signIn')}
        </button>
      </p>
    </div>
  );
}
