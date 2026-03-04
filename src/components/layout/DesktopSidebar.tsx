'use client';

import Link from 'next/link';
import { Trophy, Camera, TrendingUp, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function DesktopSidebar() {
  const tFooter = useTranslations('footer');
  const tDir = useTranslations('directory');

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
      {/* Upload CTA */}
      <Link
        href="/upload"
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
        }}
      >
        <Camera size={20} strokeWidth={1.5} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Upload a meal
        </span>
      </Link>

      {/* Leaderboard preview */}
      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            Leaderboard
          </h3>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          See who is cooking the highest-rated meals this week.
        </p>
        <Link
          href="/leaderboard"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          View leaderboard
        </Link>
      </div>

      {/* Trending section */}
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
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Explore trending cuisines and popular meals on the map.
        </p>
        <Link
          href="/map"
          className="block mt-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          Open map
        </Link>
      </div>

      {/* Directory */}
      <div
        className="rounded-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Store size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            {tDir('title')}
          </h3>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          {tDir('comingSoonDesc')}
        </p>
        <Link
          href="/directory"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}
        >
          {tDir('comingSoon')}
        </Link>
      </div>

      {/* Legal footer */}
      <div
        className="mt-auto pt-6"
        style={{ borderTop: '1px solid var(--bg-elevated)' }}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/legal/privacy"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            {tFooter('privacy')}
          </Link>
          <Link
            href="/legal/terms"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            {tFooter('terms')}
          </Link>
          <Link
            href="/legal/cookies"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            {tFooter('cookieSettings')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
