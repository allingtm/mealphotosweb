'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Loader2, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                   */
/* ------------------------------------------------------------------ */

const CURRENCY_SYMBOLS: Record<string, string> = { gbp: '£', usd: '$', eur: '€' };

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency.toUpperCase()} `;
  const formatted = amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
  return `${symbol}${formatted}`;
}

function buildPlans(
  t: (key: string, values?: Record<string, string>) => string,
  tRaw: (key: string) => string[],
  prices?: { personal: { amount: number; currency: string }; business: { amount: number; currency: string } },
) {
  return [
    {
      key: 'free' as const,
      price: null,
      subtitle: t('freeSubtitle'),
      features: tRaw('freeDetailFeatures') as string[],
    },
    {
      key: 'personal' as const,
      price: prices ? formatPrice(prices.personal.amount, prices.personal.currency) : null,
      subtitle: t('personalSubtitle'),
      includesFrom: t('free'),
      features: tRaw('personalDetailFeatures') as string[],
    },
    {
      key: 'business' as const,
      price: prices ? formatPrice(prices.business.amount, prices.business.currency) : null,
      subtitle: t('businessSubtitle'),
      includesFrom: t('personal'),
      features: tRaw('businessDetailFeatures') as string[],
    },
  ];
}

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

function buildComparison(tc: (key: string) => string): ComparisonSection[] {
  return [
    {
      title: tc('uploading'),
      rows: [
        { label: tc('dailyUploads'), free: '5', personal: '15', business: tc('unlimited') },
        { label: tc('photosPerMeal'), free: '1', personal: '4', business: '4' },
      ],
    },
    {
      title: tc('community'),
      rows: [
        { label: tc('rateMeals'), free: '✓', personal: '✓', business: '✓' },
        { label: tc('requestRecipes'), free: '✓', personal: '✓', business: '✓' },
        { label: tc('privateFeedMembers'), free: '5', personal: '25', business: '100' },
        { label: tc('streaksBadges'), free: '✓', personal: '✓', business: '✓' },
      ],
    },
    {
      title: tc('visibility'),
      rows: [
        { label: tc('mealsOnMap'), free: '✓', personal: '✓', business: '✓' },
        { label: tc('verifiedBadge'), free: '—', personal: '—', business: '✓' },
        { label: tc('dedicatedPin'), free: '—', personal: '—', business: '✓' },
        { label: tc('feedPromotion'), free: '—', personal: '—', business: '✓' },
        { label: tc('priorityPlacement'), free: '—', personal: '—', business: '✓' },
      ],
    },
    {
      title: tc('insights'),
      rows: [
        { label: tc('basicStats'), free: '✓', personal: '✓', business: '✓' },
        { label: tc('fullAnalytics'), free: '—', personal: '—', business: '✓' },
        { label: tc('anonTesting'), free: '—', personal: '—', business: '✓' },
      ],
    },
    {
      title: tc('support'),
      rows: [
        { label: tc('communitySupport'), free: '✓', personal: '✓', business: '✓' },
        { label: tc('prioritySupport'), free: '—', personal: '✓', business: '✓' },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */

function buildFaq(tf: (key: string) => string) {
  return [
    { q: tf('q1'), a: tf('a1') },
    { q: tf('q2'), a: tf('a2') },
    { q: tf('q3'), a: tf('a3') },
    { q: tf('q4'), a: tf('a4') },
    { q: tf('q5'), a: tf('a5') },
    { q: tf('q6'), a: tf('a6') },
    { q: tf('q7'), a: tf('a7') },
  ];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tc = useTranslations('pricing.comparison');
  const tf = useTranslations('pricing.faq');
  const router = useRouter();
  const userPlan = useAppStore((s) => s.userPlan);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [prices, setPrices] = useState<{ personal: { amount: number; currency: string }; business: { amount: number; currency: string } } | null>(null);

  useEffect(() => {
    fetch('/api/prices')
      .then((res) => res.json())
      .then((data) => { if (data.personal) setPrices(data); })
      .catch(() => {});
  }, []);

  const tRaw = (key: string) => t.raw(key) as string[];
  const PLANS = buildPlans(t, tRaw, prices ?? undefined);
  const COMPARISON = buildComparison(tc);
  const FAQ = buildFaq(tf);

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

              {plan.key === 'free' ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                  {t('freePrice')}
                </p>
              ) : plan.price ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 16 }}>
                  {plan.price}
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>
                    {t('perMonth')}
                  </span>
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  —
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
                  {t('includesFrom', { plan: plan.includesFrom })}
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
          {t('compareAll')}
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
              {[t('free'), t('personal'), t('business')].map((label) => (
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
          {t('faqTitle')}
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
