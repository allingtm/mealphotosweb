'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UtensilsCrossed, MapPin } from 'lucide-react';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { BackButton } from '@/components/ui/BackButton';
import { ReactionButton } from '@/components/feed/ReactionButton';
import { SaveButton } from '@/components/feed/SaveButton';
import { ShareButton } from '@/components/feed/ShareButton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { timeAgo } from '@/lib/utils/timeAgo';
import { formatPrice } from '@/lib/utils';
import type { DishImage } from '@/types/database';

interface DishDetailClientProps {
  dish: {
    id: string;
    business_id: string;
    title: string;
    description: string | null;
    price_pence: number | null;
    photo_url: string;
    photo_blur_hash: string | null;
    image_count: number;
    reaction_count: number;
    save_count: number;
    comment_count: number;
    comments_enabled: boolean;
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      plan: string;
    };
    business_profiles: {
      business_name: string;
      business_type: string;
      address_city: string | null;
      address_line_1: string | null;
    };
  };
  images: DishImage[];
  userHasReacted: boolean;
  userHasSaved: boolean;
}

export function DishDetailClient({ dish, images, userHasReacted, userHasSaved }: DishDetailClientProps) {
  const bp = dish.business_profiles;
  const profile = dish.profiles;
  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full pb-24 max-w-xl md:max-w-none">
        {/* Header bar — Back + Share */}
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton />
          <ShareButton dishId={dish.id} title={dish.title} businessName={bp.business_name} />
        </div>

        {/* Photo */}
        <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
          <Image
            src={dish.photo_url}
            alt={dish.title}
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className="object-cover"
            loader={cloudflareLoader}
            priority
          />

          {/* Reaction count badge */}
          {dish.reaction_count > 0 && (
            <div
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                backgroundColor: 'var(--status-success)',
                color: '#FFFFFF',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <UtensilsCrossed size={16} strokeWidth={2} />
              <span>{dish.reaction_count} want this</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {dish.title}
          </h1>

          {/* Price */}
          {dish.price_pence != null && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                color: 'var(--accent-primary)',
                margin: 0,
              }}
            >
              {formatPrice(dish.price_pence)}
            </p>
          )}

          {/* Business info — tappable */}
          <Link
            href={`/business/${profile.username}`}
            className="flex items-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            {profile.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt={bp.business_name}
                width={32}
                height={32}
                className="rounded-full"
                loader={cloudflareLoader}
              />
            )}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
              {bp.business_name}
            </span>
          </Link>

          {/* Location */}
          {(bp.address_line_1 || bp.address_city) && (
            <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <MapPin size={12} strokeWidth={1.5} />
              <span>{bp.address_line_1 ? `${bp.address_line_1}, ${bp.address_city ?? ''}` : bp.address_city}</span>
            </div>
          )}

          {/* Timestamp */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            Posted {timeAgo(dish.created_at)}
          </p>

          {/* Description */}
          {dish.description && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {dish.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <ReactionButton
              dishId={dish.id}
              businessId={dish.business_id}
              hasReacted={userHasReacted}
              count={dish.reaction_count}
              distanceKm={null}
            />
            <SaveButton
              dishId={dish.id}
              businessId={dish.business_id}
              hasSaved={userHasSaved}
              title={dish.title}
            />
          </div>

          {/* Separator */}
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginTop: 8, marginBottom: 8 }} />

          {/* Comments */}
          <CommentsSection
            dishId={dish.id}
            businessId={dish.business_id}
            commentsEnabled={dish.comments_enabled}
            commentCount={dish.comment_count}
          />
        </div>
      </div>
    </div>
  );
}
