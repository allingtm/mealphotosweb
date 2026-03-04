'use client';

import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';

interface RecipeRequestButtonProps {
  mealId: string;
  initialCount: number;
  threshold: number;
  unlocked: boolean;
}

export function RecipeRequestButton({
  mealId,
  initialCount,
  threshold,
  unlocked,
}: RecipeRequestButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [requested, setRequested] = useState(false);
  const [animating, setAnimating] = useState(false);
  const requireAuth = useRequireAuth();

  const nearThreshold = !unlocked && count >= threshold * 0.85;
  const progress = Math.min(count / threshold, 1);

  const handleRequest = useCallback(async () => {
    if (requested || unlocked) return;

    await requireAuth();

    const supabase = createClient();
    const { data, error } = await supabase.rpc('request_recipe', {
      p_meal_id: mealId,
    });

    if (error) return;

    const result = data as { request_count: number; threshold: number; unlocked: boolean };
    setCount(result.request_count);
    setRequested(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    posthog.capture(ANALYTICS_EVENTS.RECIPE_REQUESTED, {
      meal_id: mealId,
      current_count: result.request_count,
      threshold: result.threshold,
    });
  }, [mealId, requested, unlocked, requireAuth]);

  return (
    <button
      onClick={handleRequest}
      disabled={requested}
      className="flex flex-col items-center gap-0.5 relative"
      aria-label={`Request recipe (${count} requests)`}
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
