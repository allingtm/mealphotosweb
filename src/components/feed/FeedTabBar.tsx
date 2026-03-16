'use client';

import posthog from 'posthog-js';
import { useAppStore, type FeedTab } from '@/lib/store';

const TABS: { value: FeedTab; label: string }[] = [
  { value: 'following', label: 'Following' },
  { value: 'nearby', label: 'Nearby' },
  { value: 'trending', label: 'Trending' },
];

export function FeedTabBar() {
  const feedTab = useAppStore((s) => s.feedTab);
  const setFeedTab = useAppStore((s) => s.setFeedTab);

  const handleTabChange = (tab: FeedTab) => {
    if (tab === feedTab) return;
    posthog.capture('feed_tab_switched', { tab });
    setFeedTab(tab);
  };

  return (
    <div
      className="flex gap-2 px-4 py-3"
      style={{ backgroundColor: 'var(--bg-primary)' }}
      role="tablist"
      aria-label="Feed tabs"
    >
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={feedTab === value ? true : undefined}
          onClick={() => handleTabChange(value)}
          className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: feedTab === value ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            color: feedTab === value ? 'var(--bg-primary)' : 'var(--text-secondary)',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
