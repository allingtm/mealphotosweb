'use client';

import { Home, Globe, Trophy, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { UploadFAB } from './UploadFAB';

const leftTabs = [
  { href: '/', icon: Home, label: 'feed' },
  { href: '/map', icon: Globe, label: 'map' },
] as const;

const rightTabs = [
  { href: '/leaderboard', icon: Trophy, label: 'rankings' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t md:hidden"
      style={{
        height: 56,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--bg-elevated)',
        overflow: 'visible',
      }}
    >
      {leftTabs.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          <Icon
            size={24}
            strokeWidth={1.5}
            color={isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)'}
          />
          <span
            className="font-medium"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              color: isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {t(label)}
          </span>
        </Link>
      ))}

      {/* Spacer for FAB */}
      <div className="relative" style={{ width: 56 }}>
        <UploadFAB />
      </div>

      {rightTabs.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          <Icon
            size={24}
            strokeWidth={1.5}
            color={isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)'}
          />
          <span
            className="font-medium"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              color: isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {t(label)}
          </span>
        </Link>
      ))}

      {user ? (
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          {user.user_metadata?.avatar_url ? (
            <Image
              src={user.user_metadata.avatar_url}
              alt={t('profile')}
              width={24}
              height={24}
              className="rounded-full"
              style={{
                border: isActive('/profile')
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent',
              }}
            />
          ) : (
            <User
              size={24}
              strokeWidth={1.5}
              color={isActive('/profile') ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            />
          )}
          <span
            className="font-medium"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              color: isActive('/profile') ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {t('profile')}
          </span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={openAuthModal}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          <User
            size={24}
            strokeWidth={1.5}
            color="var(--text-secondary)"
          />
          <span
            className="font-medium"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {t('profile')}
          </span>
        </button>
      )}
    </nav>
  );
}
