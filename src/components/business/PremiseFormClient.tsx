'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CategorySelector from './CategorySelector';
import { useAppStore } from '@/lib/store';
import type { BusinessPremise, BusinessType } from '@/types/database';

interface PremiseFormClientProps {
  mode: 'create' | 'edit';
  premise?: BusinessPremise;
}

interface PremiseFormData {
  name: string;
  bio: string;
  business_categories: BusinessType[];
  address_line_1: string;
  address_line_2: string;
  address_city: string;
  address_region: string;
  address_postcode: string;
  address_country: string;
  phone: string;
  email: string;
  website_url: string;
  booking_url: string;
  menu_url: string;
  opening_hours: Record<string, { open: string; close: string }> | null;
  cuisine_types: string;
  delivery_available: boolean;
}

const defaultFormData: PremiseFormData = {
  name: '',
  bio: '',
  business_categories: [],
  address_line_1: '',
  address_line_2: '',
  address_city: '',
  address_region: '',
  address_postcode: '',
  address_country: 'GB',
  phone: '',
  email: '',
  website_url: '',
  booking_url: '',
  menu_url: '',
  opening_hours: null,
  cuisine_types: '',
  delivery_available: false,
};

function mapPremiseToFormData(premise: BusinessPremise): PremiseFormData {
  return {
    name: premise.name,
    bio: premise.bio ?? '',
    business_categories: premise.business_categories ?? [],
    address_line_1: premise.address_line_1 ?? '',
    address_line_2: premise.address_line_2 ?? '',
    address_city: premise.address_city ?? '',
    address_region: premise.address_region ?? '',
    address_postcode: premise.address_postcode ?? '',
    address_country: premise.address_country ?? 'GB',
    phone: premise.phone ?? '',
    email: premise.email ?? '',
    website_url: premise.website_url ?? '',
    booking_url: premise.booking_url ?? '',
    menu_url: premise.menu_url ?? '',
    opening_hours: premise.opening_hours,
    cuisine_types: (premise.cuisine_types ?? []).join(', '),
    delivery_available: premise.delivery_available,
  };
}

function mapFormDataToPayload(data: PremiseFormData) {
  return {
    name: data.name,
    bio: data.bio || null,
    business_categories: data.business_categories,
    address_line_1: data.address_line_1 || null,
    address_line_2: data.address_line_2 || null,
    address_city: data.address_city,
    address_region: data.address_region,
    address_postcode: data.address_postcode || null,
    address_country: data.address_country || 'GB',
    phone: data.phone || null,
    email: data.email || null,
    website_url: data.website_url || null,
    booking_url: data.booking_url || null,
    menu_url: data.menu_url || null,
    opening_hours: data.opening_hours,
    cuisine_types: data.cuisine_types
      ? data.cuisine_types.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    delivery_available: data.delivery_available,
  };
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  outline: 'none',
};

const labelStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 600 as const,
  color: 'var(--text-secondary)',
  marginBottom: 4,
};

const timeInputStyle = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--bg-elevated)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
};

function Field({ label, required, children, error }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span style={labelStyle}>
        {label}{required && <span style={{ color: 'var(--status-error)' }}> *</span>}
      </span>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-body)' }}>
          {error}
        </span>
      )}
    </label>
  );
}

