'use client';

import { Home, Compass, Search, BookOpen, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const tabs = [
  { href: '/', icon: Home, key: 'feed' },
  { href: '/map', icon: Compass, key: 'map' },
  { href: '/search', icon: Search, key: 'search' },
  { href: '/blog', icon: BookOpen, key: 'blog' },
  { href: '/me', icon: User, key: 'me' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t pt-2 md:hidden"
      style={{
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--bg-elevated)',
      }}
    >
      {tabs.map(({ href, icon: Icon, key }) => (
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
              fontSize: 11,
              color: isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {t(key)}
          </span>
        </Link>
      ))}
    </nav>
  );
}
