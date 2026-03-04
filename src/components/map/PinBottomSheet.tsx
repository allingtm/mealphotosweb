'use client';

import { useRouter } from 'next/navigation';
import { Star, UtensilsCrossed } from 'lucide-react';
import type { MapPin } from '@/types/database';

function scoreColorClass(score: number): string {
  if (score < 4) return 'score-low';
  if (score < 6) return 'score-mid';
  if (score < 8) return 'score-good';
  return 'score-high';
}

interface PinBottomSheetProps {
  pin: MapPin | null;
  onClose: () => void;
}

export function PinBottomSheet({ pin, onClose }: PinBottomSheetProps) {
  const router = useRouter();

  if (!pin) return null;

  const handleCardClick = () => {
    router.push(`/meal/${pin.id}`);
  };

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
          {/* Thumbnail */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.photo_url}
            alt={pin.title}
            className="rounded-xl object-cover flex-shrink-0"
            style={{ width: 80, height: 80 }}
          />

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
              {pin.title}
            </p>

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
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
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
                {pin.recipe_request_count} want recipe
              </span>
            </div>
          </div>

          {/* Restaurant badge */}
          {pin.is_restaurant && (
            <div
              className="flex-shrink-0 px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'rgba(232, 168, 56, 0.15)',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent-primary)',
              }}
            >
              Restaurant
            </div>
          )}
        </button>
      </div>
    </>
  );
}
