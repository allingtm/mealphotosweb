'use client';

import { useAppStore } from '@/lib/store';
import type { BusinessType, BusinessTypeGroup } from '@/types/database';

type FilterValue = BusinessType | BusinessTypeGroup | 'all';

interface FilterPill {
  label: string;
  value: FilterValue;
  emoji?: string;
}

const FILTER_PILLS: FilterPill[] = [
  { label: 'All', value: 'all' },
  { label: 'Restaurants', value: 'restaurant', emoji: '🍽' },
  { label: 'Cafés', value: 'cafe', emoji: '☕' },
  { label: 'Takeaways', value: 'takeaway', emoji: '🍕' },
  { label: 'Pubs', value: 'pub', emoji: '🍺' },
  { label: 'Bakeries', value: 'bakery', emoji: '🥐' },
  { label: 'Chefs', value: 'chefs_experiences', emoji: '🧑‍🍳' },
  { label: 'Nutrition', value: 'health_nutrition', emoji: '🥗' },
  { label: 'Shops', value: 'shops_retail', emoji: '🛒' },
];

export function MapFilterPills() {
  const mapTypeFilter = useAppStore((s) => s.mapTypeFilter);
  const setMapTypeFilter = useAppStore((s) => s.setMapTypeFilter);

  return (
    <div
      className="flex gap-2 px-4 py-2 overflow-x-auto"
      style={{
        backgroundColor: 'rgba(18, 18, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        scrollbarWidth: 'none',
      }}
    >
      {FILTER_PILLS.map((pill) => {
        const isActive = mapTypeFilter === pill.value;
        return (
          <button
            key={pill.label}
            type="button"
            onClick={() => setMapTypeFilter(pill.value)}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            {pill.emoji && <span className="mr-1">{pill.emoji}</span>}
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
