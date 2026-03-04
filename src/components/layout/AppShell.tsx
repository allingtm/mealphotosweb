'use client';

import { Home, Globe, User, Camera, Trophy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { AuthModal } from '@/components/auth/AuthModal';

const sideNavItems = [
  { href: '/', icon: Home, label: 'feed' },
  { href: '/map', icon: Globe, label: 'map' },
  { href: '/upload', icon: Camera, label: 'upload' },
  { href: '/leaderboard', icon: Trophy, label: 'rankings' },
  { href: '/profile', icon: User, label: 'profile' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Full-bleed pages (map) don't get the sidebar
  const isFullBleed = pathname === '/map';

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
        aria-label="Main navigation"
      >
        {sideNavItems.map(({ href, icon: Icon, label }) => {
          if (label === 'profile' && !user) {
            return (
              <button
                key={href}
                type="button"
                onClick={openAuthModal}
                className="flex flex-col items-center justify-center gap-1 py-2"
                style={{ minWidth: 48, minHeight: 48 }}
              >
                <Icon
                  size={24}
                  strokeWidth={1.5}
                  color="var(--text-secondary)"
                />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t(label)}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 py-2"
              style={{ minWidth: 48, minHeight: 48 }}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              {label === 'profile' && user?.user_metadata?.avatar_url ? (
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
                {t(label)}
              </span>
            </Link>
          );
        })}
      </aside>

      {/* Main content — desktop gets right padding for sidebar */}
      <main
        id="main-content"
        className={`pb-14 md:pb-0 md:pl-18 ${!isFullBleed ? 'lg:pr-80' : ''}`}
      >
        {children}
      </main>

      {/* Desktop right sidebar — hidden on map page */}
      {!isFullBleed && <DesktopSidebar />}

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Auth modal */}
      <AuthModal />
    </>
  );
}
