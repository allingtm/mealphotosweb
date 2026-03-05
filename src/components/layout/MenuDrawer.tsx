'use client';

import { useEffect, useRef } from 'react';
import { X, User, Info, Mail, MessageSquare, Store, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: '/business', icon: Store, labelKey: 'business' },
  { href: '/about', icon: Info, labelKey: 'about' },
  { href: '/contact', icon: Mail, labelKey: 'contactUs' },
  { href: '/feedback', icon: MessageSquare, labelKey: 'feedback' },
] as const;

export function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const t = useTranslations('menu');
  const tFooter = useTranslations('footer');
  const user = useAppStore((s) => s.user);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const panelRef = useRef<HTMLDivElement>(null);

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
        className="fixed top-0 right-0 bottom-0 z-[90] flex flex-col"
        style={{
          width: 'min(320px, 85vw)',
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
              href="/profile"
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
        </div>

        {/* Footer — legal links */}
        <div
          className="flex flex-wrap gap-x-4 gap-y-1"
          style={{
            padding: 16,
            borderTop: '1px solid var(--bg-elevated)',
          }}
        >
          <Link
            href="/legal/privacy"
            onClick={onClose}
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
            onClick={onClose}
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
            onClick={onClose}
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
    </>
  );
}
