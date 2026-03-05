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
  authorView?: boolean;
  isRestaurant?: boolean;
  username?: string;
}

const OWN_TAB_KEYS = ['myMeals', 'saved'] as const;
const PUBLIC_TAB_KEYS = ['meals'] as const;
const RESTAURANT_TAB_KEYS = ['allMeals', 'ourDishes', 'dinerPosts'] as const;

type TabKey = typeof OWN_TAB_KEYS[number] | typeof PUBLIC_TAB_KEYS[number] | typeof RESTAURANT_TAB_KEYS[number];

const RESTAURANT_TAB_PARAMS: Record<string, string> = {
  allMeals: 'all',
  ourDishes: 'own',
  dinerPosts: 'diner',
};

export function ProfileTabs({
  meals,
  savedMeals = [],
  showSavedTab = false,
  authorView = false,
  isRestaurant = false,
  username,
}: ProfileTabsProps) {
  const t = useTranslations('profile');

  const mealsTab: TabKey = authorView ? 'myMeals' : 'meals';
  const defaultTab: TabKey = isRestaurant ? 'allMeals' : mealsTab;
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  let visibleTabs: readonly TabKey[];
  if (isRestaurant) {
    visibleTabs = RESTAURANT_TAB_KEYS;
  } else if (showSavedTab) {
    visibleTabs = OWN_TAB_KEYS;
  } else {
    visibleTabs = [mealsTab] as const;
  }

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
      {(activeTab === 'myMeals' || activeTab === 'meals') && <MealGrid meals={meals} authorView={authorView} />}
      {activeTab === 'saved' && <MealGrid meals={savedMeals} showHeart />}
      {isRestaurant && RESTAURANT_TAB_KEYS.includes(activeTab as typeof RESTAURANT_TAB_KEYS[number]) && (
        <MealGrid
          meals={activeTab === 'allMeals' ? meals : []}
          fetchUrl={username ? `/api/profiles/${username}/meals?tab=${RESTAURANT_TAB_PARAMS[activeTab]}` : undefined}
        />
      )}
    </div>
  );
}
