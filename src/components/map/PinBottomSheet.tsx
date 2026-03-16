'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BUSINESS_TYPE_LABELS } from '@/types/database';
import type { MapBusinessPin } from '@/types/database';
import { timeAgo } from '@/lib/utils/timeAgo';
import cloudflareLoader from '@/lib/cloudflare-loader';

interface PinBottomSheetProps {
  pin: MapBusinessPin;
  onClose: () => void;
}

export function PinBottomSheet({ pin, onClose }: PinBottomSheetProps) {
  const typeLabel = BUSINESS_TYPE_LABELS[pin.business_type as keyof typeof BUSINESS_TYPE_LABELS] ?? pin.business_type;
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-start gap-3">
          {pin.avatar_url ? (
            <Image
              src={pin.avatar_url}
              alt={pin.business_name}
              width={48}
              height={48}
              className="rounded-full object-cover shrink-0"
              loader={cloudflareLoader}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: 48,
                height: 48,
                backgroundColor: 'var(--bg-elevated)',
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                color: 'var(--accent-primary)',
              }}
            >
              {pin.business_name[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="truncate"
                style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {pin.business_name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                {typeLabel}
              </span>
              {pin.address_city && (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>·</span>
                  <span className="flex items-center gap-0.5" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <MapPin size={11} strokeWidth={1.5} />
                    {pin.address_city}
                  </span>
                </>
              )}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {pin.last_post_at ? `Last post: ${timeAgo(pin.last_post_at)}` : 'No dishes posted yet'}
            </p>
          </div>
        </div>

        <Link
          href={`/business/${pin.username}`}
          onClick={onClose}
          className="flex items-center justify-between mt-4 px-4 py-3 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--bg-elevated)', textDecoration: 'none' }}
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--accent-primary)' }}>
            View profile
          </span>
          <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
        </Link>
      </SheetContent>
    </Sheet>
  );
}
