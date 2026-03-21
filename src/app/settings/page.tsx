'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, LogOut, CreditCard, Users, Mail, Store, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { LanguagePicker } from '@/components/settings/LanguagePicker';
import { AppBar } from '@/components/layout/AppBar';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const userPlan = useAppStore((s) => s.userPlan);
  const isBusiness = useAppStore((s) => s.isBusiness);
  const planLabel = userPlan === 'business' ? 'Business' : 'Free';

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div
      className="w-full flex-1 min-h-0 overflow-y-auto"
      style={{
        maxWidth: 960,
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        paddingBottom: 72,
      }}
    >
    <AppBar title={t('title')} />
    <div className="px-4 pt-4 md:pt-8">
      {/* Language section */}
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
          {t('languageLabel')}
        </h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <LanguagePicker />
        </div>
      </section>

      {/* Account section */}
      {user ? (
        <>
          {/* Business Profile section */}
          {isBusiness && (
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
                {t('businessProfile')}
              </h2>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <SettingsLink
                  href="/settings/business-profile"
                  icon={<Store size={20} strokeWidth={1.5} />}
                  label={t('editBusinessDetails')}
                />
                <SettingsDivider />
                <SettingsLink
                  href="/settings/premises"
                  icon={<MapPin size={20} strokeWidth={1.5} />}
                  label={t('managePremises')}
                />
              </div>
            </section>
          )}

          {/* Subscription section */}
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
              {t('subscription')}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <CreditCard size={20} strokeWidth={1.5} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>
                    {t('currentPlan', { plan: planLabel })}
                  </span>
                </div>
                {userPlan === 'free' ? (
                  <Link
                    href="/pricing"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {t('upgrade')}
                  </Link>
                ) : (
                  <Link
                    href="/api/restaurants/portal"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                  >
                    {t('manageSubscription')}
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Private Feed section */}
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
              {t('privateFeed')}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <SettingsLink
                href="/settings/private-feed-list"
                icon={<Users size={20} strokeWidth={1.5} />}
                label={t('manageFeedList')}
              />
              <SettingsDivider />
              <SettingsLink
                href="/settings/private-feed-list/invitations"
                icon={<Mail size={20} strokeWidth={1.5} />}
                label={t('viewInvitations')}
              />
            </div>
          </section>

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
