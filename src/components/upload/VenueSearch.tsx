'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface VenueData {
  name: string;
  mapbox_id?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface Suggestion {
  name: string;
  mapbox_id: string;
  full_address?: string;
  address?: string;
  place_formatted?: string;
}

interface VenueSearchProps {
  value: VenueData | null;
  onChange: (venue: VenueData | null) => void;
  proximity?: { lat: number; lng: number };
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function VenueSearch({ value, onChange, proximity }: VenueSearchProps) {
  const t = useTranslations('upload');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(crypto.randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchVenues = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      let url =
        `https://api.mapbox.com/search/searchbox/v1/suggest` +
        `?q=${encodeURIComponent(q)}` +
        `&types=poi` +
        `&limit=5` +
        `&language=en` +
        `&session_token=${sessionTokenRef.current}` +
        `&access_token=${MAPBOX_TOKEN}`;

      if (proximity) {
        url += `&proximity=${proximity.lng},${proximity.lat}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      const items: Suggestion[] = (data.suggestions || []).map(
        (s: { name: string; mapbox_id: string; full_address?: string; address?: string; place_formatted?: string }) => ({
          name: s.name,
          mapbox_id: s.mapbox_id,
          full_address: s.full_address,
          address: s.address,
          place_formatted: s.place_formatted,
        })
      );
      setSuggestions(items);
      setIsOpen(items.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [proximity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchVenues(val.trim());
    }, 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setIsOpen(false);
    setQuery(suggestion.name);
    setLoading(true);

    try {
      const res = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}` +
        `?session_token=${sessionTokenRef.current}` +
        `&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      const feature = data.features?.[0];

      const venueData: VenueData = {
        name: suggestion.name,
        mapbox_id: suggestion.mapbox_id,
        address: feature?.properties?.full_address || suggestion.full_address || suggestion.place_formatted || '',
      };

      if (feature?.geometry?.coordinates) {
        venueData.lng = feature.geometry.coordinates[0];
        venueData.lat = feature.geometry.coordinates[1];
      }

      onChange(venueData);
    } catch {
      // Fallback: use suggestion data without coordinates
      onChange({
        name: suggestion.name,
        mapbox_id: suggestion.mapbox_id,
        address: suggestion.full_address || suggestion.place_formatted || '',
      });
    } finally {
      setLoading(false);
      // New session token for next search
      sessionTokenRef.current = crypto.randomUUID();
    }
  };

  const handleBlur = () => {
    // If user typed something but didn't select, save as freeform
    const trimmed = query.trim();
    if (trimmed && !value) {
      onChange({ name: trimmed });
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onChange(null);
    sessionTokenRef.current = crypto.randomUUID();
  };

  // If a value is set, show the selected state
  if (value) {
    return (
      <div
        className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid transparent',
        }}
      >
        <MapPin
          size={18}
          strokeWidth={1.5}
          style={{ color: 'var(--accent-primary)', flexShrink: 0 }}
        />
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text-primary)',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value.name}
            </span>
            {value.address && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {value.address}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid transparent',
        }}
      >
        {loading ? (
          <Loader2
            size={18}
            strokeWidth={1.5}
            className="animate-spin"
            style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          />
        ) : (
          <Search
            size={18}
            strokeWidth={1.5}
            style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
          />
        )}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={t('venuePlaceholder')}
          className="flex-1 bg-transparent outline-none"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: 'var(--text-primary)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{ flexShrink: 0 }}
          >
            <X size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.mapbox_id}
              type="button"
              className="w-full text-left px-4 py-3 flex items-start gap-3"
              style={{
                borderBottom: '1px solid var(--bg-elevated)',
              }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before click
                handleSelect(s);
              }}
            >
              <MapPin
                size={16}
                strokeWidth={1.5}
                style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }}
              />
              <div className="min-w-0">
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    display: 'block',
                  }}
                >
                  {s.name}
                </span>
                {(s.place_formatted || s.full_address) && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.place_formatted || s.full_address}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
