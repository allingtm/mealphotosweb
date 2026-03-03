'use client';

import { Home, Globe, User, Camera } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';

const sideNavItems = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/map', icon: Globe, label: 'Map' },
  { href: '/upload', icon: Camera, label: 'Upload' },
  { href: '/profile', icon: User, label: 'Profile' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Desktop / tablet side rail */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col items-center gap-2 border-r py-8"
        style={{
          width: 72,
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--bg-elevated)',
        }}
      >
        {sideNavItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 py-2"
            style={{ minWidth: 48, minHeight: 48 }}
          >
            <Icon
              size={24}
              strokeWidth={1.5}
              color={isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            />
            <span
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
      </aside>

      {/* Main content */}
      <main className="pb-14 md:pb-0 md:pl-[72px]">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </>
  );
}
