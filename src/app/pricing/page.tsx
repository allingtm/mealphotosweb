'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

const PLANS = [
  {
    key: 'free' as const,
    price: null,
    features: [
      '5 uploads/day',
      '1 photo per meal',
      '5 private feed members',
      'Rate & request recipes',
    ],
  },
  {
    key: 'personal' as const,
    price: '£4.99',
    features: [
      '15 uploads/day',
      'Up to 4 photos per meal',
      '25 private feed members',
      'Priority support',
    ],
  },
  {
    key: 'business' as const,
    price: '£29',
    features: [
      '20 uploads/day',
      'Up to 4 photos per meal',
      '100 private feed members',
      'Anonymous dish testing',
      'Restaurant analytics',
    ],
  },
];

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const userPlan = useAppStore((s) => s.userPlan);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleSubscribe = async (plan: 'personal' | 'business') => {
    if (!user) {
      openAuthModal();
      return;
    }

    setSubscribing(plan);
    try {
      const body: Record<string, string> = { plan };
      if (plan === 'business') {
        body.tier = 'basic';
      }
      const res = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setSubscribing(null);
    }
  };

  return (
    <div
      className="mx-auto px-4 pb-24 pt-8 md:pt-12"
      style={{ maxWidth: 960 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          color: 'var(--accent-primary)',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {t('title')}
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: 40,
        }}
      >
        {t('subtitle')}
      </p>

      {/* Plan cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {PLANS.map((plan) => {
          const isCurrent = userPlan === plan.key;
          const isUpgrade = plan.key !== 'free' && !isCurrent;

          return (
            <div
              key={plan.key}
              className="rounded-3xl p-6 flex flex-col"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: isCurrent ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 24,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {t(plan.key)}
              </h2>
              {plan.price ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 16 }}>
                  {plan.price}
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>
                    {t('perMonth')}
                  </span>
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                  £0
                </p>
              )}

              <ul className="flex-1" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2"
                    style={{ marginBottom: 8 }}
                  >
                    <Check
                      size={16}
                      strokeWidth={2}
                      style={{ color: 'var(--status-success)', marginTop: 2, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 rounded-2xl"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {t('currentPlan')}
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleSubscribe(plan.key as 'personal' | 'business')}
                  disabled={!!subscribing}
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#121212',
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {subscribing === plan.key && <Loader2 size={16} className="animate-spin" />}
                  {plan.key === 'personal' ? t('getPersonal') : t('getBusiness')}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
