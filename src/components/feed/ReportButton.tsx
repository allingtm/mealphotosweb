'use client';

import { MoreVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReportButtonProps {
  mealId: string;
}

export function ReportButton({ mealId: _mealId }: ReportButtonProps) {
  const t = useTranslations('actions');

  return (
    <button
      className="flex items-center justify-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(18, 18, 18, 0.5)',
      }}
      aria-label={t('moreOptions')}
    >
      <MoreVertical
        size={24}
        strokeWidth={1.5}
        color="var(--text-primary)"
      />
    </button>
  );
}
