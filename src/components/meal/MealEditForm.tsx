'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, X, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { mealUpdateSchema, CUISINE_OPTIONS, CUISINE_LABELS } from '@/lib/validations/meal';
import VenueSearch from '@/components/upload/VenueSearch';
import type { VenueData } from '@/components/upload/VenueSearch';
import { showToast } from '@/components/ui/Toast';
import { DeleteMealDialog } from './DeleteMealDialog';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

interface MealEditFormProps {
  mealId: string;
  initialTitle: string;
  initialCuisine: string | null;
  initialTags: string[];
  initialVenue: VenueData | null;
  initialLocation: LocationData | null;
  initialLocationCity: string | null;
  initialLocationCountry: string | null;
}

/** Reverse-geocode coordinates to city/country */
async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string }> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return {};
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,country&access_token=${token}`
    );
    const data = await res.json();
    const features = data.features || [];
    const place = features.find((f: { place_type: string[] }) => f.place_type.includes('place'));
    const country = features.find((f: { place_type: string[] }) => f.place_type.includes('country'));
    return {
      city: place?.text,
      country: country?.text,
    };
  } catch {
    return {};
  }
}

export function MealEditForm({
  mealId,
  initialTitle,
  initialCuisine,
  initialTags,
  initialVenue,
  initialLocation,
  initialLocationCity,
  initialLocationCountry,
}: MealEditFormProps) {
  const t = useTranslations('mealEdit');
  const tCommon = useTranslations('common');
  const tUpload = useTranslations('upload');
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [cuisine, setCuisine] = useState<string | null>(initialCuisine);
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [venue, setVenue] = useState<VenueData | null>(initialVenue);
  const [location, setLocation] = useState<LocationData | null>(
    initialLocation
      ? { ...initialLocation, city: initialLocationCity ?? undefined, country: initialLocationCountry ?? undefined }
      : null
  );
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const parseTags = (input: string): string[] => {
    return input
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);
  };

  const handleUpdateLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        const geo = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, city: geo.city, country: geo.country });
        setLocating(false);
        showToast(t('locationUpdated'), 'success');
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [t]);

  const handleSave = useCallback(async () => {
    setFieldErrors({});

    const tags = parseTags(tagsInput);

    const payload: Record<string, unknown> = {};
    if (title !== initialTitle) payload.title = title;
    if (cuisine !== initialCuisine) payload.cuisine = cuisine;
    if (JSON.stringify(tags) !== JSON.stringify(initialTags)) payload.tags = tags;

    // Venue comparison
    const venueChanged = JSON.stringify(venue) !== JSON.stringify(initialVenue);
    if (venueChanged) payload.venue = venue;

    // Location comparison
    const locationChanged = JSON.stringify(location) !== JSON.stringify(
      initialLocation
        ? { ...initialLocation, city: initialLocationCity ?? undefined, country: initialLocationCountry ?? undefined }
        : null
    );
    if (locationChanged) {
      payload.location = location;
    }

    if (Object.keys(payload).length === 0) {
      showToast(t('updated'), 'success');
      return;
    }

    // Client-side validation
    const parsed = mealUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const mapped: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(flat)) {
        if (msgs && msgs.length > 0) mapped[key] = msgs[0];
      }
      setFieldErrors(mapped);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? t('updateFailed'), 'error');
        return;
      }

      showToast(t('updated'), 'success');
      router.refresh();
    } catch {
      showToast(t('updateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [
    title, cuisine, tagsInput, venue, location,
    initialTitle, initialCuisine, initialTags, initialVenue, initialLocation,
    initialLocationCity, initialLocationCountry,
    mealId, router, t,
  ]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--bg-elevated)',
    borderRadius: 12,
    padding: '0 16px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    color: 'var(--text-secondary)',
    marginBottom: 4,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    color: 'var(--status-error)',
    marginTop: 4,
  };

  const locationDisplay = location
    ? [location.city, location.country].filter(Boolean).join(', ') || `${location.lat}, ${location.lng}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label htmlFor="edit-title" style={labelStyle}>
          {tUpload('mealTitle')}
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          style={inputStyle}
        />
        {fieldErrors.title && <p style={errorStyle}>{fieldErrors.title}</p>}
      </div>

      {/* Cuisine */}
      <div>
        <label htmlFor="edit-cuisine" style={labelStyle}>
          {tUpload('cuisineOptional')}
        </label>
        <div style={{ position: 'relative' }}>
          <select
            id="edit-cuisine"
            value={cuisine ?? ''}
            onChange={(e) => setCuisine(e.target.value || null)}
            style={{
              ...inputStyle,
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">{tUpload('selectCuisine')}</option>
            {CUISINE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CUISINE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="edit-tags" style={labelStyle}>
          {tUpload('tagsOptional')}
        </label>
        <input
          id="edit-tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={tUpload('tagsPlaceholder')}
          style={inputStyle}
        />
        {fieldErrors.tags && <p style={errorStyle}>{fieldErrors.tags}</p>}
      </div>

      {/* Venue */}
      <div>
        <label style={labelStyle}>{tUpload('venueOptional')}</label>
        <VenueSearch
          value={venue}
          onChange={setVenue}
          proximity={location ? { lat: location.lat, lng: location.lng } : undefined}
        />
        {venue && (
          <button
            type="button"
            onClick={() => setVenue(null)}
            className="flex items-center gap-1 mt-1"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--status-error)',
            }}
          >
            <X size={14} strokeWidth={1.5} />
            {t('removeVenue')}
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <label style={labelStyle}>{tUpload('locationOptional')}</label>
        {locationDisplay ? (
          <div className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-primary)',
              }}
            >
              {locationDisplay}
            </span>
            <button
              type="button"
              onClick={() => setLocation(null)}
              className="flex items-center gap-1 ml-auto"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--status-error)',
              }}
            >
              <X size={14} strokeWidth={1.5} />
              {t('removeLocation')}
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleUpdateLocation}
          disabled={locating}
          className="flex items-center gap-2 mt-2"
          style={{
            background: 'none',
            border: '1px solid var(--bg-elevated)',
            borderRadius: 12,
            padding: '8px 16px',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-primary)',
          }}
        >
          {locating ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <MapPin size={16} strokeWidth={1.5} />
          )}
          {t('updateLocation')}
        </button>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
        style={{
          height: 48,
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 600,
          marginTop: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {saving ? t('saving') : t('save')}
      </button>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => setShowDeleteDialog(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl transition-opacity"
        style={{
          height: 48,
          backgroundColor: 'transparent',
          border: '1px solid var(--bg-elevated)',
          color: 'var(--status-error)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Trash2 size={18} strokeWidth={1.5} />
        Delete meal
      </button>

      <DeleteMealDialog
        mealId={mealId}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        redirectTo="/my-meals"
      />
    </div>
  );
}
