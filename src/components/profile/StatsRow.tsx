'use client';

import { useTranslations } from 'next-intl';

interface StatsRowProps {
  mealCount: number;
  avgRating: number;
  streak: number;
}

export function StatsRow({ mealCount, avgRating, streak }: StatsRowProps) {
  const t = useTranslations('profile');

  return (
    <div
      className="grid grid-cols-3 text-center"
      style={{ padding: '16px 0', gap: 8 }}
    >
      <StatItem value={String(mealCount)} label={t('meals')} />
      <StatItem
        value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
        label={t('avgRating')}
      />
      <StatItem
        value={streak > 0 ? `${streak}` : '0'}
        label={t('streak')}
        icon={streak > 0 ? '🔥' : undefined}
      />
    </div>
  );
}

function StatItem({ value, label, icon }: { value: string; label: string; icon?: string }) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
        {icon && (
          <span className="animate-streak-pulse inline-block ml-1">{icon}</span>
        )}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginTop: 4,
        }}
      >
        {label}
      </p>
    </div>
  );
}
