'use client';

import { useState } from 'react';
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

const tabs = ['My Meals', 'Saved'] as const;
type Tab = typeof tabs[number];

export function ProfileTabs({ meals, savedMeals = [], showSavedTab = false }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('My Meals');

  const visibleTabs = showSavedTab ? tabs : (['My Meals'] as const);

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
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'My Meals' && <MealGrid meals={meals} />}
      {activeTab === 'Saved' && <MealGrid meals={savedMeals} showHeart />}
    </div>
  );
}
