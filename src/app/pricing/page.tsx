'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const FEATURES = [
  'Business profile & map pin',
  'Unlimited dish posts',
  'Full analytics dashboard',
  'Comments & Q&A with customers',
  'Menu digitisation',
];

export default function PricingPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const userPlan = useAppStore((s) => s.userPlan);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [subscribing, setSubscribing] = useState(false);

  const isCurrent = userPlan === 'business';

  const handleChoose = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (isCurrent) return;

    if (userPlan === 'free') {
      router.push('/business/onboard');
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setSubscribing(false);
    }
  };

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto px-4 pb-24 pt-8" style={{ maxWidth: 480 }}>
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
          For Businesses
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
          Get your business on the map and start posting dishes today.
        </p>

        {/* Single plan card */}
        <div
          className="rounded-3xl p-6 flex flex-col"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--accent-primary)',
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
            Business
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}
          >
            Everything you need to grow your food business.
          </p>

          <p style={{ marginBottom: 20 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                color: 'var(--accent-primary)',
              }}
            >
              £49.95
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
            {FEATURES.map((feature) => (
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
              onClick={handleChoose}
              disabled={subscribing}
              className="w-full py-3 rounded-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {subscribing && <Loader2 size={16} className="animate-spin" />}
              Get Started
            </button>
          )}
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
