'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import posthog from 'posthog-js';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { BusinessSearchResult } from '@/types/database';
import { BusinessListItem } from './BusinessListItem';

type CategoryFilter = 'all' | 'food_drink' | 'health_nutrition';

const CATEGORY_PILLS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food_drink', label: 'Food & Drink' },
  { key: 'health_nutrition', label: 'Health' },
];

export function DiscoverClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [nearYou, setNearYou] = useState<BusinessSearchResult[]>([]);
  const [popular, setPopular] = useState<BusinessSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<BusinessSearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { /* denied */ },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }, []);

  // Fetch initial results (near you + popular)
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '20' });
    if (category !== 'all') params.set('group', category);
    if (userLocation) {
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
    }

    try {
      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json();
      setNearYou(data.near_you ?? []);
      setPopular(data.popular ?? []);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [category, userLocation]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ query: query.trim(), limit: '20' });
      if (category !== 'all') params.set('group', category);
      if (userLocation) {
        params.set('lat', userLocation.lat.toString());
        params.set('lng', userLocation.lng.toString());
      }

      try {
        const res = await fetch(`/api/discover?${params}`);
        const data = await res.json();
        setSearchResults(data.near_you ?? []);

        posthog.capture(ANALYTICS_EVENTS.DISCOVER_SEARCH, {
          query: query.trim(),
          category,
          result_count: (data.near_you ?? []).length,
        });
      } catch {
        // Non-critical
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, category, userLocation]);

  const showSearch = searchResults !== null;

  return (
    <div
      className="flex flex-col w-full"
      style={{
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100%',
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          className="flex items-center gap-2 rounded-xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            padding: '10px 12px',
          }}
        >
          <Search size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search businesses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2" style={{ padding: '12px 16px' }}>
        {CATEGORY_PILLS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className="rounded-full transition-colors"
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: category === key ? 600 : 400,
              backgroundColor:
                category === key ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: category === key ? '#121212' : 'var(--text-secondary)',
              border: category === key ? 'none' : '1px solid var(--bg-elevated)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center" style={{ padding: 48 }}>
          <div
            className="animate-spin rounded-full"
            style={{
              width: 24,
              height: 24,
              border: '2px solid var(--bg-elevated)',
              borderTopColor: 'var(--accent-primary)',
            }}
          />
        </div>
      )}

      {/* Search results */}
      {!loading && showSearch && (
        <div>
          <SectionHeader title={`Results (${searchResults.length})`} />
          {searchResults.length === 0 ? (
            <EmptyMessage text="No businesses found" />
          ) : (
            searchResults.map((b) => (
              <BusinessListItem key={b.profile_id} business={b} />
            ))
          )}
        </div>
      )}

      {/* Browse view */}
      {!loading && !showSearch && (
        <>
          {nearYou.length > 0 && (
            <div>
              <SectionHeader title="Near You" />
              {nearYou.map((b) => (
                <BusinessListItem key={b.profile_id} business={b} />
              ))}
            </div>
          )}

          {popular.length > 0 && (
            <div>
              <SectionHeader title="Popular" />
              {popular.map((b) => (
                <BusinessListItem key={b.profile_id} business={b} />
              ))}
            </div>
          )}

          {nearYou.length === 0 && popular.length === 0 && (
            <EmptyMessage text="No businesses found in your area" />
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '16px 16px 8px',
      }}
    >
      {title}
    </h3>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center" style={{ padding: 48 }}>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}
      >
        {text}
      </p>
    </div>
  );
}
