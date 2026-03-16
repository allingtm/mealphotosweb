'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { timeAgo } from '@/lib/utils/timeAgo';

interface LatestDishesGridProps {
  dishes: {
    id: string;
    title: string;
    photo_url: string;
    photo_blur_hash: string | null;
    reaction_count: number;
    created_at: string;
  }[];
}

export function LatestDishesGrid({ dishes }: LatestDishesGridProps) {
  if (dishes.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
        No dishes posted yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {dishes.map((dish) => (
        <Link key={dish.id} href={`/dish/${dish.id}`} className="flex flex-col gap-1">
          <div className="relative" style={{ aspectRatio: '1/1' }}>
            <Image
              src={dish.photo_url}
              alt={dish.title}
              fill
              sizes="(max-width: 600px) 33vw, 150px"
              className="object-cover rounded-lg"
              loader={cloudflareLoader}
            />
            {dish.reaction_count > 0 && (
              <div
                className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: 'var(--status-success)', color: '#FFFFFF', fontSize: 11, fontWeight: 600 }}
              >
                <UtensilsCrossed size={10} strokeWidth={2} />
                <span>{dish.reaction_count}</span>
              </div>
            )}
          </div>
          <span
            className="truncate"
            style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-primary)' }}
          >
            {dish.title}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
            {timeAgo(dish.created_at)}
          </span>
        </Link>
      ))}
    </div>
  );
}
