'use client';

import { MoreVertical } from 'lucide-react';

interface ReportButtonProps {
  mealId: string;
}

export function ReportButton({ mealId: _mealId }: ReportButtonProps) {
  return (
    <button
      className="flex items-center justify-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(18, 18, 18, 0.5)',
      }}
      aria-label="More options"
    >
      <MoreVertical
        size={24}
        strokeWidth={1.5}
        color="var(--text-primary)"
      />
    </button>
  );
}
