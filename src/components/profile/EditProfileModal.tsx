'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { profileUpdateSchema } from '@/lib/validations/profile';
import { showToast } from '@/components/ui/Toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    location_city: string | null;
    location_country: string | null;
  };
}

export function EditProfileModal({
  isOpen,
  onClose,
  onSaved,
  profile,
}: EditProfileModalProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const backdropRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [locationCity, setLocationCity] = useState(profile.location_city ?? '');
  const [locationCountry, setLocationCountry] = useState(profile.location_country ?? '');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.display_name ?? '');
      setUsername(profile.username);
      setBio(profile.bio ?? '');
      setLocationCity(profile.location_city ?? '');
      setLocationCountry(profile.location_country ?? '');
      setFieldErrors({});
    }
  }, [isOpen, profile]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});

      const payload: Record<string, string> = {};
      if (displayName !== (profile.display_name ?? ''))
        payload.display_name = displayName || undefined!;
      if (username !== profile.username) payload.username = username;
      if (bio !== (profile.bio ?? '')) payload.bio = bio || undefined!;
      if (locationCity !== (profile.location_city ?? ''))
        payload.location_city = locationCity || undefined!;
      if (locationCountry !== (profile.location_country ?? ''))
        payload.location_country = locationCountry || undefined!;

      // Nothing changed
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      // Client-side validation
      const parsed = profileUpdateSchema.safeParse(payload);
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
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (res.status === 409) {
            setFieldErrors({ username: t('usernameTaken') });
          } else {
            showToast(data?.error ?? t('profileUpdateFailed'), 'error');
          }
          return;
        }

        showToast(t('profileUpdated'), 'success');
        onSaved();
        onClose();
      } catch {
        showToast(t('profileUpdateFailed'), 'error');
      } finally {
        setSaving(false);
      }
    },
    [displayName, username, bio, locationCity, locationCountry, profile, onClose, onSaved, t]
  );

  if (!isOpen) return null;

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

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-modal)',
          borderTopRightRadius: 'var(--radius-modal)',
          padding: '32px 24px 40px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
          }}
          aria-label={tCommon('close')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* Heading */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent-primary)',
            marginBottom: 24,
          }}
        >
          {t('editProfile')}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Display Name */}
          <div>
            <label htmlFor="edit-display-name" style={labelStyle}>
              {t('displayName')}
            </label>
            <input
              id="edit-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              style={inputStyle}
            />
            {fieldErrors.display_name && (
              <p style={errorStyle}>{fieldErrors.display_name}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="edit-username" style={labelStyle}>
              {t('username')}
            </label>
            <input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              style={inputStyle}
            />
            {fieldErrors.username && (
              <p style={errorStyle}>{fieldErrors.username}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="edit-bio" style={labelStyle}>
              {t('bio')}
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder={t('bioPlaceholder')}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '12px 16px',
                resize: 'none',
              }}
            />
            <p
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
                textAlign: 'right',
                marginTop: 2,
              }}
            >
              {bio.length}/160
            </p>
            {fieldErrors.bio && <p style={errorStyle}>{fieldErrors.bio}</p>}
          </div>

          {/* Location City */}
          <div>
            <label htmlFor="edit-city" style={labelStyle}>
              {t('locationCity')}
            </label>
            <input
              id="edit-city"
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              maxLength={100}
              style={inputStyle}
            />
            {fieldErrors.location_city && (
              <p style={errorStyle}>{fieldErrors.location_city}</p>
            )}
          </div>

          {/* Location Country */}
          <div>
            <label htmlFor="edit-country" style={labelStyle}>
              {t('locationCountry')}
            </label>
            <input
              id="edit-country"
              type="text"
              value={locationCountry}
              onChange={(e) => setLocationCountry(e.target.value)}
              maxLength={100}
              style={inputStyle}
            />
            {fieldErrors.location_country && (
              <p style={errorStyle}>{fieldErrors.location_country}</p>
            )}
          </div>

          {/* Save button */}
          <button
            type="submit"
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
            }}
          >
            {saving ? tCommon('saving') : t('saveProfile')}
          </button>
        </form>
      </div>
    </div>
  );
}
