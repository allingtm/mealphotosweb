'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2, MessageSquareOff, MessageSquare, BellOff, Bell } from 'lucide-react';
import { RatingBar } from '@/components/feed/RatingBar';
import { RecipeRequestProgress } from './RecipeRequestProgress';
import { RecipeDisplay } from './RecipeDisplay';
import { RecipeForm } from './RecipeForm';
import { DeleteMealDialog } from './DeleteMealDialog';
import { showToast } from '@/components/ui/Toast';
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
  commentsEnabled?: boolean;
  commentsMuted?: boolean;
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
  commentsEnabled: initialCommentsEnabled = true,
  commentsMuted: initialCommentsMuted = false,
}: MealDetailClientProps) {
  const tScore = useTranslations('score');
  const tRecipe = useTranslations('recipe');
  const [hasRated, setHasRated] = useState(initialHasRated);
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [recipe, setRecipe] = useState<Recipe | null>(initialRecipe);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(initialCommentsEnabled);
  const [commentsMuted, setCommentsMuted] = useState(initialCommentsMuted);

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

  const toggleComments = useCallback(async () => {
    const newVal = !commentsEnabled;
    setCommentsEnabled(newVal);
    setShowAuthorMenu(false);
    try {
      const res = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments_enabled: newVal }),
      });
      if (!res.ok) throw new Error();
      showToast(newVal ? 'Comments enabled' : 'Comments disabled', 'success');
    } catch {
      setCommentsEnabled(!newVal);
      showToast('Failed to update', 'error');
    }
  }, [commentsEnabled, mealId]);

  const toggleMute = useCallback(async () => {
    const newVal = !commentsMuted;
    setCommentsMuted(newVal);
    setShowAuthorMenu(false);
    try {
      const res = await fetch(`/api/meals/${mealId}/mute`, { method: 'POST' });
      if (!res.ok) throw new Error();
      showToast(newVal ? 'Comment notifications muted' : 'Comment notifications unmuted', 'success');
      posthog.capture(newVal ? ANALYTICS_EVENTS.MEAL_COMMENTS_MUTED : ANALYTICS_EVENTS.MEAL_COMMENTS_UNMUTED, {
        meal_id: mealId,
      });
    } catch {
      setCommentsMuted(!newVal);
      showToast('Failed to update', 'error');
    }
  }, [commentsMuted, mealId]);

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

      {/* Author menu (own meals only) */}
      {isOwnMeal && (
        <div style={{ position: 'relative', marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setShowAuthorMenu((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl"
            style={{
              height: 48,
              backgroundColor: 'transparent',
              border: '1px solid var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <MoreVertical size={18} strokeWidth={1.5} />
            Manage meal
          </button>

          {showAuthorMenu && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setShowAuthorMenu(false)}
              />
              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 4,
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  zIndex: 50,
                  border: '1px solid var(--bg-elevated)',
                }}
              >
                <button
                  type="button"
                  onClick={toggleComments}
                  className="flex w-full items-center gap-3 px-4"
                  style={{
                    height: 48,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                >
                  {commentsEnabled ? (
                    <MessageSquareOff size={18} strokeWidth={1.5} />
                  ) : (
                    <MessageSquare size={18} strokeWidth={1.5} />
                  )}
                  {commentsEnabled ? 'Turn off comments' : 'Turn on comments'}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex w-full items-center gap-3 px-4"
                  style={{
                    height: 48,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                >
                  {commentsMuted ? (
                    <Bell size={18} strokeWidth={1.5} />
                  ) : (
                    <BellOff size={18} strokeWidth={1.5} />
                  )}
                  {commentsMuted ? 'Unmute comment notifications' : 'Mute comment notifications'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthorMenu(false);
                    setShowDeleteDialog(true);
                  }}
                  className="flex w-full items-center gap-3 px-4"
                  style={{
                    height: 48,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--status-error)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                  }}
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                  Delete meal
                </button>
              </div>
            </>
          )}

          <DeleteMealDialog
            mealId={mealId}
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
          />
        </div>
      )}
    </div>
  );
}
