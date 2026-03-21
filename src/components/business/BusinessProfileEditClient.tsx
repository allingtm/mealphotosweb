'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BusinessProfileForm from './BusinessProfileForm';
import type { BusinessFormData } from './BusinessProfileForm';
import { type BusinessProfile, type BusinessType, getBusinessTypeGroup } from '@/types/database';

interface Props {
  profile: BusinessProfile;
}

function mapProfileToFormData(profile: BusinessProfile): BusinessFormData {
  return {
    business_name: profile.business_name,
    bio: profile.bio ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    website_url: profile.website_url ?? '',
    booking_url: profile.booking_url ?? '',
    address_line_1: profile.address_line_1 ?? '',
    address_line_2: profile.address_line_2 ?? '',
    address_city: profile.address_city ?? '',
    address_postcode: profile.address_postcode ?? '',
    address_country: profile.address_country ?? 'GB',
    menu_url: profile.menu_url ?? '',
    cuisine_types: (profile.cuisine_types ?? []).join(', '),
    delivery_available: profile.delivery_available,
    qualifications: (profile.qualifications ?? []).join(', '),
    specialisms: (profile.specialisms ?? []).join(', '),
    accepts_clients: profile.accepts_clients,
    consultation_type: profile.consultation_type ?? [],
    service_area: profile.service_area ?? '',
    class_types: profile.class_types ?? [],
    price_from: profile.price_from_pence ? (profile.price_from_pence / 100).toString() : '',
    opening_hours: profile.opening_hours,
  };
}

function mapFormDataToPayload(data: BusinessFormData, businessType: BusinessType) {
  const group = getBusinessTypeGroup(businessType);
  const payload: Record<string, unknown> = {
    business_name: data.business_name,
    bio: data.bio || null,
    phone: data.phone || null,
    email: data.email || null,
    website_url: data.website_url || null,
    booking_url: data.booking_url || null,
    menu_url: data.menu_url || null,
    address_line_1: data.address_line_1 || null,
    address_line_2: data.address_line_2 || null,
    address_city: data.address_city || null,
    address_postcode: data.address_postcode || null,
    address_country: data.address_country || 'GB',
    opening_hours: data.opening_hours,
    delivery_available: data.delivery_available,
    accepts_clients: data.accepts_clients,
  };

  if (group === 'food_service') {
    payload.cuisine_types = data.cuisine_types
      ? data.cuisine_types.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
  }
  if (group === 'chefs_experiences') {
    payload.class_types = data.class_types;
    payload.price_from_pence = data.price_from ? Math.round(parseFloat(data.price_from) * 100) : null;
    payload.service_area = data.service_area || null;
  }
  if (group === 'health_nutrition') {
    payload.qualifications = data.qualifications
      ? data.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    payload.specialisms = data.specialisms
      ? data.specialisms.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    payload.consultation_type = data.consultation_type;
    payload.service_area = data.service_area || null;
  }

  return payload;
}

export function BusinessProfileEditClient({ profile }: Props) {
  const router = useRouter();
  const [data, setData] = useState<BusinessFormData>(mapProfileToFormData(profile));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setErrors({});

    try {
      const payload = mapFormDataToPayload(data, profile.business_type);
      const res = await fetch('/api/businesses/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [field, messages] of Object.entries(err.details.fieldErrors ?? {})) {
            fieldErrors[field] = (messages as string[])[0];
          }
          setErrors(fieldErrors);
        }
        return;
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full max-w-lg mx-auto px-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Edit Business Profile
          </h1>
        </div>

        {/* Business type (read-only) */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 24,
        }}>
          Business type: {profile.business_type.replace(/_/g, ' ')}
        </p>

        {/* Form errors */}
        {errors._form && (
          <p style={{ color: 'var(--status-error)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            {errors._form}
          </p>
        )}

        {/* Reuse BusinessProfileForm */}
        <BusinessProfileForm
          businessType={profile.business_type}
          data={data}
          onChange={(partial) => setData(prev => ({ ...prev, ...partial }))}
          errors={errors}
          hideTitle
        />

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-2xl mt-6"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            border: 'none',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Success toast */}
        {showSuccess && (
          <div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-6 py-3"
            style={{
              backgroundColor: 'var(--status-success)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Profile updated
          </div>
        )}
      </div>
    </div>
  );
}
