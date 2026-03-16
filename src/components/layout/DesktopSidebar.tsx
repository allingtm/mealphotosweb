'use client';

import Link from 'next/link';
import { TrendingUp, Search, MapPin } from 'lucide-react';

export function DesktopSidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col gap-6 fixed right-0 top-0 bottom-0 overflow-y-auto"
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
          See what dishes people are loving right now.
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
          Find food businesses near you on the map.
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
          Find dishes, cuisines, and businesses.
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

      {/* Legal footer */}
      <div
        className="mt-auto pt-6"
        style={{ borderTop: '1px solid var(--bg-elevated)' }}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/legal/privacy" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Privacy
          </Link>
          <Link href="/legal/terms" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Terms
          </Link>
          <Link href="/legal/cookies" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Cookies
          </Link>
        </div>
      </div>
    </aside>
  );
}
