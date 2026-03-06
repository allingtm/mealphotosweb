'use client';

import { useRouter } from 'next/navigation';
import { Star, UtensilsCrossed, UserCheck, MapPin as MapPinIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MapPin, MapBusinessPin } from '@/types/database';
import { BUSINESS_TYPE_LABELS, FOOD_DRINK_TYPES, type BusinessType } from '@/types/database';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

function scoreColorClass(score: number): string {
  if (score < 4) return 'score-low';
  if (score < 6) return 'score-mid';
  if (score < 8) return 'score-good';
  return 'score-high';
}

interface PinBottomSheetProps {
  pin: MapPin | null;
  businessPin?: MapBusinessPin | null;
  onClose: () => void;
}

export function PinBottomSheet({ pin, businessPin, onClose }: PinBottomSheetProps) {
  const t = useTranslations('map');
  const tRecipe = useTranslations('recipe');
  const router = useRouter();

  const activePin = pin || businessPin;
  if (!activePin) return null;

  const isBusiness = !pin && !!businessPin;

  const handleCardClick = () => {
    if (isBusiness && businessPin) {
      router.push(`/profile/${businessPin.username}`);
    } else if (pin) {
      router.push(`/meal/${pin.id}`);
    }
  };

  const isFoodDrink = isBusiness && businessPin
    ? FOOD_DRINK_TYPES.includes(businessPin.business_type as (typeof FOOD_DRINK_TYPES)[number])
    : false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 animate-slide-up"
      >
        <button
          onClick={handleCardClick}
          className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
          }}
        >
          {/* Thumbnail or avatar */}
          {isBusiness && businessPin ? (
            <div
              className="rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{
                width: 80,
                height: 80,
                backgroundColor: isFoodDrink
                  ? 'rgba(232, 168, 56, 0.15)'
                  : 'rgba(45, 212, 191, 0.15)',
              }}
            >
              {businessPin.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={businessPin.avatar_url}
                  alt={businessPin.business_name}
                  className="rounded-xl object-cover w-full h-full"
                />
              ) : (
                <MapPinIcon
                  size={32}
                  strokeWidth={1.5}
                  style={{
                    color: isFoodDrink ? 'var(--accent-primary)' : '#2DD4BF',
                  }}
                />
              )}
            </div>
          ) : pin ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={pin.photo_url}
              alt={pin.title}
              className="rounded-xl object-cover flex-shrink-0"
              style={{ width: 80, height: 80 }}
            />
          ) : null}

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {isBusiness && businessPin ? businessPin.business_name : pin?.title}
            </p>

            {isBusiness && businessPin ? (
              <>
                {/* Business type label */}
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginTop: 2,
                  }}
                >
                  {BUSINESS_TYPE_LABELS[businessPin.business_type]}
                  {businessPin.address_city && ` · ${businessPin.address_city}`}
                </p>

                {/* Rating + accepts clients */}
                <div className="flex items-center gap-2 mt-1">
                  {businessPin.avg_rating != null && businessPin.avg_rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star
                        size={14}
                        strokeWidth={1.5}
                        fill="currentColor"
                        className={scoreColorClass(businessPin.avg_rating)}
                      />
                      <span
                        className={scoreColorClass(businessPin.avg_rating)}
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {businessPin.avg_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {businessPin.accepts_clients && (
                    <div className="flex items-center gap-0.5">
                      <UserCheck
                        size={12}
                        strokeWidth={1.5}
                        style={{ color: 'var(--status-success)' }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 12,
                          color: 'var(--status-success)',
                        }}
                      >
                        Accepting clients
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : pin ? (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <Star
                      size={14}
                      strokeWidth={1.5}
                      fill={pin.avg_rating >= 1 ? 'currentColor' : 'none'}
                      className={scoreColorClass(pin.avg_rating)}
                    />
                    <span
                      className={scoreColorClass(pin.avg_rating)}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {pin.avg_rating > 0 ? pin.avg_rating.toFixed(1) : '—'}
                    </span>
                  </div>

                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${pin.username}`);
                    }}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    @{pin.username}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-1">
                  <UtensilsCrossed
                    size={12}
                    strokeWidth={1.5}
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {tRecipe('wantRecipe', { count: pin.recipe_request_count })}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {/* Badge */}
          {isBusiness && businessPin ? (
            <div
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full"
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
              <VerifiedBadge size={11} />
              {t('viewProfile')}
            </div>
          ) : pin?.is_restaurant ? (
            <div
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(232, 168, 56, 0.15)',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent-primary)',
              }}
            >
              {(pin as MapPin & { venue_verified?: boolean }).venue_verified && (
                <VerifiedBadge size={11} />
              )}
              {t('restaurant')}
            </div>
          ) : null}
        </button>
      </div>
    </>
  );
}
