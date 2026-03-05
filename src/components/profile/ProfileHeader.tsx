'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { MenuButton } from '@/components/layout/MenuButton';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';

interface ProfileHeaderProps {
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    location_city: string | null;
    location_country: string | null;
  };
  isOwnProfile: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationParts = [profile.location_city, profile.location_country].filter(Boolean);
  const location = locationParts.join(', ');
  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Top action row — only on own profile */}
      {isOwnProfile && (
        <div
          className="flex items-center justify-end"
          style={{ marginBottom: 16 }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard"
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-full)',
              }}
              aria-label={t('leaderboard')}
            >
              <Trophy size={24} strokeWidth={1.5} color="var(--text-primary)" />
            </Link>
            <NotificationBell onClick={() => setIsPanelOpen(true)} />
            <MenuButton />
          </div>
        </div>
      )}

      {/* Avatar + Info */}
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        {/* Avatar */}
        <div className="relative">
          {isOwnProfile && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label={t('changeAvatar')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAvatarFile(file);
                  setIsAvatarCropOpen(true);
                }
                e.target.value = '';
              }}
            />
          )}
          <button
            type="button"
            onClick={() => isOwnProfile && fileInputRef.current?.click()}
            disabled={!isOwnProfile}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: isOwnProfile ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={80}
                height={80}
                className="rounded-full"
                style={{
                  border: '2px solid var(--accent-primary)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 80,
                  height: 80,
                  border: '2px solid var(--accent-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  color: 'var(--accent-primary)',
                }}
              >
                {initial}
              </div>
            )}
            {isOwnProfile && (
              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  backgroundColor: 'var(--accent-primary)',
                  border: '2px solid var(--bg-primary)',
                }}
              >
                <Camera size={14} strokeWidth={2} color="var(--bg-primary)" />
              </div>
            )}
          </button>
        </div>

        {/* Username */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          @{profile.username}
        </h1>

        {/* Display name */}
        {profile.display_name && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--text-primary)',
              margin: '-4px 0 0',
            }}
          >
            {profile.display_name}
          </p>
        )}

        {/* Location */}
        {location && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '-4px 0 0',
            }}
          >
            {location}
          </p>
        )}

        {/* Edit Profile button — own profile only */}
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--bg-primary)',
              backgroundColor: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              padding: '8px 24px',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            {t('editProfile')}
          </button>
        )}
      </div>

      {/* Notification panel */}
      {isOwnProfile && (
        <NotificationPanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      )}

      {/* Edit profile modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => router.refresh()}
          profile={profile}
        />
      )}

      {/* Avatar crop modal */}
      {isOwnProfile && (
        <AvatarCropModal
          isOpen={isAvatarCropOpen}
          onClose={() => {
            setIsAvatarCropOpen(false);
            setAvatarFile(null);
          }}
          onSaved={() => router.refresh()}
          file={avatarFile}
        />
      )}
    </div>
  );
}
