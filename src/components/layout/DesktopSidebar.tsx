'use client';

import Link from 'next/link';
import { TrendingUp, Search, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function DesktopSidebar() {
  const t = useTranslations('sidebar');
  return (
    <aside
      className="flex flex-col gap-6 overflow-y-auto h-full"
      style={{
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
            {t('trending')}
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {t('trendingDesc')}
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
          {t('viewTrending')} →
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
            {t('discover')}
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {t('discoverDesc')}
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
          {t('openMap')} →
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
            {t('searchTitle')}
          </h3>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {t('searchDesc')}
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
          {t('searchLink')} →
        </Link>
      </div>

    </aside>
  );
}
