'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FeedTab = 'following' | 'discover' | 'journal';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  const t = useTranslations('feed');

  const tabs: { key: FeedTab; label: string; icon?: React.ReactNode }[] = [
    { key: 'discover', label: t('discover') },
    { key: 'following', label: t('following') },
    { key: 'journal', label: t('journal'), icon: <Lock size={14} strokeWidth={1.5} /> },
  ];

  return (
    <div
      className="flex w-full backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(18, 18, 18, 0.8)',
        height: 44,
        zIndex: 40,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className="flex-1 flex items-center justify-center gap-1"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
