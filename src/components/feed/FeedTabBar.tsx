'use client';

import { useTranslations } from 'next-intl';

type FeedTab = 'following' | 'discover';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  const t = useTranslations('feed');

  return (
    <div
      className="flex w-full backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(18, 18, 18, 0.8)',
        height: 44,
        zIndex: 40,
      }}
    >
      <button
        onClick={() => onTabChange('discover')}
        className="flex-1 flex items-center justify-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: activeTab === 'discover' ? 600 : 400,
          color: activeTab === 'discover' ? 'var(--text-primary)' : 'var(--text-secondary)',
          borderBottom: activeTab === 'discover' ? '2px solid var(--accent-primary)' : '2px solid transparent',
        }}
      >
        {t('discover')}
      </button>
      <button
        onClick={() => onTabChange('following')}
        className="flex-1 flex items-center justify-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: activeTab === 'following' ? 600 : 400,
          color: activeTab === 'following' ? 'var(--text-primary)' : 'var(--text-secondary)',
          borderBottom: activeTab === 'following' ? '2px solid var(--accent-primary)' : '2px solid transparent',
        }}
      >
        {t('following')}
      </button>
    </div>
  );
}
