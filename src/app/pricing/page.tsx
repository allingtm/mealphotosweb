'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Loader2, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                   */
/* ------------------------------------------------------------------ */

const PLANS = [
  {
    key: 'free' as const,
    price: null,
    subtitle: 'For casual food lovers',
    features: [
      '5 uploads per day',
      '1 photo per meal',
      '5 private feed members',
      'Rate meals & request recipes',
      'Upload streaks & badges',
      'Meals shown on global map',
    ],
  },
  {
    key: 'personal' as const,
    price: '£4.99',
    subtitle: 'For dedicated foodies',
    includesFrom: 'Free',
    features: [
      '15 uploads per day',
      'Up to 4 photos per meal',
      '25 private feed members',
      'Priority support',
    ],
  },
  {
    key: 'business' as const,
    price: '£79',
    subtitle: 'For restaurants & food businesses',
    includesFrom: 'Personal',
    features: [
      'Unlimited dish uploads',
      'Verified business profile & badge',
      'Dedicated map pin for your venue',
      'Feed promotion in your local area',
      'Full analytics dashboard',
      'Anonymous dish testing',
      'Priority map placement',
      '"Top Rated" badges',
      'Content posts on your profile',
      '100 private feed members',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Feature comparison data                                            */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  label: string;
  free: string;
  personal: string;
  business: string;
}

interface ComparisonSection {
  title: string;
  rows: ComparisonRow[];
}

const COMPARISON: ComparisonSection[] = [
  {
    title: 'Uploading',
    rows: [
      { label: 'Daily uploads', free: '5', personal: '15', business: 'Unlimited' },
      { label: 'Photos per meal', free: '1', personal: '4', business: '4' },
    ],
  },
  {
    title: 'Community',
    rows: [
      { label: 'Rate meals', free: '✓', personal: '✓', business: '✓' },
      { label: 'Request recipes', free: '✓', personal: '✓', business: '✓' },
      { label: 'Private feed members', free: '5', personal: '25', business: '100' },
      { label: 'Streaks & badges', free: '✓', personal: '✓', business: '✓' },
    ],
  },
  {
    title: 'Visibility',
    rows: [
      { label: 'Meals on global map', free: '✓', personal: '✓', business: '✓' },
      { label: 'Verified business badge', free: '—', personal: '—', business: '✓' },
      { label: 'Dedicated map pin', free: '—', personal: '—', business: '✓' },
      { label: 'Feed promotion', free: '—', personal: '—', business: '✓' },
      { label: 'Priority map placement', free: '—', personal: '—', business: '✓' },
    ],
  },
  {
    title: 'Insights',
    rows: [
      { label: 'Basic rating stats', free: '✓', personal: '✓', business: '✓' },
      { label: 'Full analytics dashboard', free: '—', personal: '—', business: '✓' },
      { label: 'Anonymous dish testing', free: '—', personal: '—', business: '✓' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Community support', free: '✓', personal: '✓', business: '✓' },
      { label: 'Priority support', free: '—', personal: '✓', business: '✓' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: 'Can I use meal.photos for free?',
    a: 'Yes — meal.photos is free forever. Upload meals, rate others, and appear on the global map at no cost. Upgrade only when you want more.',
  },
  {
    q: 'What happens if I cancel my subscription?',
    a: 'All your meals, ratings, and profile stay exactly as they are. You simply revert to Free plan limits.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Absolutely. Upgrade or downgrade anytime from Settings. Changes take effect immediately.',
  },
  {
    q: 'What is a private feed?',
    a: 'A private feed lets you share meals with a select group of friends or family. Only invited members can see and rate your private meals.',
  },
  {
    q: 'How does anonymous dish testing work?',
    a: 'Business subscribers can upload dishes without their restaurant name attached. The community rates them honestly — then you reveal your identity when you\'re ready.',
  },
  {
    q: 'Do I need a Business plan to appear on the map?',
    a: 'No — every user\'s meals appear on the global map. The Business plan gives you a dedicated venue pin so customers can find your location directly.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings and tap "Manage Subscription". This opens Stripe\'s Customer Portal where you can cancel, update payment, or switch plans.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const t = useTranslations('pricing');
  const router = useRouter();
  const userPlan = useAppStore((s) => s.userPlan);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = async (plan: 'personal' | 'business') => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (plan === 'business') {
      router.push('/business/onboard');
      return;
    }

    setSubscribing(plan);
    try {
      const res = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
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
      className="md:overflow-y-auto md:flex-1 md:min-h-0"
    >
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

      {/* Hero */}
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

      {/* ============================================================ */}
      {/*  Plan Cards                                                   */}
      {/* ============================================================ */}
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
                  marginBottom: 2,
                }}
              >
                {t(plan.key)}
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                }}
              >
                {plan.subtitle}
              </p>

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

              {plan.includesFrom && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--accent-primary)',
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  Everything in {plan.includesFrom}, plus:
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
                  type="button"
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

      {/* ============================================================ */}
      {/*  Feature Comparison Table                                     */}
      {/* ============================================================ */}
      <div style={{ marginTop: 56 }}>
        <button
          type="button"
          onClick={() => setShowComparison((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Compare all features
          <ChevronDown
            size={20}
            strokeWidth={1.5}
            style={{
              color: 'var(--text-secondary)',
              transform: showComparison ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        {showComparison && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              marginTop: 16,
              border: '1px solid var(--bg-elevated)',
            }}
          >
            {/* Table header */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: '1fr 72px 72px 72px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--bg-elevated)',
              }}
            >
              <span />
              {['Free', 'Personal', 'Business'].map((label) => (
                <span
                  key={label}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {COMPARISON.map((section) => (
              <div key={section.title}>
                {/* Section header */}
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {section.title}
                  </span>
                </div>

                {/* Rows */}
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: '1fr 72px 72px 72px',
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--bg-elevated)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {row.label}
                    </span>
                    {([row.free, row.personal, row.business] as const).map((val, i) => (
                      <span
                        key={i}
                        style={{
                          textAlign: 'center',
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                        }}
                      >
                        {val === '✓' ? (
                          <Check
                            size={16}
                            strokeWidth={2}
                            style={{ color: 'var(--status-success)', display: 'inline' }}
                          />
                        ) : val === '—' ? (
                          <Minus
                            size={16}
                            strokeWidth={1.5}
                            style={{ color: 'var(--text-secondary)', display: 'inline' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</span>
                        )}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  FAQ                                                          */}
      {/* ============================================================ */}
      <div style={{ marginTop: 56, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Frequently asked questions
        </h2>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
          }}
        >
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{
                borderBottom: i < FAQ.length - 1 ? '1px solid var(--bg-elevated)' : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between text-left"
                style={{
                  padding: '14px 16px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {item.q}
                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  style={{
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                    marginLeft: 8,
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
              {openFaq === i && (
                <div
                  style={{
                    padding: '0 16px 14px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
