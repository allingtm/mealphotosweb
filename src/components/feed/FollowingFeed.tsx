'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Utensils, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FollowingFeedItem } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import { MealCard } from './MealCard';
import { NewMealsPill } from './NewMealsPill';
import { FollowSuggestions } from './FollowSuggestions';

interface FollowingFeedProps {
  onSwitchToDiscover: () => void;
}

export function FollowingFeed({ onSwitchToDiscover }: FollowingFeedProps) {
  const t = useTranslations('feed');
  const [meals, setMeals] = useState<FollowingFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [newMealCount, setNewMealCount] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(null);

  // Virtualisation
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(() => new Set([0, 1, 2]));
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const cardTimestamps = useRef<Map<number, number>>(new Map());
  const currentIndexRef = useRef(0);
  const cardsRatedRef = useRef(0);

  // Initial load
  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get following count to determine empty state variant
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);
        setFollowingCount(count ?? 0);
      }

      const { data, error } = await supabase.rpc('get_following_feed', {
        p_limit: 20,
      });

      if (!error && data) {
        const feedMeals = data as FollowingFeedItem[];
        setMeals(feedMeals);
        if (feedMeals.length > 0) {
          latestTimestampRef.current = feedMeals[0].created_at;
          setCursor(feedMeals.length === 20 ? feedMeals[feedMeals.length - 1].created_at : null);
          setHasMore(feedMeals.length === 20);
        }

        posthog.capture(ANALYTICS_EVENTS.FOLLOWING_FEED_VIEWED, {
          meals_loaded: feedMeals.length,
          followed_count: followingCount,
        });

        if (feedMeals.length === 0) {
          posthog.capture(ANALYTICS_EVENTS.FOLLOWING_FEED_EMPTY, {
            followed_count: followingCount,
          });
        }
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for new meals every 30s
  useEffect(() => {
    if (!latestTimestampRef.current) return;

    const interval = setInterval(async () => {
      if (!latestTimestampRef.current) return;
      const supabase = createClient();
      const { data } = await supabase.rpc('check_new_following_meals', {
        p_since: latestTimestampRef.current,
      });

      const count = typeof data === 'number' ? data : 0;
      if (count > 0) {
        setNewMealCount(count);
        posthog.capture(ANALYTICS_EVENTS.NEW_MEALS_PILL_SHOWN, {
          new_meal_count: count,
        });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [meals.length]);

  // Scroll analytics
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
        if (!cardTimestamps.current.has(index)) {
          cardTimestamps.current.set(index, Date.now());
        }
        if (index > 0 && index % 5 === 0) {
          posthog.capture(ANALYTICS_EVENTS.FEED_SCROLLED, {
            feed_type: 'following',
            cards_viewed: index + 1,
            cards_rated: cardsRatedRef.current,
            skip_rate: ((index - cardsRatedRef.current) / index).toFixed(2),
          });
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Virtualisation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIndices((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            if (isNaN(index)) continue;
            if (entry.isIntersecting) {
              for (let i = Math.max(0, index - 1); i <= index + 2; i++) {
                next.add(i);
              }
            } else {
              const currentVisible = Array.from(next);
              const nearAny = currentVisible.some((vi) => Math.abs(vi - index) <= 2);
              if (!nearAny) next.delete(index);
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

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [meals.length]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
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
    const { data, error } = await supabase.rpc('get_following_feed', {
      p_limit: 20,
      p_cursor: cursor,
    });

    if (error || !data || data.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const newMeals = data as FollowingFeedItem[];
    setMeals((prev) => [...prev, ...newMeals]);

    if (newMeals.length < 20) {
      setHasMore(false);
      setCursor(null);
    } else {
      setCursor(newMeals[newMeals.length - 1].created_at);
    }

    setLoading(false);
  }, [loading, hasMore, cursor]);

  const scrollToTopAndRefresh = useCallback(async () => {
    posthog.capture(ANALYTICS_EVENTS.NEW_MEALS_PILL_TAPPED, {
      new_meal_count: newMealCount,
    });

    const supabase = createClient();
    const { data } = await supabase.rpc('get_following_feed', {
      p_limit: 20,
    });

    if (data) {
      const feedMeals = data as FollowingFeedItem[];
      setMeals(feedMeals);
      if (feedMeals.length > 0) {
        latestTimestampRef.current = feedMeals[0].created_at;
        setCursor(feedMeals.length === 20 ? feedMeals[feedMeals.length - 1].created_at : null);
        setHasMore(feedMeals.length === 20);
      }
    }

    setNewMealCount(0);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [newMealCount]);

  const registerRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(index, el);
      else cardRefs.current.delete(index);
    },
    []
  );

  // Loading state
  if (loading && meals.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 'var(--feed-card-height)' }}
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
    );
  }

  // Empty state: following nobody
  if (meals.length === 0 && followingCount === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 text-center px-8 overflow-y-auto"
        style={{ height: 'var(--feed-card-height)' }}
      >
        <Utensils size={48} strokeWidth={1.5} color="var(--accent-primary)" />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--text-primary)',
          }}
        >
          {t('emptyFollowingNoFollows')}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            maxWidth: 280,
          }}
        >
          {t('emptyFollowingNoFollowsDesc')}
        </p>
        <button
          onClick={onSwitchToDiscover}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t('switchToDiscover')} →
        </button>
        <FollowSuggestions />
      </div>
    );
  }

  // Empty state: following people but no posts
  if (meals.length === 0 && followingCount !== null && followingCount > 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 text-center px-8"
        style={{ height: 'var(--feed-card-height)' }}
      >
        <CheckCircle size={48} strokeWidth={1.5} color="var(--status-success)" />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--text-primary)',
          }}
        >
          {t('emptyFollowingCaughtUp')}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            maxWidth: 280,
          }}
        >
          {t('emptyFollowingCaughtUpDesc')}
        </p>
        <button
          onClick={onSwitchToDiscover}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {t('switchToDiscover')} →
        </button>
      </div>
    );
  }

  // Feed with meals
  return (
    <>
      <NewMealsPill count={newMealCount} onTap={scrollToTopAndRefresh} />
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
              meal={meal as FollowingFeedItem & { feed_score: number; user_is_following: boolean }}
              index={index}
              isVisible={visibleIndices.has(index)}
              ratingStartTime={cardTimestamps.current.get(index) ?? null}
            />
          </div>
        ))}

        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        {loading && (
          <div className="flex items-center justify-center" style={{ height: 80 }}>
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

        {!hasMore && meals.length > 0 && (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center px-8 snap-start"
            style={{
              height: 'var(--feed-card-height)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <CheckCircle size={48} strokeWidth={1.5} color="var(--status-success)" />
            <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
              {t('emptyFollowingCaughtUp')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
