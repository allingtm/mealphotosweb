'use client';

import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface MapSearchBarProps {
  onFlyTo: (lng: number, lat: number) => void;
  onFilterToggle: () => void;
  hasActiveFilters: boolean;
}

async function forwardGeocode(query: string): Promise<{ lng: number; lat: number; name: string } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,locality,region,country&limit=1&access_token=${token}`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    return {
      lng: feature.center[0],
      lat: feature.center[1],
      name: feature.place_name,
    };
  } catch {
    return null;
  }
}

export function MapSearchBar({ onFlyTo, onFilterToggle, hasActiveFilters }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    const result = await forwardGeocode(trimmed);
    setSearching(false);

    if (result) {
      onFlyTo(result.lng, result.lat);
    }
  }, [query, onFlyTo]);

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 px-4 pt-4"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex items-center gap-2"
        style={{ pointerEvents: 'auto' }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
          }}
        >
          <Search
            size={18}
            strokeWidth={1.5}
            style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, cuisine..."
            disabled={searching}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          />
        </form>

        <button
          onClick={onFilterToggle}
          className="relative flex items-center justify-center rounded-2xl"
          style={{
            width: 44,
            height: 44,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            flexShrink: 0,
          }}
          aria-label="Filters"
        >
          <SlidersHorizontal
            size={20}
            strokeWidth={1.5}
            style={{ color: 'var(--text-primary)' }}
          />
          {hasActiveFilters && (
            <div
              className="absolute"
              style={{
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}
