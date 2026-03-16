'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Globe, Phone, FileText, CalendarDays, Navigation } from 'lucide-react';
import posthog from 'posthog-js';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { BackButton } from '@/components/ui/BackButton';
import { ShareButton } from '@/components/feed/ShareButton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { BUSINESS_TYPE_LABELS, type BusinessProfile } from '@/types/database';
import { useAppStore } from '@/lib/store';

interface BusinessProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    plan: string;
    follower_count: number;
  };
  businessProfile: BusinessProfile;
  isFollowing: boolean;
  totalSaves: number;
}

export function BusinessProfileHeader({ profile, businessProfile: bp, isFollowing: initialFollowing, totalSaves }: BusinessProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const isPremium = profile.plan === 'premium';
  const typeLabel = BUSINESS_TYPE_LABELS[bp.business_type] ?? bp.business_type;

  const handleFollow = async () => {
    if (!user) { openAuthModal(); return; }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => wasFollowing ? c - 1 : c + 1);

    try {
      if (wasFollowing) {
        await fetch(`/api/follows/${profile.id}`, { method: 'DELETE' });
        posthog.capture('business_unfollowed', { business_id: profile.id });
      } else {
        await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: profile.id }),
        });
        posthog.capture('business_followed', { business_id: profile.id, business_type: bp.business_type });
      }
    } catch {
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => wasFollowing ? c + 1 : c - 1);
    }
  };

  const actionButtons = [
    bp.website_url && { icon: Globe, label: 'Website', action: () => window.open(bp.website_url!, '_blank') },
    bp.phone && { icon: Phone, label: 'Call', action: () => window.open(`tel:${bp.phone}`) },
    bp.menu_url && { icon: FileText, label: 'Menu', action: () => window.open(bp.menu_url!, '_blank') },
    bp.booking_url && { icon: CalendarDays, label: 'Book', action: () => window.open(bp.booking_url!, '_blank') },
    bp.address_line_1 && { icon: Navigation, label: 'Directions', action: () => {
      const addr = `${bp.address_line_1}, ${bp.address_city ?? ''} ${bp.address_postcode ?? ''}`.trim();
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
    }},
  ].filter(Boolean) as { icon: React.ComponentType<{ size: number; strokeWidth: number }>; label: string; action: () => void }[];

  return (
    <div className="flex flex-col items-center px-4 pt-3 pb-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between w-full mb-4">
        <BackButton />
        <ShareButton dishId={profile.id} title={bp.business_name} businessName={bp.business_name} />
      </div>

      {/* Avatar */}
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={`${bp.business_name} logo`}
          width={80}
          height={80}
          className="rounded-full object-cover mb-3"
          loader={cloudflareLoader}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center mb-3"
          style={{ width: 80, height: 80, backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--accent-primary)' }}
        >
          {bp.business_name[0]?.toUpperCase()}
        </div>
      )}

      {/* Name + badge */}
      <div className="flex items-center gap-1.5">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>
          {bp.business_name}
        </h1>
        {isPremium && <VerifiedBadge size={16} />}
      </div>

      {/* Type + cuisine */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
        {typeLabel}
        {bp.cuisine_types?.length > 0 && ` · ${bp.cuisine_types.join(', ')}`}
      </p>

      {/* Location */}
      {bp.address_city && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          📍 {bp.address_line_1 ? `${bp.address_line_1}, ` : ''}{bp.address_city}
        </p>
      )}

      {/* Total saves */}
      {totalSaves > 0 && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          🍽 {totalSaves} people want to eat here
        </p>
      )}

      {/* Bio */}
      {bp.bio && (
        <p className="text-center mt-2" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360 }}>
          {bp.bio}
        </p>
      )}

      {/* Action buttons */}
      {actionButtons.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {actionButtons.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex items-center gap-1.5 rounded-full px-3"
              style={{
                height: 36,
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 500,
              }}
              aria-label={`${label} for ${bp.business_name}`}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Followers + Follow button */}
      <div className="flex items-center gap-4 mt-4">
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
          {followerCount} follower{followerCount !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={handleFollow}
          className="rounded-full px-5 py-1.5 font-medium transition-colors"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: isFollowing ? 'var(--accent-primary)' : 'transparent',
            color: isFollowing ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: isFollowing ? 'none' : '1px solid var(--bg-elevated)',
          }}
          aria-label={isFollowing ? `Unfollow ${bp.business_name}` : `Follow ${bp.business_name}`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );
}
