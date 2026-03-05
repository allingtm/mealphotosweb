'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Utensils } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FeedItem } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import { MealCard } from './MealCard';
import { OnboardingOverlay } from './OnboardingOverlay';

interface FeedContainerProps {
  initialMeals: FeedItem[];
  initialCursor: string | null;
}

export function FeedContainer({ initialMeals, initialCursor }: FeedContainerProps) {
  const t = useTranslations('feed');
  const [meals, setMeals] = useState<FeedItem[]>(initialMeals);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== null);

  // Virtualisation: track which cards are "near" the viewport
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(
    () => new Set([0, 1, 2])
  );
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Track the current card index for analytics
  const currentIndexRef = useRef(0);
  const cardsRatedRef = useRef(0);
  const cardTimestamps = useRef<Map<number, number>>(new Map());

  // Feed scroll analytics — every 5th card
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const cardHeight = container.clientHeight;
      if (cardHeight === 0) return;
      const index = Math.round(container.scrollTop / cardHeight);

      if (index !== currentIndexRef.current) {
        currentIndexRef.current = index;

        // Record entry time for this card
        if (!cardTimestamps.current.has(index)) {
          cardTimestamps.current.set(index, Date.now());
        }

        // Track every 5th card
        if (index > 0 && index % 5 === 0) {
          posthog.capture(ANALYTICS_EVENTS.FEED_SCROLLED, {
            cards_viewed: index + 1,
            cards_rated: cardsRatedRef.current,
            skip_rate:
              index > 0
                ? ((index - cardsRatedRef.current) / index).toFixed(2)
                : '0',
          });
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for virtualisation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIndices((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const index = Number(
              (entry.target as HTMLElement).dataset.index
            );
            if (isNaN(index)) continue;

            if (entry.isIntersecting) {
              // Make current, prev, and next 2 cards visible
              for (let i = Math.max(0, index - 1); i <= index + 2; i++) {
                next.add(i);
              }
            } else {
              // Remove cards that are far away (more than 2 away from any visible)
              const currentVisible = Array.from(next);
              const nearAny = currentVisible.some(
                (vi) => Math.abs(vi - index) <= 2
              );
              if (!nearAny) {
                next.delete(index);
              }
            }
          }
          return next;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100% 0px',
        threshold: 0,
      }
    );

    // Observe all card wrappers
    cardRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [meals.length]);

  // Infinite scroll — observe sentinel
  useEffect(() => {
    if (!hasMore || loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200% 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, cursor]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_feed', {
      p_limit: 10,
      p_cursor: cursor,
    });

    if (error || !data || data.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const newMeals = data as FeedItem[];
    setMeals((prev) => [...prev, ...newMeals]);

    if (newMeals.length < 10) {
      setHasMore(false);
      setCursor(null);
    } else {
      setCursor(newMeals[newMeals.length - 1].created_at);
    }

    setLoading(false);
  }, [loading, hasMore, cursor]);

  const registerRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      if (el) {
        cardRefs.current.set(index, el);
      } else {
        cardRefs.current.delete(index);
      }
    },
    []
  );

  if (meals.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 text-center px-8"
        style={{ height: 'var(--feed-card-height)' }}
      >
        <Utensils size={64} strokeWidth={1.5} color="var(--accent-primary)" />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
          }}
        >
          {t('noMeals')}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: 'var(--text-secondary)',
          }}
        >
          {t('beFirst')}
        </p>
      </div>
    );
  }

  return (
    <>
      <OnboardingOverlay />
      <div
        ref={scrollContainerRef}
        className="snap-y-mandatory overflow-y-scroll w-full mx-auto md:h-auto! md:flex-1 md:min-h-0"
        style={{ height: 'var(--feed-card-height)', maxWidth: 'var(--feed-max-width)' }}
      >
        {meals.map((meal, index) => (
          <div
            key={meal.id}
            ref={(el) => registerRef(index, el)}
            data-index={index}
          >
            <MealCard
              meal={meal}
              index={index}
              isVisible={visibleIndices.has(index)}
              ratingStartTime={cardTimestamps.current.get(index) ?? null}
            />
          </div>
        ))}

        {/* Sentinel for infinite scroll */}
        {hasMore && (
          <div ref={sentinelRef} style={{ height: 1 }} />
        )}

        {/* Loading indicator */}
        {loading && (
          <div
            className="flex items-center justify-center"
            style={{ height: 80 }}
          >
            <div
              className="animate-spin rounded-full"
              style={{
                width: 24,
                height: 24,
                border: '2px solid var(--text-secondary)',
                borderTopColor: 'var(--accent-primary)',
              }}
            />
          </div>
        )}

        {/* End of feed */}
        {!hasMore && meals.length > 0 && (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center px-8 snap-start"
            style={{
              height: 'var(--feed-card-height)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{ fontSize: 48 }}>🎉</div>
            <p
              style={{
                fontSize: 16,
                color: 'var(--text-secondary)',
              }}
            >
              {t('seenEverything')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
