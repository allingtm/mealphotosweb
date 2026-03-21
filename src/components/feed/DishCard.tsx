'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UtensilsCrossed, MapPin } from 'lucide-react';
import type { FeedItem } from '@/types/database';
import { ReactionButton } from './ReactionButton';
import { SaveButton } from './SaveButton';
import { ShareButton } from './ShareButton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { timeAgo } from '@/lib/utils/timeAgo';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { ImageCarousel } from './ImageCarousel';

interface DishCardProps {
  dish: FeedItem;
  index: number;
  onReact?: (dishId: string) => void;
  onSave?: (dishId: string, saved: boolean) => void;
}

export const DishCard = memo(function DishCard({ dish, index, onReact, onSave }: DishCardProps) {
  const distanceMiles = dish.distance_km != null
    ? (dish.distance_km * 0.621371).toFixed(1)
    : null;

  return (
    <article className="flex flex-col" style={{ width: '100%' }}>
      {/* Photo */}
      <Link href={`/dish/${dish.id}`} className="relative block w-full" style={{ aspectRatio: '4/5' }}>
        {dish.image_count > 1 ? (
          <ImageCarousel
            dishId={dish.id}
            dishTitle={dish.title}
            primaryImageUrl={dish.photo_url}
            imageCount={dish.image_count}
            blurHash={dish.photo_blur_hash}
            blurDataURL={dish.blurDataURL}
            priority={index < 2}
          />
        ) : (
          <Image
            src={dish.photo_url}
            alt={dish.title}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover rounded-2xl"
            loader={cloudflareLoader}
            placeholder={dish.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={dish.blurDataURL}
            priority={index < 2}
          />
        )}

        {/* Reaction count badge — bottom right */}
        {dish.reaction_count > 0 && (
          <div
            className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1"
            style={{
              backgroundColor: 'var(--status-success)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <UtensilsCrossed size={14} strokeWidth={2} />
            <span>{dish.reaction_count}</span>
          </div>
        )}
      </Link>

      {/* Content below photo */}
      <div className="flex flex-col gap-1 px-1 pt-3 pb-4">
        {/* Dish title */}
        <Link
          href={`/dish/${dish.id}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          {dish.title}
        </Link>

        {/* Business info row */}
        <div className="flex items-center gap-1.5">
          {dish.avatar_url && (
            <Image
              src={dish.avatar_url}
              alt={dish.business_name}
              width={20}
              height={20}
              className="rounded-full"
              loader={cloudflareLoader}
            />
          )}
          <Link
            href={`/business/${dish.username}`}
            className="flex items-center gap-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            {dish.business_name}
            {dish.plan === 'business' && <VerifiedBadge size={14} />}
          </Link>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>·</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            {timeAgo(dish.created_at)}
          </span>
        </div>

        {/* Distance / location */}
        <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
          <MapPin size={12} strokeWidth={1.5} />
          {distanceMiles
            ? <span>{distanceMiles} miles{dish.address_city ? ` · ${dish.address_city}` : ''}</span>
            : dish.address_city
              ? <span>{dish.address_city}</span>
              : null
          }
        </div>

        {/* Description */}
        {dish.description && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {dish.description}
          </p>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-2">
          <ReactionButton
            dishId={dish.id}
            businessId={dish.business_id}
            hasReacted={dish.user_has_reacted}
            count={dish.reaction_count}
            distanceKm={dish.distance_km}
            dishTitle={dish.title}
            onReacted={() => onReact?.(dish.id)}
          />
          <SaveButton
            dishId={dish.id}
            businessId={dish.business_id}
            hasSaved={dish.user_has_saved}
            title={dish.title}
            onToggled={(saved) => onSave?.(dish.id, saved)}
          />
          <ShareButton
            dishId={dish.id}
            title={dish.title}
            businessName={dish.business_name}
          />
        </div>
      </div>
    </article>
  );
});
