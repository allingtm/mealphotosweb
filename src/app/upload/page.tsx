'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAppStore } from '@/lib/store';
import { mealUploadSchema, CUISINE_OPTIONS, CUISINE_LABELS } from '@/lib/validations';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { promptForPush } from '@/components/providers/OneSignalProvider';
import posthog from 'posthog-js';

type UploadStep = 'pick' | 'crop' | 'form';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

/** Quantise coordinates to 2 decimal places (~1.1km) for privacy */
function quantise(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compress image to max width 2000px, 85% JPEG quality */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 2000;
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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

export default function UploadPage() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const user = useAppStore((s) => s.user);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>('pick');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState<typeof CUISINE_OPTIONS[number] | ''>('');
  const [tags, setTags] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionShown, setLocationPermissionShown] = useState(false);

  // Errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Auth gate on mount
  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  // Open file picker immediately
  useEffect(() => {
    if (user && step === 'pick') {
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => fileInputRef.current?.click(), 100);
      return () => clearTimeout(t);
    }
  }, [user, step]);

  // Request location on form step
  useEffect(() => {
    if (step === 'form' && !location && !locationLoading) {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    if (!locationPermissionShown) {
      setLocationPermissionShown(true);
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = quantise(pos.coords.latitude);
        const lng = quantise(pos.coords.longitude);
        const geo = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, ...geo });
        setLocationLabel(
          [geo.city, geo.country].filter(Boolean).join(', ') || `${lat}, ${lng}`
        );
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [locationPermissionShown]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('crop');
  };

  const handleConfirmCrop = () => {
    setStep('form');
  };

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    router.back();
  };

  const parseTags = (raw: string): string[] => {
    return raw
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user) return;

    setFieldErrors({});
    setUploadError('');

    // Client-side Zod validation
    const formData = {
      title: title.trim(),
      cuisine: cuisine || null,
      location: location || null,
      tags: parseTags(tags),
    };

    const parsed = mealUploadSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || 'form';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setUploading(true);

    try {
      // Get Turnstile token (if configured)
      let turnstileToken = '';
      if (typeof window !== 'undefined' && window.turnstile) {
        try {
          turnstileToken = await new Promise<string>((resolve, reject) => {
            window.turnstile!.render('#turnstile-container', {
              sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
              callback: resolve,
              'error-callback': reject,
              size: 'invisible',
            });
          });
        } catch {
          // Turnstile not configured — proceed without (dev mode)
          turnstileToken = 'dev-bypass';
        }
      } else {
        turnstileToken = 'dev-bypass';
      }

      // Compress image
      const compressedBlob = await compressImage(selectedFile);

      // Build upload form data
      const uploadForm = new FormData();
      uploadForm.append('file', compressedBlob, 'meal.jpg');
      uploadForm.append('title', parsed.data.title);
      if (parsed.data.cuisine) uploadForm.append('cuisine', parsed.data.cuisine);
      if (parsed.data.location) {
        uploadForm.append('location', JSON.stringify(parsed.data.location));
      }
      if (parsed.data.tags.length > 0) {
        uploadForm.append('tags', JSON.stringify(parsed.data.tags));
      }
      uploadForm.append('turnstile_token', turnstileToken);

      // Upload to server
      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        body: uploadForm,
      });

      const result = await res.json();

      if (!res.ok) {
        setUploadError(result.error || 'Upload failed. Please try again.');
        setUploading(false);
        return;
      }

      // Track analytics
      posthog.capture(ANALYTICS_EVENTS.MEAL_UPLOADED, {
        cuisine: parsed.data.cuisine,
        has_location: !!parsed.data.location,
        tags_count: parsed.data.tags.length,
      });

      // Prompt for push notifications on first upload
      promptForPush();

      // Navigate to feed with success toast
      router.push('/feed?toast=Meal+uploaded!+Let%27s+see+what+people+think.');
    } catch (err) {
      setUploadError('Something went wrong. Please try again.');
      setUploading(false);
    }
  };

  // Pick step — hidden file input
  if (step === 'pick') {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ minHeight: 'calc(100dvh - 56px)' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select meal photo"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-2xl font-semibold"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#121212',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Select Photo
        </button>
        <button
          onClick={handleCancel}
          className="mt-4"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Crop step
  if (step === 'crop') {
    return (
      <div
        className="flex flex-col"
        style={{ minHeight: 'calc(100dvh - 56px)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4"
          style={{ height: 56 }}
        >
          <button type="button" onClick={handleCancel} aria-label="Cancel">
            <X size={24} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Crop Photo
          </span>
          <div style={{ width: 24 }} />
        </div>

        {/* 4:5 crop preview */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
              aspectRatio: '4/5',
              maxWidth: 400,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-4 pb-6 pt-4">
          <button
            onClick={handleConfirmCrop}
            className="w-full py-3 rounded-2xl font-semibold"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#121212',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: 'calc(100dvh - 56px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <button onClick={handleCancel}>
          <X size={24} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
        </button>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Add Details
        </span>
        <button
          onClick={handleSubmit}
          disabled={uploading || !title.trim()}
          className="flex items-center gap-1"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: uploading || !title.trim()
              ? 'var(--text-secondary)'
              : 'var(--accent-primary)',
          }}
        >
          {uploading && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
          Upload
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Photo preview (small) */}
        <div className="flex justify-center" style={{ marginBottom: 24 }}>
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              width: 160,
              aspectRatio: '4/5',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Meal title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunday Roast Chicken"
            maxLength={120}
            className="w-full px-4 py-3 rounded-2xl outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              border: fieldErrors.title
                ? '1px solid var(--status-error)'
                : '1px solid transparent',
            }}
          />
          {fieldErrors.title && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--status-error)',
                marginTop: 4,
              }}
            >
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Cuisine */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Cuisine (optional)
          </label>
          <div className="relative">
            <select
              value={cuisine}
              onChange={(e) =>
                setCuisine(e.target.value as typeof CUISINE_OPTIONS[number] | '')
              }
              aria-label="Cuisine"
              className="w-full px-4 py-3 rounded-2xl outline-none appearance-none"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: cuisine ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                border: '1px solid transparent',
              }}
            >
              <option value="">Select cuisine</option>
              {CUISINE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CUISINE_LABELS[c]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={20}
              strokeWidth={1.5}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Location (optional)
          </label>
          <div
            className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid transparent',
            }}
          >
            <MapPin
              size={18}
              strokeWidth={1.5}
              style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
            />
            {locationLoading ? (
              <Loader2
                size={16}
                strokeWidth={1.5}
                className="animate-spin"
                style={{ color: 'var(--text-secondary)' }}
              />
            ) : location ? (
              <div className="flex-1 flex items-center justify-between">
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    color: 'var(--text-primary)',
                  }}
                >
                  {locationLabel}
                </span>
                <button
                  onClick={() => {
                    setLocation(null);
                    setLocationLabel('');
                  }}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={requestLocation}
                className="flex-1 text-left"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-secondary)',
                }}
              >
                Add location
              </button>
            )}
          </div>
          {!locationPermissionShown && step === 'form' && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                marginTop: 4,
              }}
            >
              We&apos;ll use your approximate area to show your meal on the map.
              Your exact location is never stored.
            </p>
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Tags (optional)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="#homemade, #roast, #sunday"
            className="w-full px-4 py-3 rounded-2xl outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              border: fieldErrors.tags
                ? '1px solid var(--status-error)'
                : '1px solid transparent',
            }}
          />
          {fieldErrors.tags && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--status-error)',
                marginTop: 4,
              }}
            >
              {fieldErrors.tags}
            </p>
          )}
        </div>

        {/* Upload error */}
        {uploadError && (
          <div
            className="px-4 py-3 rounded-2xl"
            style={{
              backgroundColor: 'rgba(212, 85, 58, 0.1)',
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--status-error)',
              }}
            >
              {uploadError}
            </p>
          </div>
        )}

        {/* Upload button (mobile — duplicated from header for reachability) */}
        <button
          onClick={handleSubmit}
          disabled={uploading || !title.trim()}
          className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{
            backgroundColor:
              uploading || !title.trim()
                ? 'var(--bg-elevated)'
                : 'var(--accent-primary)',
            color: uploading || !title.trim() ? 'var(--text-secondary)' : '#121212',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {uploading && <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Invisible Turnstile container */}
      <div id="turnstile-container" />
    </div>
  );
}

// Extend Window for Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback': (error: unknown) => void;
          size: string;
        }
      ) => void;
    };
  }
}
