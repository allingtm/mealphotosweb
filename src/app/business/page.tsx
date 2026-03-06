'use client';

import { Check, ChefHat, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PricingTier {
  name: string;
  tier: 'basic' | 'premium';
  price: string;
  popular: boolean;
  features: string[];
}

const tiers: PricingTier[] = [
  {
    name: 'Basic',
    tier: 'basic',
    price: '29',
    popular: false,
    features: [
      'Business profile & verified badge',
      'Map pin for your location',
      '10 dish uploads per month',
      'Basic rating stats',
      'Content posts on your profile',
    ],
  },
  {
    name: 'Premium',
    tier: 'premium',
    price: '79',
    popular: true,
    features: [
      'Unlimited dish uploads',
      'Feed promotion in local area',
      'Analytics dashboard',
      'Priority map placement',
      '"Top Rated" badges',
      'Content posts on your profile',
    ],
  },
];

export default function BusinessPage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col items-center px-4 pb-24"
      style={{ minHeight: 'calc(100dvh - 56px)' }}
    >
      {/* Hero */}
      <div className="text-center" style={{ maxWidth: 560, paddingTop: 48, marginBottom: 48 }}>
        <div
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'rgba(232, 168, 56, 0.15)',
            marginBottom: 24,
          }}
        >
          <ChefHat size={32} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            color: 'var(--accent-primary)',
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Business Plan
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Whether you run a restaurant, cafe, or nutrition practice — get a verified profile,
          appear on the map, and connect with your community.
        </p>
      </div>

      {/* Pricing Cards */}
      <div
        className="grid gap-6 w-full"
        style={{ maxWidth: 640, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="flex flex-col rounded-2xl relative"
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: 24,
              border: tier.popular
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--bg-elevated)',
            }}
          >
            {tier.popular && (
              <div
                className="absolute flex items-center gap-1 rounded-full"
                style={{
                  top: -12,
                  right: 16,
                  backgroundColor: 'var(--accent-primary)',
                  color: '#121212',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                }}
              >
                <Crown size={14} strokeWidth={1.5} />
                Most Popular
              </div>
            )}

            <h2
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {tier.name}
            </h2>

            <div className="flex items-baseline gap-1" style={{ marginBottom: 24 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 40,
                  color: 'var(--text-primary)',
                }}
              >
                £{tier.price}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-secondary)',
                }}
              >
                /month
              </span>
            </div>

            <ul className="flex flex-col gap-3 flex-1" style={{ marginBottom: 24 }}>
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    size={18}
                    strokeWidth={2}
                    style={{
                      color: 'var(--status-success)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => router.push('/business/onboard')}
              className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              style={{
                backgroundColor: tier.popular
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
                color: tier.popular ? '#121212' : 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                border: tier.popular ? 'none' : '1px solid var(--text-secondary)',
              }}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="w-full text-center" style={{ maxWidth: 560, marginTop: 64 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
            marginBottom: 32,
          }}
        >
          How It Works
        </h2>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {[
            { step: '1', title: 'Choose your type', desc: 'Restaurant, nutritionist, PT, or more' },
            { step: '2', title: 'Set up profile', desc: 'Add your details and go live on the map' },
            { step: '3', title: 'Share & engage', desc: 'Upload dishes and post updates' },
            { step: '4', title: 'Get discovered', desc: 'Appear in search and on the map' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--accent-primary)',
                  color: '#121212',
                  fontFamily: 'var(--font-body)',
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {item.step}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
