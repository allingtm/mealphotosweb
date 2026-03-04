'use client';

import { Home, Globe, User, Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { BottomNav } from './BottomNav';
import { AuthModal } from '@/components/auth/AuthModal';

const sideNavItems = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/map', icon: Globe, label: 'Map' },
  { href: '/upload', icon: Camera, label: 'Upload' },
  { href: '/profile', icon: User, label: 'Profile' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

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
            {label === 'Profile' && user?.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Profile"
                width={24}
                height={24}
                className="rounded-full"
                style={{
                  border: isActive(href)
                    ? '2px solid var(--accent-primary)'
                    : '2px solid transparent',
                }}
              />
            ) : (
              <Icon
                size={24}
                strokeWidth={1.5}
                color={isActive(href) ? 'var(--accent-primary)' : 'var(--text-secondary)'}
              />
            )}
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

      {/* Auth modal */}
      <AuthModal />
    </>
  );
}
