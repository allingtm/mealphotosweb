'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Camera, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { MenuButton } from '@/components/layout/MenuButton';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { FollowButton } from '@/components/profile/FollowButton';
import { FollowerFollowingList } from '@/components/profile/FollowerFollowingList';
import { ProfileMoreMenu } from '@/components/profile/ProfileMoreMenu';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { Globe, Phone, Menu, CalendarDays, GraduationCap, Tag, MapPin, UserCheck } from 'lucide-react';
import type { BusinessProfile } from '@/types/database';
import { BUSINESS_TYPE_LABELS, getBusinessTypeGroup, type BusinessType } from '@/types/database';

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    location_city: string | null;
    location_country: string | null;
    is_restaurant?: boolean;
    plan?: string;
    subscription_status?: string;
    show_location?: boolean;
    show_streak?: boolean;
    follower_count?: number;
    following_count?: number;
  };
  businessProfile?: BusinessProfile | null;
  isOwnProfile: boolean;
  isFollowing?: boolean;
}

export function ProfileHeader({ profile, businessProfile, isOwnProfile, isFollowing = false }: ProfileHeaderProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [followerListOpen, setFollowerListOpen] = useState(false);
  const [followingListOpen, setFollowingListOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initial = (profile.display_name || profile.username).charAt(0).toUpperCase();

  const isBusiness = profile.plan === 'business' && profile.subscription_status === 'active';
  const isVerified = isBusiness || (profile.is_restaurant && profile.subscription_status === 'active');
  const followerCount = profile.follower_count ?? 0;
  const followingCount = profile.following_count ?? 0;

  const bp = businessProfile;
  const bpGroup = bp ? getBusinessTypeGroup(bp.business_type as BusinessType) : null;

  // For businesses with address, show that; for users, show city only
  const locationParts = bp?.address_city
    ? [bp.address_city, bp.address_postcode].filter(Boolean)
    : profile.is_restaurant
      ? [profile.location_city, profile.location_country].filter(Boolean)
      : [profile.location_city].filter(Boolean);
  const location = locationParts.join(', ');

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Top action row */}
      {isOwnProfile ? (
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
      ) : (
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 16 }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              width: 40,
              height: 40,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={t('back')}
          >
            <ArrowLeft size={24} strokeWidth={1.5} color="var(--text-primary)" />
          </button>
          <ProfileMoreMenu userId={profile.id} username={profile.username} />
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

        {/* Display name + verified badge */}
        <div className="flex items-center gap-1">
          {profile.display_name && (
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {profile.display_name}
            </h1>
          )}
          {isVerified && <VerifiedBadge />}
        </div>

        {/* Username */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: '-4px 0 0',
          }}
        >
          @{profile.username}
        </p>

        {/* Business type label */}
        {bp && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '-4px 0 0',
            }}
          >
            {BUSINESS_TYPE_LABELS[bp.business_type as BusinessType]}
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
            📍 {location}
          </p>
        )}

        {/* Health & Nutrition: accepting clients */}
        {bp && bpGroup === 'health_nutrition' && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: bp.accepts_clients ? 'var(--status-success)' : 'var(--text-secondary)',
              margin: '-4px 0 0',
            }}
          >
            {bp.accepts_clients ? '✅ Accepting new clients' : 'Fully booked'}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-primary)',
              margin: 0,
              textAlign: 'center',
              maxWidth: 320,
              lineHeight: 1.4,
            }}
          >
            {profile.bio}
          </p>
        )}

        {/* Business details: Health & Nutrition */}
        {bp && bpGroup === 'health_nutrition' && (
          <div className="flex flex-col items-center gap-2" style={{ marginTop: 4 }}>
            {bp.qualifications && bp.qualifications.length > 0 && (
              <div className="flex items-start gap-2">
                <GraduationCap size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {bp.qualifications.join(', ')}
                </span>
              </div>
            )}
            {bp.specialisms && bp.specialisms.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1">
                <Tag size={14} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                {bp.specialisms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full"
                    style={{
                      padding: '2px 10px',
                      fontSize: 12,
                      fontFamily: 'var(--font-body)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {bp.consultation_type && bp.consultation_type.length > 0 && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                💻 {bp.consultation_type.map(t => t === 'in_person' ? 'In-person' : t === 'online' ? 'Online' : 'Both').join(' & ')}
              </p>
            )}
            {bp.service_area && (
              <div className="flex items-center gap-1">
                <MapPin size={14} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {bp.service_area}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Business action buttons */}
        {bp && (
          <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
            {bp.website_url && (
              <a
                href={bp.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  textDecoration: 'none',
                }}
              >
                <Globe size={14} strokeWidth={1.5} />
                Website
              </a>
            )}
            {bp.phone && (
              <a
                href={`tel:${bp.phone}`}
                className="flex items-center gap-1 rounded-full"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  textDecoration: 'none',
                }}
              >
                <Phone size={14} strokeWidth={1.5} />
                Call
              </a>
            )}
            {bpGroup === 'food_drink' && bp.menu_url && (
              <a
                href={bp.menu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--bg-elevated)',
                  textDecoration: 'none',
                }}
              >
                <Menu size={14} strokeWidth={1.5} />
                Menu
              </a>
            )}
            {bp.booking_url && (
              <a
                href={bp.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full"
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  backgroundColor: bpGroup === 'health_nutrition' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: bpGroup === 'health_nutrition' ? '#121212' : 'var(--text-primary)',
                  border: bpGroup === 'health_nutrition' ? 'none' : '1px solid var(--bg-elevated)',
                  textDecoration: 'none',
                }}
              >
                <CalendarDays size={14} strokeWidth={1.5} />
                Book
              </a>
            )}
          </div>
        )}

        {/* Follower / Following counts */}
        <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
          {isOwnProfile ? (
            <>
              <button
                type="button"
                onClick={() => setFollowerListOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              >
                <strong>{followerCount}</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{t('followers')}</span>
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}> · </span>
              <button
                type="button"
                onClick={() => setFollowingListOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              >
                <strong>{followingCount}</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{t('following')}</span>
              </button>
            </>
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>{followerCount}</strong> {t('followers')}
              {!profile.is_restaurant && (
                <>
                  {' · '}
                  <strong style={{ color: 'var(--text-primary)' }}>{followingCount}</strong> {t('following')}
                </>
              )}
            </p>
          )}
        </div>

        {/* Action button */}
        {isOwnProfile ? (
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
        ) : (
          <div style={{ marginTop: 4 }}>
            <FollowButton
              userId={profile.id}
              username={profile.username}
              initialIsFollowing={isFollowing}
            />
          </div>
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

      {/* Follower / Following lists */}
      {isOwnProfile && (
        <>
          <FollowerFollowingList
            type="followers"
            count={followerCount}
            isOpen={followerListOpen}
            onClose={() => setFollowerListOpen(false)}
          />
          <FollowerFollowingList
            type="following"
            count={followingCount}
            isOpen={followingListOpen}
            onClose={() => setFollowingListOpen(false)}
          />
        </>
      )}
    </div>
  );
}
