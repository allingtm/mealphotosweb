'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MealGrid } from './MealGrid';

interface MealGridItem {
  id: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
}

interface ProfileTabsProps {
  meals: MealGridItem[];
  savedMeals?: MealGridItem[];
  showSavedTab?: boolean;
}

const TAB_KEYS = ['myMeals', 'saved'] as const;
type TabKey = typeof TAB_KEYS[number];

export function ProfileTabs({ meals, savedMeals = [], showSavedTab = false }: ProfileTabsProps) {
  const t = useTranslations('profile');
  const [activeTab, setActiveTab] = useState<TabKey>('myMeals');

  const visibleTabs = showSavedTab ? TAB_KEYS : (['myMeals'] as const);

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex"
        style={{
          borderBottom: '1px solid var(--bg-elevated)',
          marginTop: 16,
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color:
                activeTab === tab
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === tab
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent',
              padding: '12px 0',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'myMeals' && <MealGrid meals={meals} />}
      {activeTab === 'saved' && <MealGrid meals={savedMeals} showHeart />}
    </div>
  );
}
