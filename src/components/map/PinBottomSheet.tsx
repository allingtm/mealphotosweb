'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { BUSINESS_TYPE_LABELS, TYPE_GROUP_COLORS, getBusinessTypeGroup } from '@/types/database';
import type { MapBusinessPin, BusinessType } from '@/types/database';
import { timeAgo } from '@/lib/utils/timeAgo';
import cloudflareLoader from '@/lib/cloudflare-loader';

interface PinBottomSheetProps {
  pin: MapBusinessPin;
  onClose: () => void;
}

export function PinBottomSheet({ pin, onClose }: PinBottomSheetProps) {
  const typeLabel = BUSINESS_TYPE_LABELS[pin.business_type as keyof typeof BUSINESS_TYPE_LABELS] ?? pin.business_type;
  const categories = pin.business_categories ?? [pin.business_type];
  const premiseUrl = pin.country_slug && pin.region_slug && pin.city_slug && pin.premise_slug
    ? `/${pin.country_slug}/${pin.region_slug}/${pin.city_slug}/${pin.premise_slug}`
    : `/business/${pin.username}`;
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

            <div className="flex flex-wrap gap-1 mt-1.5">
              {categories.slice(0, 3).map((cat) => {
                const group = getBusinessTypeGroup(cat as BusinessType);
                const color = TYPE_GROUP_COLORS[group];
                return (
                  <span key={cat} className="rounded-full px-2 py-0.5" style={{ fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 600, backgroundColor: `${color}20`, color }}>
                    {BUSINESS_TYPE_LABELS[cat as keyof typeof BUSINESS_TYPE_LABELS] ?? cat}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 mt-1">
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
          href={premiseUrl}
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
