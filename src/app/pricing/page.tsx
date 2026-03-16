'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Basic',
    price: '£29',
    subtitle: 'Get your business on the map.',
    features: [
      'Business profile & map pin',
      'Up to 20 dish posts per day',
      'Basic stats (reactions, saves)',
      'Comments & Q&A with customers',
      'Menu digitisation',
    ],
    highlighted: false,
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    price: '£79',
    subtitle: 'Grow with full analytics & priority.',
    features: [
      'Everything in Basic',
      'Unlimited dish posts',
      'Full analytics dashboard',
      'Larger map pin',
      'Featured badge on profile',
      'Priority in local feed',
    ],
    highlighted: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const userPlan = useAppStore((s) => s.userPlan);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleChoose = async (planId: 'basic' | 'premium') => {
    if (!user) {
      openAuthModal();
      return;
    }

    // If already on this plan, do nothing
    if (userPlan === planId) return;

    // Business onboarding for new businesses
    if (userPlan === 'free') {
      router.push('/business/onboard');
      return;
    }

    // Upgrade/downgrade for existing subscribers
    setSubscribing(planId);
    try {
      const res = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
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
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto px-4 pb-24 pt-8" style={{ maxWidth: 720 }}>
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
          Plans for Food Businesses
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          Consumers always browse for free. Choose a plan to showcase your dishes.
        </p>

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = userPlan === plan.id;
            return (
              <div
                key={plan.id}
                className="rounded-3xl p-6 flex flex-col"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: plan.highlighted
                    ? '2px solid var(--accent-primary)'
                    : '2px solid var(--bg-elevated)',
                }}
              >
                {plan.highlighted && (
                  <span
                    className="self-start rounded-full px-3 py-1 mb-3"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--bg-primary)',
                    }}
                  >
                    Most popular
                  </span>
                )}

                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 24,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {plan.name}
                </h2>

                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginBottom: 16,
                  }}
                >
                  {plan.subtitle}
                </p>

                <p style={{ marginBottom: 20 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 36,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    /month
                  </span>
                </p>

                <ul className="flex-1 flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
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
                    className="w-full py-3 rounded-full"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleChoose(plan.id)}
                    disabled={!!subscribing}
                    className="w-full py-3 rounded-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: plan.highlighted ? 'var(--accent-primary)' : 'transparent',
                      color: plan.highlighted ? 'var(--bg-primary)' : 'var(--text-primary)',
                      border: plan.highlighted ? 'none' : '1px solid var(--bg-elevated)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {subscribing === plan.id && <Loader2 size={16} className="animate-spin" />}
                    Choose {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Consumer note */}
        <p
          className="text-center mt-8"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Not a business? meal.photos is completely free for consumers. Browse dishes, save favourites, and discover food businesses near you.
        </p>
      </div>
    </div>
  );
}
