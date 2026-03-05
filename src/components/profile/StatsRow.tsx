'use client';

import { useTranslations } from 'next-intl';

interface StatsRowProps {
  mealCount: number;
  avgRating: number;
  streak?: number;
  ratingsGivenCount?: number;
  isRestaurant?: boolean;
  showStreak?: boolean;
}

export function StatsRow({
  mealCount,
  avgRating,
  streak = 0,
  ratingsGivenCount,
  isRestaurant = false,
  showStreak = true,
}: StatsRowProps) {
  const t = useTranslations('profile');

  const stats: { value: string; label: string; icon?: string }[] = [
    { value: String(mealCount), label: t('meals') },
    { value: avgRating > 0 ? avgRating.toFixed(1) : '—', label: t('avgRating') },
  ];

  if (!isRestaurant && showStreak && streak > 0) {
    stats.push({ value: String(streak), label: t('streak'), icon: '🔥' });
  }

  if (!isRestaurant && ratingsGivenCount !== undefined) {
    stats.push({ value: String(ratingsGivenCount), label: t('ratingsGiven') });
  }

  return (
    <div
      className="flex justify-around text-center"
      style={{ padding: '16px 0', gap: 8 }}
    >
      {stats.map((stat) => (
        <StatItem key={stat.label} value={stat.value} label={stat.label} icon={stat.icon} />
      ))}
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
