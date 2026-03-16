'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { FeedItem } from '@/types/database';
import { FeedTabBar } from './FeedTabBar';
import { DishCard } from './DishCard';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedPageClientProps {
  initialItems: FeedItem[];
  initialCursor: string | null;
}

function DishCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1">
      <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: '4/5' }} />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function FeedPageClient({ initialItems, initialCursor }: FeedPageClientProps) {
  const feedTab = useAppStore((s) => s.feedTab);
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch feed when tab changes
  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      setInitialLoading(true);
      try {
        const params = new URLSearchParams({ tab: feedTab, limit: '20' });
        const res = await fetch(`/api/feed?${params}`);
        if (cancelled) return;
        const data = await res.json();
        setItems(data.items ?? []);
        setCursor(data.cursor ?? null);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    fetchFeed();
    return () => { cancelled = true; };
  }, [feedTab]);

  // Infinite scroll — load more
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: feedTab, limit: '20', cursor });
      const res = await fetch(`/api/feed?${params}`);
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setCursor(data.cursor ?? null);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, feedTab]);

  // IntersectionObserver for infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200% 0px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <FeedTabBar />

      <div
        className="flex-1 overflow-y-auto px-4"
        style={{ maxWidth: 'var(--feed-max-width)', width: '100%' }}
      >
        {initialLoading ? (
          <div className="flex flex-col gap-8 pt-4">
            <DishCardSkeleton />
            <DishCardSkeleton />
            <DishCardSkeleton />
          </div>
        ) : items.length === 0 ? (
          <EmptyState tab={feedTab} />
        ) : (
          <div className="flex flex-col gap-8 pt-4 pb-8">
            {items.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
            <div ref={sentinelRef} className="h-1" />
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; subtitle: string }> = {
    following: {
      title: 'No dishes yet',
      subtitle: 'Follow restaurants to see their dishes here. Try the Nearby tab to discover businesses.',
    },
    nearby: {
      title: 'No dishes nearby',
      subtitle: 'No dishes posted nearby yet. Try expanding your radius or check Trending.',
    },
    trending: {
      title: 'No trending dishes',
      subtitle: 'No trending dishes right now. Check back soon!',
    },
  };

  const msg = messages[tab] ?? messages.nearby;

  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16">
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
        {msg.title}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>
        {msg.subtitle}
      </p>
    </div>
  );
}
