'use client';

import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';

type MapCategory = 'all' | 'food' | 'health' | 'meals';

const CATEGORIES: { key: MapCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'health', label: 'Health' },
  { key: 'meals', label: 'Meals' },
];

export function MapCategoryPills() {
  const mapCategory = useAppStore((s) => s.mapFilters.mapCategory);
  const setMapFilters = useAppStore((s) => s.setMapFilters);

  const handleSelect = (category: MapCategory) => {
    setMapFilters({ mapCategory: category });
    posthog.capture(ANALYTICS_EVENTS.MAP_FILTER_CHANGED, { filter: category });
  };

  return (
    <div
      className="flex gap-2"
      style={{
        padding: '0 12px',
      }}
    >
      {CATEGORIES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleSelect(key)}
          className="rounded-full transition-colors"
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: mapCategory === key ? 600 : 400,
            backgroundColor:
              mapCategory === key ? 'var(--accent-primary)' : 'var(--bg-surface)',
            color: mapCategory === key ? '#121212' : 'var(--text-secondary)',
            border: mapCategory === key ? 'none' : '1px solid var(--bg-elevated)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
