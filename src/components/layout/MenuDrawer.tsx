'use client';

import { useEffect, useRef } from 'react';
import { X, User, Info, Mail, Store, Shield, LogOut, Settings, FileText, Cookie, ChevronRight, Sun, Moon, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useTheme, type Theme } from '@/components/providers/ThemeProvider';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: '/pricing', icon: Store, labelKey: 'pricing' },
  { href: '/about', icon: Info, labelKey: 'about' },
  { href: '/contact', icon: Mail, labelKey: 'contactUs' },
] as const;

const themeOptions: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'themeSystem' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const tSettings = useTranslations('settings');

  return (
    <div style={{ padding: '10px 16px' }}>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {tSettings('theme')}
      </span>
      <div
        className="flex gap-1"
        style={{
          marginTop: 8,
          padding: 3,
          borderRadius: 'var(--radius-card)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        {themeOptions.map(({ value, icon: Icon, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className="flex items-center justify-center gap-1.5 flex-1"
            style={{
              padding: '8px 0',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: theme === value ? 'var(--bg-surface)' : 'transparent',
              color: theme === value ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            <Icon size={16} strokeWidth={1.5} />
            {tSettings(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const t = useTranslations('menu');
  const tFooter = useTranslations('footer');
  const tSettings = useTranslations('settings');
  const showCookieBanner = useAppStore((s) => s.showCookieBanner);
  const openCookiePreferences = useAppStore((s) => s.openCookiePreferences);
  const user = useAppStore((s) => s.user);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push('/');
    router.refresh();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[80]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-[90] flex flex-col pb-16 md:pb-0"
        style={{
          width: 'min(320px, 85vw)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'var(--bg-surface)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 16,
            borderBottom: '1px solid var(--bg-elevated)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-full)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.5} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
          {/* Profile / Sign in */}
          {user ? (
            <Link
              href="/me"
              onClick={onClose}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '14px 16px',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <User size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {t('profile')}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <User size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {t('signIn')}
              </span>
            </button>
          )}

          {/* Settings — only when logged in */}
          {user && (
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '14px 16px',
                textDecoration: 'none',
              }}
            >
              <Settings size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {t('settings')}
              </span>
            </Link>
          )}

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', margin: '4px 16px' }} />

          {menuItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '14px 16px',
                textDecoration: 'none',
              }}
            >
              <Icon size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                {t(labelKey)}
              </span>
            </Link>
          ))}

          {/* Theme switcher */}
          <ThemeToggle />

          {/* Admin link — only visible to admins */}
          {isAdmin && (
            <>
              <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', margin: '4px 16px' }} />
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 w-full"
                style={{
                  padding: '14px 16px',
                  textDecoration: 'none',
                }}
              >
                <Shield size={20} strokeWidth={1.5} color="var(--accent-primary)" />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--accent-primary)',
                  }}
                >
                  Admin
                </span>
              </Link>
            </>
          )}

          {/* Sign out — only visible when logged in */}
          {user && (
            <>
              <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', margin: '4px 16px' }} />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full"
                style={{
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={20} strokeWidth={1.5} color="var(--status-error)" />
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--status-error)',
                  }}
                >
                  {tSettings('signOut')}
                </span>
              </button>

            </>
          )}
        </div>

        {/* Legal section */}
        <div
          style={{
            borderTop: '1px solid var(--bg-elevated)',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '12px 16px 8px',
              margin: 0,
            }}
          >
            {tSettings('legal')}
          </h3>
          <Link
            href="/legal/privacy"
            onClick={onClose}
            className="flex items-center justify-between w-full"
            style={{
              padding: '12px 16px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <Shield size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
                {tSettings('privacyPolicy')}
              </span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} color="var(--text-secondary)" />
          </Link>
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 52 }} />
          <Link
            href="/legal/terms"
            onClick={onClose}
            className="flex items-center justify-between w-full"
            style={{
              padding: '12px 16px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <FileText size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
                {tSettings('termsOfService')}
              </span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} color="var(--text-secondary)" />
          </Link>
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 52 }} />
          <Link
            href="/legal/cookies"
            onClick={onClose}
            className="flex items-center justify-between w-full"
            style={{
              padding: '12px 16px',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <Cookie size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
                {tSettings('cookiePolicy')}
              </span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} color="var(--text-secondary)" />
          </Link>
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginLeft: 52 }} />
          <button
            type="button"
            onClick={() => {
              showCookieBanner();
              openCookiePreferences();
              onClose();
            }}
            className="flex items-center justify-between w-full"
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-3">
              <Cookie size={20} strokeWidth={1.5} color="var(--text-secondary)" />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500 }}>
                {tSettings('cookieSettings')}
              </span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

    </>
  );
}
