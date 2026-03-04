'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, LogOut, Shield, FileText, Cookie, Trash2, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tLegal = useTranslations('legal');
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const showCookieBanner = useAppStore((s) => s.showCookieBanner);
  const openCookiePreferences = useAppStore((s) => s.openCookiePreferences);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div
      className="mx-auto px-4 pb-24 pt-8 md:pt-12"
      style={{ maxWidth: 720 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent-primary)',
            margin: 0,
          }}
        >
          {t('title')}
        </h1>
      </div>

      {/* Legal section */}
      <section className="mb-8">
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          {t('legal')}
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <SettingsLink
            href="/legal/privacy"
            icon={<Shield size={20} strokeWidth={1.5} />}
            label={t('privacyPolicy')}
          />
          <SettingsDivider />
          <SettingsLink
            href="/legal/terms"
            icon={<FileText size={20} strokeWidth={1.5} />}
            label={t('termsOfService')}
          />
          <SettingsDivider />
          <SettingsLink
            href="/legal/cookies"
            icon={<Cookie size={20} strokeWidth={1.5} />}
            label={t('cookiePolicy')}
          />
          <SettingsDivider />
          <SettingsButton
            icon={<Cookie size={20} strokeWidth={1.5} />}
            label={t('cookieSettings')}
            onClick={() => {
              showCookieBanner();
              openCookiePreferences();
            }}
          />
        </div>
      </section>

      {/* Account section */}
      {user ? (
        <>
          <section className="mb-8">
            <h2
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              {t('account')}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <SettingsButton
                icon={<LogOut size={20} strokeWidth={1.5} />}
                label={t('signOut')}
                onClick={handleSignOut}
              />
            </div>
          </section>

          <section>
            <h2
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--status-error)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              {t('dangerZone')}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <SettingsDisabled
                icon={<Download size={20} strokeWidth={1.5} />}
                label={t('exportData')}
                badge={t('comingSoon')}
              />
              <SettingsDivider />
              <SettingsDisabled
                icon={<Trash2 size={20} strokeWidth={1.5} />}
                label={t('deleteAccount')}
                badge={t('comingSoon')}
                danger
              />
            </div>
          </section>
        </>
      ) : (
        <section>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            {t('signIn')}
          </p>
        </section>
      )}
    </div>
  );
}

function SettingsLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 transition-colors"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
          }}
        >
          {label}
        </span>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={1.5}
        style={{ color: 'var(--text-secondary)' }}
      />
    </Link>
  );
}

function SettingsButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3 transition-colors"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
          }}
        >
          {label}
        </span>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={1.5}
        style={{ color: 'var(--text-secondary)' }}
      />
    </button>
  );
}

function SettingsDisabled({
  icon,
  label,
  badge,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  badge: string;
  danger?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ opacity: 0.5 }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            color: danger ? 'var(--status-error)' : 'var(--text-secondary)',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: danger ? 'var(--status-error)' : 'var(--text-primary)',
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="rounded-full px-2 py-0.5"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        {badge}
      </span>
    </div>
  );
}

function SettingsDivider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: 'var(--bg-elevated)',
        marginLeft: 52,
      }}
    />
  );
}
