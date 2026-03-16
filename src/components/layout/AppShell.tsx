'use client';

import { UtensilsCrossed, Globe, Search, User, PlusCircle, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { AuthModal } from '@/components/auth/AuthModal';

const navItems = [
  { href: '/', icon: UtensilsCrossed, label: 'Feed' },
  { href: '/map', icon: Globe, label: 'Map' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/me', icon: User, label: 'Me' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const isBusiness = useAppStore((s) => s.isBusiness);
  const profileAvatarUrl = useAppStore((s) => s.profileAvatarUrl);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

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
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 py-2"
              style={{ minWidth: 48, minHeight: 48 }}
              aria-current={active ? 'page' : undefined}
            >
              {label === 'Me' && profileAvatarUrl ? (
                <Image
                  src={profileAvatarUrl}
                  alt="Profile"
                  width={24}
                  height={24}
                  className="rounded-full"
                  style={{
                    border: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                />
              ) : (
                <Icon
                  size={24}
                  strokeWidth={1.5}
                  color={active ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                />
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* Business: Post a Dish */}
        {isBusiness && user && (
          <Link
            href="/post"
            className="flex flex-col items-center justify-center gap-1 py-2"
            style={{ minWidth: 48, minHeight: 48 }}
            aria-current={isActive('/post') ? 'page' : undefined}
          >
            <PlusCircle
              size={24}
              strokeWidth={1.5}
              color={isActive('/post') ? 'var(--accent-primary)' : 'var(--text-secondary)'}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isActive('/post') ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              Post
            </span>
          </Link>
        )}

        {/* Admin link */}
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

      {/* Main content */}
      <main
        id="main-content"
        className="pt-[env(safe-area-inset-top,0px)] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pt-0 md:pb-0 md:pl-18 md:h-dvh md:overflow-hidden md:flex md:flex-col lg:pr-80"
      >
        {children}
      </main>

      {/* Desktop right sidebar */}
      <DesktopSidebar />

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Auth modal */}
      <AuthModal />
    </>
  );
}
