'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

interface MealGridItem {
  id: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  created_at?: string;
}

interface MealGridProps {
  meals: MealGridItem[];
  showHeart?: boolean;
  authorView?: boolean;
  fetchUrl?: string;
}

export function MealGrid({ meals: initialMeals, showHeart, authorView, fetchUrl }: MealGridProps) {
  const t = useTranslations('profile');
  const [meals, setMeals] = useState<MealGridItem[]>(initialMeals);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialMeals.length >= 18 && initialMeals[initialMeals.length - 1]?.created_at
      ? initialMeals[initialMeals.length - 1].created_at!
      : null
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when initialMeals change (e.g. tab switch)
  useEffect(() => {
    setMeals(initialMeals);
    setNextCursor(
      initialMeals.length >= 18 && initialMeals[initialMeals.length - 1]?.created_at
        ? initialMeals[initialMeals.length - 1].created_at!
        : null
    );
  }, [initialMeals]);

  const fetchMore = useCallback(async () => {
    if (!fetchUrl || !nextCursor || loading) return;
    setLoading(true);
    try {
      const separator = fetchUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${fetchUrl}${separator}cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data = await res.json();
      const newMeals = data.meals ?? [];
      setMeals((prev) => [...prev, ...newMeals]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, nextCursor, loading]);

  // Fetch initial data when fetchUrl is provided but no initialMeals (restaurant tab switching)
  useEffect(() => {
    if (fetchUrl && initialMeals.length === 0) {
      const fetchInitial = async () => {
        setLoading(true);
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) return;
          const data = await res.json();
          setMeals(data.meals ?? []);
          setNextCursor(data.nextCursor);
        } finally {
          setLoading(false);
        }
      };
      fetchInitial();
    }
  }, [fetchUrl, initialMeals.length]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor || !fetchUrl) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          fetchMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loading, fetchMore, fetchUrl]);

  if (meals.length === 0 && !loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: '48px 16px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
        }}
      >
        {showHeart ? t('noSavedMeals') : t('noMealsUploaded')}
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-3"
        style={{ gap: 2 }}
      >
        {meals.map((meal, index) => (
          <Link
            key={meal.id}
            href={authorView ? `/my-meals/${meal.id}` : `/meal/${meal.id}`}
            className="relative block"
            style={{ aspectRatio: '1' }}
            onClick={() => {
              posthog.capture(ANALYTICS_EVENTS.PROFILE_MEAL_GRID_TAPPED, {
                meal_id: meal.id,
                position_in_grid: index,
              });
            }}
          >
            <Image
              src={meal.photo_url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, 213px"
            />
            {/* Score badge */}
            {meal.rating_count > 0 && (
              <span
                className="absolute bottom-1 right-1 flex items-center justify-center"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: getScoreColor(Number(meal.avg_rating)),
                  backgroundColor: 'rgba(18, 18, 18, 0.75)',
                  borderRadius: 6,
                  padding: '2px 6px',
                  minWidth: 28,
                }}
              >
                {Number(meal.avg_rating).toFixed(1)}
              </span>
            )}
            {/* Heart overlay for saved tab */}
            {showHeart && (
              <span
                className="absolute top-1 right-1 flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(18, 18, 18, 0.6)',
                  borderRadius: 'var(--radius-full)',
                  width: 24,
                  height: 24,
                }}
              >
                <Heart
                  size={14}
                  strokeWidth={1.5}
                  fill="var(--accent-primary)"
                  color="var(--accent-primary)"
                />
              </span>
            )}
          </Link>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
    </>
  );
}
