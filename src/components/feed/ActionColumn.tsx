'use client';

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ShareButton } from './ShareButton';
import { RecipeRequestButton } from './RecipeRequestButton';
import { ReportButton } from './ReportButton';

interface ActionColumnProps {
  mealId: string;
  title: string;
  recipeRequestCount: number;
  recipeUnlockThreshold: number;
  recipeUnlocked: boolean;
  commentCount: number;
}

export function ActionColumn({
  mealId,
  title,
  recipeRequestCount,
  recipeUnlockThreshold,
  recipeUnlocked,
  commentCount,
}: ActionColumnProps) {
  const t = useTranslations('actions');

  return (
    <div className="flex flex-col items-center gap-3">
      <ShareButton mealId={mealId} title={title} />

      <RecipeRequestButton
        mealId={mealId}
        initialCount={recipeRequestCount}
        threshold={recipeUnlockThreshold}
        unlocked={recipeUnlocked}
      />

      <button
        className="flex flex-col items-center gap-0.5"
        aria-label={t('viewComments', { count: commentCount })}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(18, 18, 18, 0.5)',
          }}
        >
          <MessageCircle
            size={24}
            strokeWidth={1.5}
            color="var(--text-primary)"
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {commentCount}
        </span>
      </button>

      <ReportButton mealId={mealId} />
    </div>
  );
}
