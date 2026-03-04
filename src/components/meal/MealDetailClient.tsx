'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { useTranslations } from 'next-intl';
import { RatingBar } from '@/components/feed/RatingBar';
import { RecipeRequestProgress } from './RecipeRequestProgress';
import { RecipeDisplay } from './RecipeDisplay';
import { RecipeForm } from './RecipeForm';
import type { Recipe } from '@/types/database';
import posthog from 'posthog-js';

interface MealDetailClientProps {
  mealId: string;
  isOwnMeal: boolean;
  hasRated: boolean;
  existingRating: number | null;
  hasRequested: boolean;
  recipeRequestCount: number;
  recipeUnlockThreshold: number;
  recipeUnlocked: boolean;
  recipe: Recipe | null;
  avgRating: number;
  ratingCount: number;
  authorUsername: string;
  onRatingChange?: (newAvg: number) => void;
}

export function MealDetailClient({
  mealId,
  isOwnMeal,
  hasRated: initialHasRated,
  existingRating,
  hasRequested,
  recipeRequestCount,
  recipeUnlockThreshold,
  recipeUnlocked,
  recipe: initialRecipe,
  avgRating: initialAvgRating,
  ratingCount: initialRatingCount,
  authorUsername,
}: MealDetailClientProps) {
  const tScore = useTranslations('score');
  const tRecipe = useTranslations('recipe');
  const [hasRated, setHasRated] = useState(initialHasRated);
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [recipe, setRecipe] = useState<Recipe | null>(initialRecipe);

  const handleRate = useCallback(
    async (score: number) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('rate_meal', {
        p_meal_id: mealId,
        p_score: score,
      });

      if (error) return;

      const result = data as { avg_rating: number; rating_count: number };
      setAvgRating(result.avg_rating);
      setRatingCount(result.rating_count);
      setHasRated(true);

      posthog.capture(ANALYTICS_EVENTS.MEAL_RATED, {
        score,
        meal_id: mealId,
      });
    },
    [mealId]
  );

  const handleRecipeAdded = useCallback((newRecipe: Recipe) => {
    setRecipe(newRecipe);
  }, []);

  return (
    <div>
      {/* Rating bar */}
      <div style={{ marginBottom: 24 }}>
        <RatingBar
          mealId={mealId}
          isOwnMeal={isOwnMeal}
          hasRated={hasRated}
          existingRating={existingRating}
          onRate={handleRate}
        />
        {hasRated && (
          <div
            className="flex items-center justify-center gap-2"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 4,
            }}
          >
            <span>
              {tScore('avgFrom', { score: Number(avgRating).toFixed(1), count: ratingCount })}
            </span>
          </div>
        )}
      </div>

      {/* Recipe section */}
      {!recipeUnlocked ? (
        <RecipeRequestProgress
          mealId={mealId}
          initialCount={recipeRequestCount}
          threshold={recipeUnlockThreshold}
          unlocked={recipeUnlocked}
          hasRequested={hasRequested}
        />
      ) : recipe ? (
        <RecipeDisplay recipe={recipe} />
      ) : isOwnMeal ? (
        <RecipeForm mealId={mealId} onRecipeAdded={handleRecipeAdded} />
      ) : (
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--radius-card)',
            backgroundColor: 'var(--bg-surface)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          {tRecipe('comingSoon', { username: authorUsername })}
        </div>
      )}
    </div>
  );
}
