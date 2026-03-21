'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Camera } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import CategorySelector from '@/components/business/CategorySelector';
import BusinessProfileForm, {
  defaultBusinessFormData,
  type BusinessFormData,
} from '@/components/business/BusinessProfileForm';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { type BusinessType, getBusinessTypeGroup } from '@/types/database';

const STORAGE_KEY = 'onboard_form_state';
const TOTAL_STEPS = 4; // 0: type, 1: details, 2: avatar, 3: payment

export default function OnboardPage() {
  const requireAuth = useRequireAuth();
  const [step, setStep] = useState(0);
  const [businessCategories, setBusinessCategories] = useState<BusinessType[]>([]);
  const [formData, setFormData] = useState<BusinessFormData>(defaultBusinessFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Restore form state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.step != null) setStep(state.step);
        if (state.businessCategories) setBusinessCategories(state.businessCategories);
        else if (state.businessType) setBusinessCategories([state.businessType]);
        if (state.formData) setFormData({ ...defaultBusinessFormData, ...state.formData });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist form state to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, businessCategories, formData }),
      );
    } catch {
      // Ignore storage errors
    }
  }, [step, businessCategories, formData]);

  const handleCategoriesChange = (categories: BusinessType[]) => {
    setBusinessCategories(categories);
    if (categories.length === 1) {
      posthog.capture(ANALYTICS_EVENTS.BUSINESS_ONBOARDING_STARTED, { business_type: categories[0] });
    }
  };

  // Primary type for form field visibility (uses first selected category)
  const businessType = businessCategories[0] ?? null;

  const handleFormChange = (partial: Partial<BusinessFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setShowCropModal(true);
    }
  };

  const handleAvatarSaved = useCallback(() => {
    // Avatar was uploaded successfully — show preview
    if (avatarFile) {
      setAvatarPreview(URL.createObjectURL(avatarFile));
    }
    setShowCropModal(false);
  }, [avatarFile]);

  const handleSubmit = async () => {
    if (businessCategories.length === 0 || !formData.business_name.trim()) return;

    try {
      await requireAuth();
      setLoading(true);
      setError(null);

      const group = getBusinessTypeGroup(businessCategories[0]);

      // 1. Create business profile (legacy — still needed for subscription tracking)
      const profilePayload: Record<string, unknown> = {
        business_type: businessCategories[0],
        business_name: formData.business_name.trim(),
        bio: formData.bio || null,
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

      if (group === 'food_service' || businessCategories[0] === 'other') {
        profilePayload.menu_url = formData.menu_url || null;
        profilePayload.delivery_available = formData.delivery_available;
        if (formData.cuisine_types) {
          profilePayload.cuisine_types = formData.cuisine_types
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      if (group === 'shops_retail' || group === 'production') {
        profilePayload.delivery_available = formData.delivery_available;
      }

      if (group === 'chefs_experiences') {
        profilePayload.class_types = formData.class_types.length > 0 ? formData.class_types : null;
        profilePayload.price_from_pence = formData.price_from ? Math.round(parseFloat(formData.price_from) * 100) : null;
        profilePayload.service_area = formData.service_area || null;
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

      const profileRes = await fetch('/api/businesses/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        if (profileRes.status !== 409) {
          setError(data.error || 'Failed to create business profile');
          setLoading(false);
          return;
        }
      }

      // 1b. Create first premise
      const premisePayload: Record<string, unknown> = {
        name: formData.business_name.trim(),
        business_categories: businessCategories,
        address_line_1: formData.address_line_1 || null,
        address_line_2: formData.address_line_2 || null,
        address_city: formData.address_city || 'Unknown',
        address_region: formData.address_city || 'Unknown', // Default region to city for now
        address_postcode: formData.address_postcode || null,
        address_country: formData.address_country || 'GB',
        phone: formData.phone || null,
        email: formData.email || null,
        website_url: formData.website_url || null,
        booking_url: formData.booking_url || null,
        bio: formData.bio || null,
        delivery_available: formData.delivery_available,
      };

      if (formData.cuisine_types) {
        premisePayload.cuisine_types = formData.cuisine_types
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const premiseRes = await fetch('/api/businesses/premises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(premisePayload),
      });

      if (!premiseRes.ok) {
        const premiseData = await premiseRes.json();
        // Not fatal — premise can be created later
        console.warn('Premise creation failed:', premiseData.error);
      }

      // 2. Create Stripe checkout session
      const subRes = await fetch('/api/restaurants/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        setError(subData.error || 'Failed to create checkout session');
        setLoading(false);
        return;
      }

      posthog.capture(ANALYTICS_EVENTS.BUSINESS_ONBOARDING_COMPLETED, {
        business_type: businessCategories[0],
        business_categories: businessCategories,
      });

      // Clear sessionStorage on successful submission
      sessionStorage.removeItem(STORAGE_KEY);

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
          {Array.from({ length: TOTAL_STEPS }, (_, s) => (
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
            <CategorySelector selected={businessCategories} onSelect={handleCategoriesChange} />
            <button
              onClick={() => businessCategories.length > 0 && setStep(1)}
              disabled={businessCategories.length === 0}
              className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              style={{
                marginTop: 24,
                backgroundColor: businessCategories.length > 0 ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: businessCategories.length > 0 ? 'var(--primary-foreground)' : 'var(--text-secondary)',
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

            {error && (
              <p style={{ marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--status-error)', textAlign: 'center' }}>
                {error}
              </p>
            )}

            <div className="flex gap-3" style={{ marginTop: 24 }}>
              <button
                type="button"
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
                type="button"
                onClick={() => {
                  if (formData.business_name.trim()) {
                    setError(null);
                    setStep(2);
                  }
                }}
                disabled={!formData.business_name.trim()}
                className="flex-1 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: !formData.business_name.trim()
                    ? 'var(--bg-elevated)'
                    : 'var(--accent-primary)',
                  color: !formData.business_name.trim()
                    ? 'var(--text-secondary)'
                    : '#121212',
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

        {/* Step 2: Avatar upload */}
        {step === 2 && (
          <>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Add your logo
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: 32,
              }}
            >
              This will appear on your profile and in the feed
            </p>

            <div className="flex flex-col items-center gap-4">
              {/* Avatar preview circle */}
              <label
                htmlFor="avatar-upload"
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '2px dashed var(--text-secondary)',
                  overflow: 'hidden',
                }}
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Camera size={32} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="py-2 px-6 rounded-full"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  border: '1px solid var(--bg-elevated)',
                }}
              >
                {avatarPreview ? 'Change photo' : 'Upload Logo'}
              </button>
            </div>

            <div className="flex gap-3" style={{ marginTop: 32 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
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
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: loading ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                  color: loading ? 'var(--text-secondary)' : 'var(--primary-foreground)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {loading && <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />}
                {loading ? 'Redirecting...' : 'Continue to payment'}
              </button>
            </div>

            {!avatarPreview && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-3"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Skip for now
              </button>
            )}

            {error && (
              <p style={{ marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--status-error)', textAlign: 'center' }}>
                {error}
              </p>
            )}

            {/* Avatar crop modal */}
            <AvatarCropModal
              isOpen={showCropModal}
              onClose={() => setShowCropModal(false)}
              onSaved={handleAvatarSaved}
              file={avatarFile}
            />
          </>
        )}
      </div>
    </div>
  );
}
