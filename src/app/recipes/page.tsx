'use client';

import { ChefHat } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppBar } from '@/components/layout/AppBar';

export default function RecipesPage() {
  const t = useTranslations('recipes');

  return (
    <div
      className="md:overflow-y-auto md:flex-1 md:min-h-0"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <AppBar />
        <div
          className="flex flex-col items-center justify-center"
          style={{
            minHeight: '60vh',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <ChefHat
            size={48}
            strokeWidth={1}
            color="var(--text-secondary)"
          />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '16px 0 8px',
            }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--text-secondary)',
              maxWidth: 360,
            }}
          >
            {t('comingSoon')} — {t('comingSoonDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
