'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
// MealGrid removed in v3 — dishes are shown on business profiles
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MealGrid = (_props: any) => <div>No meals view in v3</div>;
import { BusinessPostGrid } from './BusinessPostGrid';
import { getBusinessTypeGroup, type BusinessType } from '@/types/database';

interface MealGridItem {
  id: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  visibility?: string;
}

interface ProfileTabsProps {
  meals: MealGridItem[];
  savedMeals?: MealGridItem[];
  showSavedTab?: boolean;
  authorView?: boolean;
  isRestaurant?: boolean;
  username?: string;
  businessType?: string | null;
}

const OWN_TAB_KEYS = ['myMeals', 'saved'] as const;
const PUBLIC_TAB_KEYS = ['meals'] as const;
const RESTAURANT_TAB_KEYS = ['allMeals', 'ourDishes', 'dinerPosts'] as const;
const FOOD_DRINK_TAB_KEYS = ['allMeals', 'ourDishes', 'dinerPosts', 'updates'] as const;
const HEALTH_NUTRITION_TAB_KEYS = ['meals', 'updates'] as const;

type TabKey =
  | typeof OWN_TAB_KEYS[number]
  | typeof PUBLIC_TAB_KEYS[number]
  | typeof RESTAURANT_TAB_KEYS[number]
  | 'updates';

const RESTAURANT_TAB_PARAMS: Record<string, string> = {
  allMeals: 'all',
  ourDishes: 'own',
  dinerPosts: 'diner',
};

const TAB_LABELS: Record<string, string> = {
  myMeals: 'My Meals',
  saved: 'Saved',
  meals: 'Meals',
  allMeals: 'All meals',
  ourDishes: 'Our dishes',
  dinerPosts: 'Diner posts',
  updates: 'Updates',
};

export function ProfileTabs({
  meals,
  savedMeals = [],
  showSavedTab = false,
  authorView = false,
  isRestaurant = false,
  username,
  businessType,
}: ProfileTabsProps) {
  const t = useTranslations('profile');

  const bpGroup = businessType ? getBusinessTypeGroup(businessType as BusinessType) : null;

  const mealsTab: TabKey = authorView ? 'myMeals' : 'meals';
  let defaultTab: TabKey;
  let visibleTabs: readonly TabKey[];

  if (bpGroup === 'food_service') {
    visibleTabs = FOOD_DRINK_TAB_KEYS;
    defaultTab = 'allMeals';
  } else if (bpGroup === 'health_nutrition') {
    visibleTabs = HEALTH_NUTRITION_TAB_KEYS;
    defaultTab = 'meals';
  } else if (isRestaurant) {
    visibleTabs = RESTAURANT_TAB_KEYS;
    defaultTab = 'allMeals';
  } else if (showSavedTab) {
    visibleTabs = OWN_TAB_KEYS;
    defaultTab = mealsTab;
  } else {
    visibleTabs = [mealsTab] as const;
    defaultTab = mealsTab;
  }

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const getTabLabel = (tab: TabKey): string => {
    // Try translation first, fallback to our labels
    try {
      return t(tab);
    } catch {
      return TAB_LABELS[tab] || tab;
    }
  };

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
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {(activeTab === 'myMeals' || activeTab === 'meals') && <MealGrid meals={meals} authorView={authorView} />}
      {activeTab === 'saved' && <MealGrid meals={savedMeals} showHeart />}
      {(isRestaurant || bpGroup === 'food_service') &&
        ['allMeals', 'ourDishes', 'dinerPosts'].includes(activeTab) && (
        <MealGrid
          meals={activeTab === 'allMeals' ? meals : []}
          fetchUrl={username ? `/api/profiles/${username}/meals?tab=${RESTAURANT_TAB_PARAMS[activeTab]}` : undefined}
        />
      )}
      {activeTab === 'updates' && username && (
        <BusinessPostGrid username={username} />
      )}
    </div>
  );
}
