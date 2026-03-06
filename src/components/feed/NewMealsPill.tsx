'use client';

import { useTranslations } from 'next-intl';
import { ArrowUp } from 'lucide-react';

interface NewMealsPillProps {
  count: number;
  onTap: () => void;
}

export function NewMealsPill({ count, onTap }: NewMealsPillProps) {
  const t = useTranslations('feed');

  if (count <= 0) return null;

  return (
    <button
      onClick={onTap}
      className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 shadow-lg"
      style={{
        top: 100,
        backgroundColor: 'var(--accent-primary)',
        color: 'var(--bg-primary)',
        padding: '8px 16px',
        borderRadius: 999,
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <ArrowUp size={14} strokeWidth={2} />
      {count === 1 ? t('newMeal') : t('newMeals', { count })}
    </button>
  );
}
