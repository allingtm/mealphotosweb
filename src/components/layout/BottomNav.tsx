'use client';

import { Home, Globe, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UploadFAB } from './UploadFAB';

const tabs = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/map', icon: Globe, label: 'Map' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t md:hidden"
      style={{
        height: 56,
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--bg-elevated)',
      }}
    >
      {tabs.map(({ href, icon: Icon, label }) => (
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
            {label}
          </span>
        </Link>
      ))}

      <UploadFAB />

      <Link
        href="/profile"
        className="flex flex-col items-center justify-center gap-0.5"
        style={{ minWidth: 48, minHeight: 48 }}
      >
        <User
          size={24}
          strokeWidth={1.5}
          color={isActive('/profile') ? 'var(--accent-primary)' : 'var(--text-secondary)'}
        />
        <span
          className="font-medium"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 500,
            color: isActive('/profile') ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          Profile
        </span>
      </Link>
    </nav>
  );
}
