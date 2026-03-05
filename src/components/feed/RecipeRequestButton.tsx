'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { Confetti } from '@/components/ui/Confetti';
import posthog from 'posthog-js';

interface RecipeRequestButtonProps {
  mealId: string;
  initialCount: number;
  threshold: number;
  unlocked: boolean;
  hasRequested?: boolean;
}

export function RecipeRequestButton({
  mealId,
  initialCount,
  threshold,
  unlocked,
  hasRequested: initialHasRequested = false,
}: RecipeRequestButtonProps) {
  const t = useTranslations('actions');
  const [count, setCount] = useState(initialCount);
  const [requested, setRequested] = useState(initialHasRequested);
  const [animating, setAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requireAuth = useRequireAuth();

  const nearThreshold = !unlocked && count >= threshold * 0.85;
  const progress = Math.min(count / threshold, 1);

  const handleToggle = useCallback(async () => {
    if (unlocked || submitting) return;

    try {
      await requireAuth();
    } catch {
      return; // Auth was dismissed
    }

    const supabase = createClient();
    setSubmitting(true);

    if (requested) {
      // Optimistic update
      setRequested(false);
      setCount((c) => Math.max(c - 1, 0));

      const { data, error } = await supabase.rpc('unrequest_recipe', {
        p_meal_id: mealId,
      });

      setSubmitting(false);

      if (error) {
        // Revert on error
        setRequested(true);
        setCount((c) => c + 1);
        return;
      }

      const result = data as { request_count: number; threshold: number; unlocked: boolean };
      setCount(result.request_count);

      posthog.capture(ANALYTICS_EVENTS.RECIPE_UNREQUESTED, {
        meal_id: mealId,
        current_count: result.request_count,
      });
    } else {
      // Optimistic update
      setRequested(true);
      setCount((c) => c + 1);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);

      const { data, error } = await supabase.rpc('request_recipe', {
        p_meal_id: mealId,
      });

      setSubmitting(false);

      if (error) {
        // Revert on error
        setRequested(false);
        setCount((c) => Math.max(c - 1, 0));
        return;
      }

      const result = data as { request_count: number; threshold: number; unlocked: boolean };
      setCount(result.request_count);

      if (result.unlocked) {
        setShowConfetti(true);
      }

      posthog.capture(ANALYTICS_EVENTS.RECIPE_REQUESTED, {
        meal_id: mealId,
        current_count: result.request_count,
        threshold: result.threshold,
      });
    }
  }, [mealId, requested, unlocked, submitting, requireAuth]);

  return (
    <button
      onClick={handleToggle}
      disabled={submitting}
      className="flex flex-col items-center gap-0.5 relative"
      aria-label={t('requestRecipe', { count })}
    >
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(18, 18, 18, 0.5)',
        }}
      >
        <Heart
          size={24}
          strokeWidth={1.5}
          fill={requested || unlocked ? 'var(--accent-primary)' : 'none'}
          color={
            requested || unlocked
              ? 'var(--accent-primary)'
              : 'var(--text-primary)'
          }
          style={{
            transform: animating ? 'scale(1.3)' : 'scale(1)',
            transition: 'transform 300ms ease-out',
            animation: nearThreshold && !requested ? 'pulse-glow 2s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          transform: animating ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 300ms ease-out',
        }}
      >
        {count}
      </span>
      {nearThreshold && !unlocked && (
        <div
          style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(245, 240, 232, 0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </button>
  );
}
