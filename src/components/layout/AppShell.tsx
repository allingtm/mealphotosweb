'use client';

import { Home, Compass, User, Camera, Trophy, ChefHat, Store, Shield, UtensilsCrossed } from 'lucide-react';
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
  { href: '/map', icon: Compass, label: 'map' },
  { href: '/upload', icon: Camera, label: 'upload' },
  { href: '/leaderboard', icon: Trophy, label: 'rankings' },
  { href: '/recipes', icon: ChefHat, label: 'recipes' },
  { href: '/pricing', icon: Store, label: 'pricing' },
  { href: '/profile', icon: User, label: 'profile' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const user = useAppStore((s) => s.user);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const profileAvatarUrl = useAppStore((s) => s.profileAvatarUrl);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Full-bleed pages don't get the sidebar (none currently)
  const isFullBleed = false;

  return (
    <>
      {/* Desktop / tablet side rail */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col items-center gap-2 border-r py-8 overflow-y-auto"
        style={{
          width: 72,
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--bg-elevated)',
        }}
        aria-label="Main navigation"
      >
        {sideNavItems.map(({ href, icon: Icon, label }) => {
          // Hide My Meals when not logged in (it's injected before profile)
          if (label === 'profile' && user) {
            // Inject My Meals link before Profile
            return (
              <div key="my-meals-and-profile" className="contents">
                <Link
                  href="/my-meals"
                  className="flex flex-col items-center justify-center gap-1 py-2"
                  style={{ minWidth: 48, minHeight: 48 }}
                  aria-current={isActive('/my-meals') ? 'page' : undefined}
                >
                  <UtensilsCrossed
                    size={24}
                    strokeWidth={1.5}
                    color={isActive('/my-meals') ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: isActive('/my-meals') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {t('myMeals')}
                  </span>
                </Link>
                <Link
                  href={href}
                  className="flex flex-col items-center justify-center gap-1 py-2"
                  style={{ minWidth: 48, minHeight: 48 }}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {profileAvatarUrl ? (
                    <Image
                      src={profileAvatarUrl!}
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
              </div>
            );
          }

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
              {label === 'profile' && profileAvatarUrl ? (
                <Image
                  src={profileAvatarUrl!}
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

        {/* Admin link — only visible to admins */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-col items-center justify-center gap-1 py-2"
            style={{ minWidth: 48, minHeight: 48 }}
            aria-current={isActive('/admin') ? 'page' : undefined}
          >
            <Shield
              size={24}
              strokeWidth={1.5}
              color={isActive('/admin') ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 500,
                color: isActive('/admin') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              Admin
            </span>
          </Link>
        )}

      </aside>

      {/* Main content — desktop gets right padding for sidebar */}
      <main
        id="main-content"
        className={`pb-14 md:pb-0 md:pl-18 md:h-dvh md:overflow-hidden md:flex md:flex-col ${!isFullBleed ? 'lg:pr-80' : ''}`}
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
