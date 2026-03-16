'use client';

import Link from 'next/link';
import { TrendingUp, Search, MapPin } from 'lucide-react';

export function DesktopSidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col gap-6 fixed right-0 top-14 bottom-0 overflow-y-auto"
      style={{
        width: 320,
        padding: '24px 16px',
        borderLeft: '1px solid var(--bg-elevated)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Trending dishes */}
      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            Trending
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Discover the most popular dishes being posted right now. See what everyone is eating and reacting to.
        </p>
        <Link
          href="/?tab=trending"
          className="block mt-3"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          View trending →
        </Link>
      </div>

      {/* Explore map */}
      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            Explore
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Browse restaurants, cafes, and food businesses near you on an interactive map — discover what's being served in your area and beyond.
        </p>
        <Link
          href="/map"
          className="block mt-3"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          Open map →
        </Link>
      </div>

      {/* Search */}
      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            Search
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Search for specific dishes, cuisines, or businesses — find exactly what you're craving or explore something new.
        </p>
        <Link
          href="/search"
          className="block mt-3"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          Search →
        </Link>
      </div>

    </aside>
  );
}
