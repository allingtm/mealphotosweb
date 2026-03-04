'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore, type MapFilters } from '@/lib/store';

const TIME_RANGE_OPTIONS: { value: MapFilters['timeRange']; labelKey: 'today' | 'thisWeek' | 'thisMonth' | 'allTime' }[] = [
  { value: 'today', labelKey: 'today' },
  { value: 'this_week', labelKey: 'thisWeek' },
  { value: 'this_month', labelKey: 'thisMonth' },
  { value: 'all_time', labelKey: 'allTime' },
];

interface MapFilterDrawerProps {
  onClose: () => void;
}

export function MapFilterDrawer({ onClose }: MapFilterDrawerProps) {
  const t = useTranslations('map');
  const mapFilters = useAppStore((s) => s.mapFilters);
  const setMapFilters = useAppStore((s) => s.setMapFilters);
  const resetMapFilters = useAppStore((s) => s.resetMapFilters);

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-30"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl px-6 pt-4 pb-8 animate-slide-up"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--text-primary)',
            }}
          >
            {t('filters')}
          </h2>
          <button onClick={onClose} aria-label={t('closeFilters')}>
            <X size={24} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>

        {/* Time Range */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            {t('timeRange')}
          </p>
          <div className="flex flex-wrap gap-2">
            {TIME_RANGE_OPTIONS.map(({ value, labelKey }) => {
              const isActive = mapFilters.timeRange === value;
              return (
                <button
                  key={value}
                  onClick={() => setMapFilters({ timeRange: value })}
                  className="px-4 py-2 rounded-full"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: isActive ? '#121212' : 'var(--text-primary)',
                  }}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimum Rating */}
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            {t('minimumRating')}{mapFilters.minRating > 0 ? mapFilters.minRating : t('any')}
          </p>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const isActive = mapFilters.minRating === n;
              return (
                <button
                  key={n}
                  onClick={() => setMapFilters({ minRating: n })}
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 32,
                    height: 32,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: isActive ? '#121212' : 'var(--text-primary)',
                  }}
                >
                  {n === 0 ? '—' : n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipe Available Only */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {t('recipeOnly')}
          </p>
          <button
            role="switch"
            aria-checked={mapFilters.recipeOnly}
            onClick={() => setMapFilters({ recipeOnly: !mapFilters.recipeOnly })}
            className="relative rounded-full transition-colors"
            style={{
              width: 48,
              height: 28,
              backgroundColor: mapFilters.recipeOnly ? 'var(--accent-primary)' : 'var(--bg-elevated)',
            }}
          >
            <div
              className="absolute top-1 rounded-full transition-transform"
              style={{
                width: 20,
                height: 20,
                backgroundColor: mapFilters.recipeOnly ? '#121212' : 'var(--text-secondary)',
                transform: mapFilters.recipeOnly ? 'translateX(24px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={() => {
            resetMapFilters();
            onClose();
          }}
          className="w-full py-3 rounded-2xl"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          {t('resetFilters')}
        </button>
      </div>
    </>
  );
}
