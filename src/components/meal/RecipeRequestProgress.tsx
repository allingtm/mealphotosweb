'use client';

import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';

interface RecipeRequestProgressProps {
  mealId: string;
  initialCount: number;
  threshold: number;
  unlocked: boolean;
  hasRequested: boolean;
}

export function RecipeRequestProgress({
  mealId,
  initialCount,
  threshold,
  unlocked,
  hasRequested: initialHasRequested,
}: RecipeRequestProgressProps) {
  const t = useTranslations('recipe');
  const [count, setCount] = useState(initialCount);
  const [hasRequested, setHasRequested] = useState(initialHasRequested);
  const [submitting, setSubmitting] = useState(false);
  const requireAuth = useRequireAuth();

  const progress = Math.min(count / threshold, 1);
  const nearThreshold = !unlocked && count >= threshold * 0.85;

  const handleRequest = useCallback(async () => {
    if (hasRequested || unlocked || submitting) return;

    await requireAuth();
    setSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase.rpc('request_recipe', {
      p_meal_id: mealId,
    });

    setSubmitting(false);
    if (error) return;

    const result = data as {
      request_count: number;
      threshold: number;
      unlocked: boolean;
    };
    setCount(result.request_count);
    setHasRequested(true);

    posthog.capture(ANALYTICS_EVENTS.RECIPE_REQUESTED, {
      meal_id: mealId,
      current_count: result.request_count,
      threshold: result.threshold,
    });

    if (result.unlocked) {
      posthog.capture(ANALYTICS_EVENTS.RECIPE_UNLOCKED, {
        meal_id: mealId,
        request_count: result.request_count,
      });
    }
  }, [mealId, hasRequested, unlocked, submitting, requireAuth]);

  if (unlocked) return null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Progress text */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 8 }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          <Heart
            size={14}
            strokeWidth={1.5}
            fill="var(--accent-primary)"
            color="var(--accent-primary)"
            style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }}
          />
          {t('wantThisRecipe', { count, threshold })}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          backgroundColor: 'var(--bg-elevated)',
          overflow: 'hidden',
          marginBottom: 12,
        }}
      >
        <div
          className={nearThreshold ? 'animate-pulse-progress' : ''}
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: 'var(--accent-primary)',
            transition: 'width 300ms ease-out',
          }}
        />
      </div>

      {/* Near threshold text */}
      {nearThreshold && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--accent-primary)',
            marginBottom: 12,
          }}
        >
          {t('almostUnlocked')}
        </p>
      )}

      {/* Request button */}
      <button
        onClick={handleRequest}
        disabled={hasRequested || submitting}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: hasRequested
            ? 'var(--bg-elevated)'
            : 'var(--accent-primary)',
          color: hasRequested ? 'var(--text-secondary)' : 'var(--bg-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
          border: 'none',
          cursor: hasRequested || submitting ? 'default' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          transition: 'opacity 200ms',
        }}
      >
        {hasRequested ? t('requested') : t('requestRecipe')}
      </button>
    </div>
  );
}
