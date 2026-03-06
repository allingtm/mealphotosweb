'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { ShareButton } from './ShareButton';
import { RecipeRequestButton } from './RecipeRequestButton';
import { ReportButton } from './ReportButton';
import posthog from 'posthog-js';

interface ActionColumnProps {
  mealId: string;
  title: string;
  recipeRequestCount: number;
  recipeUnlockThreshold: number;
  recipeUnlocked: boolean;
  commentCount: number;
  commentsEnabled?: boolean;
  hasRequested?: boolean;
  visibility?: string;
}

export function ActionColumn({
  mealId,
  title,
  recipeRequestCount,
  recipeUnlockThreshold,
  recipeUnlocked,
  commentCount,
  commentsEnabled = true,
  hasRequested,
  visibility,
}: ActionColumnProps) {
  const t = useTranslations('actions');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const router = useRouter();

  const disabled = !commentsEnabled;

  const handleCommentTap = () => {
    if (!user) {
      openAuthModal();
      return;
    }

    posthog.capture(ANALYTICS_EVENTS.COMMENT_ICON_TAPPED, {
      meal_id: mealId,
      source: 'feed_card',
    });

    router.push(`/meal/${mealId}?comments=1`);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {visibility !== 'private' && <ShareButton mealId={mealId} title={title} />}

      <RecipeRequestButton
        mealId={mealId}
        initialCount={recipeRequestCount}
        threshold={recipeUnlockThreshold}
        unlocked={recipeUnlocked}
        hasRequested={hasRequested}
      />

      <button
        className="flex flex-col items-center gap-0.5"
        aria-label={t('viewComments', { count: commentCount })}
        onClick={handleCommentTap}
        disabled={disabled}
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
            color={disabled ? 'var(--text-secondary)' : 'var(--text-primary)'}
          />
        </div>
        {!disabled && commentCount > 0 && (
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
        )}
      </button>

      <ReportButton mealId={mealId} />
    </div>
  );
}
