'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, UtensilsCrossed } from 'lucide-react';
import type { FeedItem } from '@/types/database';
import { useAppStore } from '@/lib/store';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { createClient } from '@/lib/supabase/client';
import { ratingSchema } from '@/lib/validations/meal';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import { RatingBar } from './RatingBar';
import { ScoreBadge } from './ScoreBadge';
import { ActionColumn } from './ActionColumn';
import { BlurHashCanvas } from './BlurHashCanvas';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface MealCardProps {
  meal: FeedItem;
  index: number;
  isVisible: boolean;
  ratingStartTime: number | null;
}

export function MealCard({ meal, index, isVisible, ratingStartTime }: MealCardProps) {
  const t = useTranslations('feed');
  const user = useAppStore((s) => s.user);
  const requireAuth = useRequireAuth();
  const isOwnMeal = user?.id === meal.user_id;

  const [avgRating, setAvgRating] = useState(meal.avg_rating);
  const [hasRated, setHasRated] = useState(meal.user_has_rated);
  const [showScore, setShowScore] = useState(meal.user_has_rated);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleRate = useCallback(
    async (score: number) => {
      // Auth gate — opens sign-up modal if not logged in
      try {
        await requireAuth();
      } catch {
        return;
      }

      // Client-side validation (without turnstile for now)
      const parsed = ratingSchema.safeParse({
        meal_id: meal.id,
        score,
        turnstile_token: 'pending', // Turnstile integrated in Chapter 6
      });
      if (!parsed.success) return;

      const supabase = createClient();
      const { data, error } = await supabase.rpc('rate_meal', {
        p_meal_id: meal.id,
        p_score: score,
      });

      if (error) return;

      const result = data as { avg_rating: number; rating_count: number };
      setAvgRating(result.avg_rating);
      setHasRated(true);
      setShowScore(true);

      const timeToRate = ratingStartTime
        ? (Date.now() - ratingStartTime) / 1000
        : null;

      posthog.capture(ANALYTICS_EVENTS.MEAL_RATED, {
        score,
        meal_id: meal.id,
        time_to_rate_seconds: timeToRate,
      });
    },
    [meal.id, ratingStartTime, requireAuth]
  );

  if (!isVisible) {
    return <div className="snap-start" style={{ height: 'var(--feed-card-height)' }} />;
  }

  const hasBlurDataURL = !!meal.blurDataURL;

  return (
    <div
      className="snap-start relative overflow-hidden"
      style={{ height: 'var(--feed-card-height)' }}
    >
      {/* Blur-hash placeholder — client canvas fallback when no server blurDataURL */}
      {!hasBlurDataURL && meal.photo_blur_hash && !imageLoaded && (
        <BlurHashCanvas hash={meal.photo_blur_hash} />
      )}

      {/* Meal photo — full bleed */}
      <Image
        src={meal.photo_url}
        alt={t('mealPhotoAlt', { title: meal.title, username: meal.username })}
        fill
        className="object-cover"
        sizes="100vw"
        priority={index === 0}
        {...(hasBlurDataURL
          ? { placeholder: 'blur' as const, blurDataURL: meal.blurDataURL }
          : {})}
        onLoad={() => setImageLoaded(true)}
        style={{
          opacity: hasBlurDataURL || imageLoaded ? 1 : 0,
          transition: 'opacity 200ms',
        }}
      />

      {/* Gradient overlay — lower ~40% */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '45%',
          background: 'var(--gradient-overlay)',
        }}
      />

      {/* Score badge — top right */}
      <div className="absolute top-4 right-4 z-10">
        <ScoreBadge score={avgRating} visible={showScore} />
      </div>

      {/* Right-side action column */}
      <div
        className="absolute right-3 z-10"
        style={{ bottom: 110 }}
      >
        <ActionColumn
          mealId={meal.id}
          title={meal.title}
          recipeRequestCount={meal.recipe_request_count}
          recipeUnlockThreshold={meal.recipe_unlock_threshold}
          recipeUnlocked={meal.recipe_unlocked}
          commentCount={meal.comment_count}
        />
      </div>

      {/* Bottom content — overlaid on gradient */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-12 md:pb-2">
        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-emphasis)',
            marginBottom: 8,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          {meal.title}
        </h2>

        {/* Venue pill */}
        {meal.venue_name && meal.venue_mapbox_id && (
          <Link
            href={`/restaurant/${encodeURIComponent(meal.venue_mapbox_id)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px 4px 8px',
              borderRadius: 999,
              backgroundColor: 'rgba(232, 168, 56, 0.15)',
              marginBottom: 8,
              textDecoration: 'none',
            }}
          >
            <UtensilsCrossed
              size={12}
              strokeWidth={1.5}
              style={{ color: 'var(--accent-primary)' }}
            />
            {meal.venue_verified && <VerifiedBadge size={12} />}
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--accent-primary)',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {meal.venue_name}
            </span>
          </Link>
        )}

        {/* Author info */}
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 16 }}
        >
          {meal.avatar_url ? (
            <Image
              src={meal.avatar_url}
              alt={meal.username}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div
              className="rounded-full"
              style={{
                width: 28,
                height: 28,
                backgroundColor: 'var(--bg-elevated)',
              }}
            />
          )}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            @{meal.username}
          </span>
          {meal.location_city && (
            <span
              className="flex items-center gap-0.5"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <MapPin size={14} strokeWidth={1.5} />
              {meal.location_city}
            </span>
          )}
        </div>

        {/* Rating bar */}
        <RatingBar
          mealId={meal.id}
          isOwnMeal={isOwnMeal}
          hasRated={hasRated}
          existingRating={meal.user_rating}
          onRate={handleRate}
        />
      </div>
    </div>
  );
}
