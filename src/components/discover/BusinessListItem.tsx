'use client';

import { useRouter } from 'next/navigation';
import { Star, MapPin, UserCheck } from 'lucide-react';
import type { BusinessSearchResult } from '@/types/database';
import { BUSINESS_TYPE_LABELS, FOOD_DRINK_TYPES } from '@/types/database';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

function scoreColorClass(score: number): string {
  if (score < 4) return 'score-low';
  if (score < 6) return 'score-mid';
  if (score < 8) return 'score-good';
  return 'score-high';
}

interface BusinessListItemProps {
  business: BusinessSearchResult;
}

export function BusinessListItem({ business }: BusinessListItemProps) {
  const router = useRouter();
  const isFoodDrink = FOOD_DRINK_TYPES.includes(
    business.business_type as (typeof FOOD_DRINK_TYPES)[number]
  );

  return (
    <button
      onClick={() => router.push(`/profile/${business.username}`)}
      className="w-full flex items-center gap-3 p-3 text-left"
      style={{
        borderBottom: '1px solid var(--bg-elevated)',
      }}
    >
      {/* Avatar */}
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width: 48,
          height: 48,
          backgroundColor: isFoodDrink
            ? 'rgba(232, 168, 56, 0.15)'
            : 'rgba(45, 212, 191, 0.15)',
        }}
      >
        {business.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={business.avatar_url}
            alt={business.business_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin
            size={20}
            strokeWidth={1.5}
            style={{ color: isFoodDrink ? 'var(--accent-primary)' : '#2DD4BF' }}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="truncate"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {business.business_name}
          </p>
          <VerifiedBadge size={14} />
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginTop: 1,
          }}
        >
          {BUSINESS_TYPE_LABELS[business.business_type]}
          {business.address_city && ` · ${business.address_city}`}
          {business.distance_km != null && ` · ${business.distance_km.toFixed(1)} km`}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          {business.avg_rating != null && business.avg_rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star
                size={12}
                strokeWidth={1.5}
                fill="currentColor"
                className={scoreColorClass(business.avg_rating)}
              />
              <span
                className={scoreColorClass(business.avg_rating)}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {business.avg_rating.toFixed(1)}
              </span>
            </div>
          )}
          {business.accepts_clients && (
            <div className="flex items-center gap-0.5">
              <UserCheck
                size={11}
                strokeWidth={1.5}
                style={{ color: 'var(--status-success)' }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--status-success)',
                }}
              >
                Accepting clients
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Type badge */}
      <div
        className="flex-shrink-0 px-2 py-1 rounded-full"
        style={{
          backgroundColor: isFoodDrink
            ? 'rgba(232, 168, 56, 0.15)'
            : 'rgba(45, 212, 191, 0.15)',
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: isFoodDrink ? 'var(--accent-primary)' : '#2DD4BF',
        }}
      >
        {isFoodDrink ? 'Food' : 'Health'}
      </div>
    </button>
  );
}