export function PremiseFormClient({ mode, premise }: PremiseFormClientProps) {
  const router = useRouter();
  const setPremises = useAppStore((s) => s.setPremises);
  const premises = useAppStore((s) => s.premises);
  const setActivePremiseId = useAppStore((s) => s.setActivePremiseId);

  const [data, setData] = useState<PremiseFormData>(
    mode === 'edit' && premise ? mapPremiseToFormData(premise) : defaultFormData
  );
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const update = (partial: Partial<PremiseFormData>) => setData((prev) => ({ ...prev, ...partial }));

  async function handleSave() {
    setSaving(true);
    setErrors({});

    try {
      const payload = mapFormDataToPayload(data);

      if (mode === 'create') {
        const res = await fetch('/api/businesses/premises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          if (res.status === 429) {
            setErrors({ _form: 'You\'ve reached your premise limit. Upgrade your plan to add more.' });
          } else if (err.details?.fieldErrors) {
            const fieldErrors: Record<string, string> = {};
            for (const [field, messages] of Object.entries(err.details.fieldErrors)) {
              fieldErrors[field] = (messages as string[])[0];
            }
            setErrors(fieldErrors);
          } else {
            setErrors({ _form: err.error ?? 'Something went wrong.' });
          }
          return;
        }

        const created = await res.json();
        const newPremise = created.premise;
        if (newPremise) {
          setPremises([...premises, newPremise]);
          if (premises.length === 0) setActivePremiseId(newPremise.id);
        }
        router.push('/me');
      } else {
        const res = await fetch(`/api/businesses/premises/${premise!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          if (err.details?.fieldErrors) {
            const fieldErrors: Record<string, string> = {};
            for (const [field, messages] of Object.entries(err.details.fieldErrors)) {
              fieldErrors[field] = (messages as string[])[0];
            }
            setErrors(fieldErrors);
          } else {
            setErrors({ _form: err.error ?? 'Something went wrong.' });
          }
          return;
        }

        const updated = await res.json();
        if (updated.premise) {
          setPremises(premises.map((p) => p.id === premise!.id ? updated.premise : p));
        }

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!premise) return;
    setActionLoading(true);
    setErrors({});

    try {
      const res = await fetch(`/api/businesses/premises/${premise.id}/deactivate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 400) {
          setErrors({ _form: 'You cannot deactivate your only active premise.' });
        } else {
          setErrors({ _form: err.error ?? 'Failed to deactivate.' });
        }
        return;
      }
      setPremises(premises.map((p) => p.id === premise.id ? { ...p, is_active: false } : p));
      router.push('/settings/premises');
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate() {
    if (!premise) return;
    setActionLoading(true);
    setErrors({});

    try {
      const res = await fetch(`/api/businesses/premises/${premise.id}/reactivate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 429) {
          setErrors({ _form: 'You\'ve reached your premise limit. Upgrade your plan or deactivate another premise first.' });
        } else {
          setErrors({ _form: err.error ?? 'Failed to reactivate.' });
        }
        return;
      }
      setPremises(premises.map((p) => p.id === premise.id ? { ...p, is_active: true } : p));
      router.push('/settings/premises');
    } catch {
      setErrors({ _form: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(false);
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
            {mode === 'create' ? 'Add Premise' : 'Edit Premise'}
          </h1>
        </div>

        {/* Form errors */}
        {errors._form && (
          <p style={{ color: 'var(--status-error)', fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            {errors._form}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {/* Name */}
          <Field label="Premise name" required error={errors.name}>
            <input
              type="text"
              value={data.name}
              onChange={(e) => update({ name: e.target.value })}
              maxLength={100}
              placeholder="e.g. Colchester High Street"
              style={inputStyle}
            />
          </Field>

          {/* Bio */}
          <Field label="Bio" error={errors.bio}>
            <textarea
              value={data.bio}
              onChange={(e) => update({ bio: e.target.value })}
              maxLength={500}
              rows={3}
              placeholder="Tell people about this location..."
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </Field>

          {/* Business Categories */}
          <div>
            <span style={labelStyle}>Business Categories *</span>
            {errors.business_categories && (
              <p style={{ fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-body)', marginTop: 4 }}>
                {errors.business_categories}
              </p>
            )}
            <div className="mt-2">
              <CategorySelector
                selected={data.business_categories}
                onSelect={(categories) => update({ business_categories: categories })}
                hideTitle
              />
            </div>
          </div>

          {/* Address */}
          <Field label="Address line 1" error={errors.address_line_1}>
            <input
              type="text"
              value={data.address_line_1}
              onChange={(e) => update({ address_line_1: e.target.value })}
              placeholder="123 High Street"
              style={inputStyle}
            />
          </Field>

          <Field label="Address line 2">
            <input
              type="text"
              value={data.address_line_2}
              onChange={(e) => update({ address_line_2: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required error={errors.address_city}>
              <input
                type="text"
                value={data.address_city}
                onChange={(e) => update({ address_city: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Region" required error={errors.address_region}>
              <input
                type="text"
                value={data.address_region}
                onChange={(e) => update({ address_region: e.target.value })}
                placeholder="Essex"
                style={inputStyle}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Postcode" error={errors.address_postcode}>
              <input
                type="text"
                value={data.address_postcode}
                onChange={(e) => update({ address_postcode: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Country" error={errors.address_country}>
              <input
                type="text"
                value={data.address_country}
                onChange={(e) => update({ address_country: e.target.value })}
                maxLength={2}
                placeholder="GB"
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Contact */}
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => update({ phone: e.target.value })}
              maxLength={20}
              placeholder="+44 1234 567890"
              style={inputStyle}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={data.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="hello@business.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Website" error={errors.website_url}>
            <input
              type="url"
              value={data.website_url}
              onChange={(e) => update({ website_url: e.target.value })}
              placeholder="https://www.example.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Booking URL" error={errors.booking_url}>
            <input
              type="url"
              value={data.booking_url}
              onChange={(e) => update({ booking_url: e.target.value })}
              placeholder="https://booking.example.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Menu URL" error={errors.menu_url}>
            <input
              type="url"
              value={data.menu_url}
              onChange={(e) => update({ menu_url: e.target.value })}
              placeholder="https://menu.example.com"
              style={inputStyle}
            />
          </Field>

          {/* Cuisine types */}
          <Field label="Cuisine types (comma-separated)" error={errors.cuisine_types}>
            <input
              type="text"
              value={data.cuisine_types}
              onChange={(e) => update({ cuisine_types: e.target.value })}
              placeholder="British, Italian, Asian"
              style={inputStyle}
            />
          </Field>

          {/* Delivery */}
          <label className="flex items-center gap-3" style={{ padding: '8px 0' }}>
            <input
              type="checkbox"
              checked={data.delivery_available}
              onChange={(e) => update({ delivery_available: e.target.checked })}
              className="rounded"
              style={{ width: 20, height: 20, accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)' }}>
              Delivery available
            </span>
          </label>

          {/* Opening Hours */}
          <div>
            <span style={labelStyle}>Opening Hours</span>
            <div className="flex flex-col gap-2 mt-1">
              {DAYS.map((day) => {
                const hours = data.opening_hours?.[day];
                const isClosed = !hours;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span style={{ width: 80, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                      {DAY_LABELS[day]}
                    </span>
                    <label className="flex items-center gap-1" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) => {
                          const updated = { ...data.opening_hours };
                          if (e.target.checked) {
                            delete updated[day];
                          } else {
                            updated[day] = { open: '09:00', close: '17:00' };
                          }
                          update({ opening_hours: Object.keys(updated).length > 0 ? updated : null });
                        }}
                      />
                      Closed
                    </label>
                    {!isClosed && (
                      <>
                        <input
                          type="time"
                          value={hours?.open ?? '09:00'}
                          aria-label={`${DAY_LABELS[day]} opening time`}
                          onChange={(e) => update({
                            opening_hours: { ...data.opening_hours, [day]: { ...hours!, open: e.target.value } }
                          })}
                          style={timeInputStyle}
                        />
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>–</span>
                        <input
                          type="time"
                          value={hours?.close ?? '17:00'}
                          aria-label={`${DAY_LABELS[day]} closing time`}
                          onChange={(e) => update({
                            opening_hours: { ...data.opening_hours, [day]: { ...hours!, close: e.target.value } }
                          })}
                          style={timeInputStyle}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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
          {saving
            ? (mode === 'create' ? 'Creating...' : 'Saving...')
            : (mode === 'create' ? 'Create Premise' : 'Save Changes')
          }
        </button>

        {/* Deactivate / Reactivate — edit mode only */}
        {mode === 'edit' && premise && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--bg-elevated)' }}>
            {premise.is_active ? (
              <>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--text-secondary)', marginBottom: 12,
                }}>
                  Deactivating this premise will hide it from the map and feed.
                  You can reactivate it later.
                </p>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--status-error)',
                    border: '1px solid var(--status-error)',
                    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
                    cursor: actionLoading ? 'wait' : 'pointer',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? 'Deactivating...' : 'Deactivate Premise'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={actionLoading}
                className="w-full py-3 rounded-2xl"
                style={{
                  backgroundColor: 'var(--status-success)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
                  cursor: actionLoading ? 'wait' : 'pointer',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? 'Reactivating...' : 'Reactivate Premise'}
              </button>
            )}
          </div>
        )}

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
            Premise updated
          </div>
        )}
      </div>
    </div>
  );
}
