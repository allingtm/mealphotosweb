'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import type { FeedItem } from '@/types/database';
import { FeedTabBar } from './FeedTabBar';
import { FeedContainer } from './FeedContainer';
import { FeedHeader } from './FeedHeader';
import { FollowingFeed } from './FollowingFeed';
import { JournalFeed } from './JournalFeed';

type FeedTab = 'following' | 'discover' | 'journal';

interface FeedPageClientProps {
  initialMeals: FeedItem[];
  initialCursor: string | null;
}

export function FeedPageClient({ initialMeals, initialCursor }: FeedPageClientProps) {
  useTranslations('feed');
  const user = useAppStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<FeedTab>(() => {
    if (typeof window === 'undefined') return 'discover';
    if (!user) return 'discover';
    const saved = localStorage.getItem('feed_tab') as FeedTab | null;
    if (saved === 'following' || saved === 'discover' || saved === 'journal') return saved;
    return 'discover';
  });

  // Re-check localStorage when user signs in
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('feed_tab') as FeedTab | null;
      if (saved === 'following' || saved === 'discover' || saved === 'journal') {
        setActiveTab(saved);
      }
    } else {
      setActiveTab('discover');
    }
  }, [user]);

  // Persist tab choice
  useEffect(() => {
    if (user) {
      localStorage.setItem('feed_tab', activeTab);
    }
  }, [activeTab, user]);

  const handleTabChange = useCallback((tab: FeedTab) => {
    posthog.capture(ANALYTICS_EVENTS.FEED_TAB_SWITCHED, {
      from_tab: activeTab,
      to_tab: tab,
    });
    setActiveTab(tab);

    if (tab === 'discover') {
      posthog.capture(ANALYTICS_EVENTS.DISCOVER_FEED_VIEWED, {
        meals_loaded: initialMeals.length,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const switchToDiscover = useCallback(() => {
    handleTabChange('discover');
  }, [handleTabChange]);

  return (
    <div
      className="h-dvh overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <FeedHeader />
        {user && (
          <FeedTabBar activeTab={activeTab} onTabChange={handleTabChange} />
        )}
        <div style={{ display: activeTab === 'discover' ? 'contents' : 'none' }}>
          <FeedContainer initialMeals={initialMeals} initialCursor={initialCursor} />
        </div>
        {user && activeTab === 'following' && (
          <FollowingFeed onSwitchToDiscover={switchToDiscover} />
        )}
        {user && activeTab === 'journal' && (
          <JournalFeed onSwitchToDiscover={switchToDiscover} />
        )}
      </div>
    </div>
  );
}
