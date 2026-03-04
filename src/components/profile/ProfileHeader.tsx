'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, Trophy } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

interface ProfileHeaderProps {
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    location_city: string | null;
    location_country: string | null;
  };
  isOwnProfile: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const locationParts = [profile.location_city, profile.location_country].filter(Boolean);
  const location = locationParts.join(', ');
  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Top action row — only on own profile */}
      {isOwnProfile && (
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 16 }}
        >
          <Link
            href="/settings"
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
            }}
            aria-label="Settings"
          >
            <Settings size={24} strokeWidth={1.5} color="var(--text-primary)" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard"
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-full)',
              }}
              aria-label="Leaderboard"
            >
              <Trophy size={24} strokeWidth={1.5} color="var(--text-primary)" />
            </Link>
            <NotificationBell onClick={() => setIsPanelOpen(true)} />
          </div>
        </div>
      )}

      {/* Avatar + Info */}
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        {/* Avatar */}
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
            Edit Profile
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
    </div>
  );
}
