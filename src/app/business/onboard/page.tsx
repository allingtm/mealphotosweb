'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import TypeSelector from '@/components/business/TypeSelector';
import BusinessProfileForm, {
  defaultBusinessFormData,
  type BusinessFormData,
} from '@/components/business/BusinessProfileForm';
import { type BusinessType, getBusinessTypeGroup } from '@/types/database';

export default function OnboardPage() {
  const requireAuth = useRequireAuth();
  const [step, setStep] = useState(0); // 0: type, 1: profile, 2: tier
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [tier, setTier] = useState<'basic' | 'premium'>('basic');
  const [formData, setFormData] = useState<BusinessFormData>(defaultBusinessFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeSelect = (type: BusinessType) => {
    setBusinessType(type);
    posthog.capture(ANALYTICS_EVENTS.BUSINESS_ONBOARDING_STARTED, { business_type: type });
  };

  const handleFormChange = (partial: Partial<BusinessFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleSubmit = async () => {
    if (!businessType || !formData.business_name.trim()) return;

    try {
      await requireAuth();
      setLoading(true);
      setError(null);

      const group = getBusinessTypeGroup(businessType);

      // 1. Create business profile
      const profilePayload: Record<string, unknown> = {
        business_type: businessType,
        business_name: formData.business_name.trim(),
        phone: formData.phone || null,
        email: formData.email || null,
        website_url: formData.website_url || null,
        booking_url: formData.booking_url || null,
        address_line_1: formData.address_line_1 || null,
        address_line_2: formData.address_line_2 || null,
        address_city: formData.address_city || null,
        address_postcode: formData.address_postcode || null,
        address_country: formData.address_country || 'GB',
      };

      if (group === 'food_drink' || businessType === 'other') {
        profilePayload.menu_url = formData.menu_url || null;
        profilePayload.delivery_available = formData.delivery_available;
        if (formData.cuisine_types) {
          profilePayload.cuisine_types = formData.cuisine_types
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      if (group === 'health_nutrition') {
        profilePayload.accepts_clients = formData.accepts_clients;
        profilePayload.service_area = formData.service_area || null;
        profilePayload.consultation_type = formData.consultation_type.length > 0
          ? formData.consultation_type
          : null;
        if (formData.qualifications) {
          profilePayload.qualifications = formData.qualifications
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (formData.specialisms) {
          profilePayload.specialisms = formData.specialisms
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      const profileRes = await fetch('/api/business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        // If profile already exists (409), continue to Stripe
        if (profileRes.status !== 409) {
          setError(data.error || 'Failed to create business profile');
          setLoading(false);
          return;
        }
      }

      // 2. Create Stripe checkout session
      const subRes = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'business',
          tier,
          business_type: businessType,
        }),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        setError(subData.error || 'Failed to create checkout session');
        setLoading(false);
        return;
      }

      posthog.capture(ANALYTICS_EVENTS.BUSINESS_ONBOARDING_COMPLETED, {
        business_type: businessType,
        tier,
      });

      window.location.href = subData.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center px-4 pb-24"
      style={{ minHeight: 'calc(100dvh - 56px)' }}
    >
      <div className="w-full" style={{ maxWidth: 480, paddingTop: 32 }}>
        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center" style={{ marginBottom: 32 }}>
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className="rounded-full"
              style={{
                width: step >= s ? 32 : 8,
                height: 8,
                backgroundColor:
                  step >= s ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step 0: Type selection */}
        {step === 0 && (
          <>
            <TypeSelector selected={businessType} onSelect={handleTypeSelect} />
            <button
              onClick={() => businessType && setStep(1)}
              disabled={!businessType}
              className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              style={{
                marginTop: 24,
                backgroundColor: businessType ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: businessType ? '#121212' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Continue
              <ArrowRight size={18} strokeWidth={1.5} />
            </button>
          </>
        )}

        {/* Step 1: Profile form */}
        {step === 1 && businessType && (
          <>
            <BusinessProfileForm
              businessType={businessType}
              data={formData}
              onChange={handleFormChange}
            />
            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => setStep(0)}
                className="py-3 px-6 rounded-2xl flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  border: '1px solid var(--bg-elevated)',
                }}
              >
                <ArrowLeft size={18} strokeWidth={1.5} />
                Back
              </button>
              <button
                onClick={() => formData.business_name.trim() && setStep(2)}
                disabled={!formData.business_name.trim()}
                className="flex-1 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: formData.business_name.trim()
                    ? 'var(--accent-primary)'
                    : 'var(--bg-elevated)',
                  color: formData.business_name.trim() ? '#121212' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Continue
                <ArrowRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Tier selection + checkout */}
        {step === 2 && (
          <>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              Choose your plan
            </h2>

            <div className="flex flex-col gap-4">
              {([
                {
                  key: 'basic' as const,
                  name: 'Basic',
                  price: '29',
                  features: ['Business profile', 'Map pin', '10 dish uploads', 'Basic stats'],
                },
                {
                  key: 'premium' as const,
                  name: 'Premium',
                  price: '79',
                  features: [
                    'Unlimited uploads',
                    'Feed promotion',
                    'Analytics dashboard',
                    'Priority map placement',
                    '"Top Rated" badges',
                  ],
                },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTier(t.key)}
                  className="rounded-2xl text-left"
                  style={{
                    padding: 20,
                    backgroundColor: 'var(--bg-surface)',
                    border: tier === t.key
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--bg-elevated)',
                  }}
                >
                  <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 28,
                        color: 'var(--text-primary)',
                      }}
                    >
                      £{t.price}
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        /mo
                      </span>
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {t.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 14,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {error && (
              <p
                style={{
                  marginTop: 16,
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--status-error)',
                  textAlign: 'center',
                }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="py-3 px-6 rounded-2xl flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  border: '1px solid var(--bg-elevated)',
                }}
              >
                <ArrowLeft size={18} strokeWidth={1.5} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                  color: loading ? 'var(--text-secondary)' : '#121212',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {loading && <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />}
                {loading ? 'Redirecting...' : 'Continue to payment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
