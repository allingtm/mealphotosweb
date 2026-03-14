'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, MapPin, UtensilsCrossed } from 'lucide-react';
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
import { ImageCarousel } from './ImageCarousel';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface MealCardProps {
  meal: FeedItem;
  index: number;
  isVisible: boolean;
  ratingStartTime: number | null;
  showFollowingIndicator?: boolean;
  onRated?: (score: number, meal: FeedItem) => void;
}

export function MealCard({ meal, index, isVisible, ratingStartTime, showFollowingIndicator, onRated }: MealCardProps) {
  const t = useTranslations('feed');
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const requireAuth = useRequireAuth();
  const isOwnMeal = user?.id === meal.user_id;
  const isPrivate = meal.visibility === 'private';
  const isMultiPhoto = (meal.image_count ?? 1) > 1;

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

      onRated?.(score, meal);
    },
    [meal, ratingStartTime, requireAuth, onRated]
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
      {!isMultiPhoto && !hasBlurDataURL && meal.photo_blur_hash && !imageLoaded && (
        <BlurHashCanvas hash={meal.photo_blur_hash} />
      )}

      {/* Meal photo(s) — full bleed */}
      {isMultiPhoto ? (
        <ImageCarousel
          mealId={meal.id}
          primaryImageUrl={meal.photo_url}
          imageCount={meal.image_count}
          blurHash={meal.photo_blur_hash}
          blurDataURL={meal.blurDataURL}
          priority={index === 0}
          onImageLoad={() => setImageLoaded(true)}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          className="absolute inset-0 z-0 cursor-pointer"
          aria-label={t('mealPhotoAlt', { title: meal.title, username: meal.username })}
          onClick={() => {
            if (!user) {
              openAuthModal();
              return;
            }
            router.push(`/meal/${meal.id}`);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!user) {
                openAuthModal();
                return;
              }
              router.push(`/meal/${meal.id}`);
            }
          }}
        >
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
        </div>
      )}

      {/* Lock icon for private posts */}
      {isPrivate && (
        <div
          className="absolute top-4 right-4 z-20 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(18, 18, 18, 0.6)',
          }}
          aria-label="Private post"
        >
          <Lock size={16} strokeWidth={1.5} color="var(--text-primary)" />
        </div>
      )}

      {/* Top gradient — dark->transparent for title/author legibility */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-[5]"
        style={{
          height: '35%',
          background: 'linear-gradient(to bottom, rgba(18, 18, 18, 0.7), rgba(18, 18, 18, 0))',
        }}
      />

      {/* Bottom gradient — transparent->dark for rating bar */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-[5]"
        style={{
          height: '25%',
          background: 'var(--gradient-overlay)',
        }}
      />

      {/* Top content — author, title, venue */}
      <div className="absolute inset-x-0 top-0 z-10 px-4 pt-4" style={{ maxWidth: '75%' }}>
        {/* Author info */}
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 8 }}
        >
          <Link
            href={`/profile/${meal.username}`}
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: 'none' }}
          >
            {meal.avatar_url ? (
              <Image
                src={meal.avatar_url}
                alt={meal.username}
                width={36}
                height={36}
                className="rounded-full"
                style={{ border: '2px solid rgba(255, 255, 255, 0.2)' }}
              />
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: 'var(--bg-elevated)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
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
          </Link>
          {showFollowingIndicator && meal.user_is_following && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              · {t('followingLabel')}
            </span>
          )}
          {isPrivate ? (
            <span
              className="flex items-center gap-0.5"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              · Private
            </span>
          ) : meal.location_city ? (
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
          ) : null}
        </div>

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
      </div>

      {/* Score badge — top right */}
      <div className="absolute top-4 right-4 z-10">
        <ScoreBadge score={avgRating} visible={showScore} />
      </div>

      {/* Right-side action column — just below vertical centre */}
      <div
        className="absolute right-3 z-10"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <ActionColumn
          mealId={meal.id}
          title={meal.title}
          recipeRequestCount={meal.recipe_request_count}
          recipeUnlockThreshold={meal.recipe_unlock_threshold}
          recipeUnlocked={meal.recipe_unlocked}
          commentCount={meal.comment_count}
          commentsEnabled={meal.comments_enabled ?? true}
          hasRequested={meal.user_has_requested}
          visibility={meal.visibility}
        />
      </div>

      {/* Bottom content — rating bar only */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-12 md:pb-5">
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
