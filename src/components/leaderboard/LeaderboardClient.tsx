'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { CUISINE_OPTIONS, CUISINE_LABELS } from '@/lib/validations/meal';
import type { LeaderboardEntry } from '@/types/database';

interface LeaderboardClientProps {
  initialEntries: LeaderboardEntry[];
  currentUserId: string | null;
  userCountry: string | null;
  userCity: string | null;
}

type Scope = 'global' | 'country' | 'city';
type TimeRange = 'week' | 'month' | 'all_time';
type Cuisine = typeof CUISINE_OPTIONS[number] | null;

const SCOPE_LABELS: Record<Scope, string> = {
  global: 'Global',
  country: 'Country',
  city: 'City',
};

const TIME_LABELS: Record<TimeRange, string> = {
  week: 'This Week',
  month: 'This Month',
  all_time: 'All Time',
};

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

export function LeaderboardClient({
  initialEntries,
  currentUserId,
  userCountry,
  userCity,
}: LeaderboardClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [scope, setScope] = useState<Scope>('global');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [cuisine, setCuisine] = useState<Cuisine>(null);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      scope,
      time_range: timeRange,
    });
    if (cuisine) params.set('cuisine', cuisine);
    if (scope === 'country' && userCountry) params.set('country', userCountry);
    if (scope === 'city' && userCity) {
      params.set('city', userCity);
      if (userCountry) params.set('country', userCountry);
    }

    try {
      const res = await fetch(`/api/leaderboard?${params}`);
      const json = await res.json();
      if (res.ok) {
        setEntries(json.entries);
      }
    } finally {
      setLoading(false);
    }
  }, [scope, timeRange, cuisine, userCountry, userCity]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const currentUserEntry = entries.find((e) => e.user_id === currentUserId);

  return (
    <div>
      {/* Filter row */}
      <div
        className="flex gap-2 flex-wrap"
        style={{ padding: '16px', paddingBottom: 8 }}
      >
        {/* Scope */}
        <FilterSelect
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          options={Object.entries(SCOPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        {/* Time range */}
        <FilterSelect
          value={timeRange}
          onChange={(v) => setTimeRange(v as TimeRange)}
          options={Object.entries(TIME_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        {/* Cuisine */}
        <FilterSelect
          value={cuisine ?? ''}
          onChange={(v) => setCuisine(v ? (v as Cuisine) : null)}
          options={[
            { value: '', label: 'All Cuisines' },
            ...CUISINE_OPTIONS.map((c) => ({
              value: c,
              label: CUISINE_LABELS[c],
            })),
          ]}
        />
      </div>

      {/* List */}
      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {entries.length === 0 ? (
          <p
            style={{
              padding: '48px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
            }}
          >
            No qualifying users found for these filters.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                isCurrentUser={entry.user_id === currentUserId}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Current user's position (sticky bottom) */}
      {currentUserEntry && (
        <div
          style={{
            position: 'sticky',
            bottom: 56,
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--bg-elevated)',
          }}
        >
          <LeaderboardRow
            entry={currentUserEntry}
            isCurrentUser
          />
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  return (
    <li
      style={{
        borderLeft: isCurrentUser
          ? '3px solid var(--accent-primary)'
          : '3px solid transparent',
        backgroundColor: isCurrentUser
          ? 'var(--bg-surface)'
          : 'transparent',
      }}
    >
      <Link
        href={`/profile/${entry.username}`}
        className="flex items-center gap-3"
        style={{
          padding: '12px 16px',
          textDecoration: 'none',
        }}
      >
        {/* Rank */}
        <span
          style={{
            width: 32,
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: entry.rank <= 3 ? 20 : 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          {entry.rank <= 3 ? MEDAL_ICONS[entry.rank - 1] : entry.rank}
        </span>

        {/* Avatar */}
        {entry.avatar_url ? (
          <Image
            src={entry.avatar_url}
            alt={entry.username}
            width={40}
            height={40}
            className="rounded-full"
            style={{ flexShrink: 0, objectFit: 'cover' }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'var(--bg-elevated)',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--accent-primary)',
              flexShrink: 0,
            }}
          >
            {(entry.display_name || entry.username).charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + meals */}
        <div className="flex-1 min-w-0">
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.display_name || `@${entry.username}`}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            {entry.meal_count} meals
          </p>
        </div>

        {/* Avg rating */}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: getScoreColor(Number(entry.avg_rating)),
            flexShrink: 0,
          }}
        >
          {Number(entry.avg_rating).toFixed(1)}
        </span>
      </Link>
    </li>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--bg-elevated)',
          borderRadius: 'var(--radius-card)',
          padding: '8px 28px 8px 12px',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.5}
        color="var(--text-secondary)"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
