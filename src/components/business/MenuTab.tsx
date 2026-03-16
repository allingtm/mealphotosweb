'use client';

import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { formatPrice } from '@/lib/utils';

const TAG_COLORS: Record<string, string> = {
  V: '#4CAF50',
  VG: '#4CAF50',
  GF: '#E8A838',
  DF: '#3B82F6',
};

interface MenuTabProps {
  sections: {
    id: string;
    name: string;
    menu_items: {
      id: string;
      name: string;
      description: string | null;
      price_pence: number | null;
      dietary_tags: string[];
      photo_url: string | null;
      reaction_count: number;
      available: boolean;
    }[];
  }[];
}

export function MenuTab({ sections }: MenuTabProps) {
  if (sections.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}>
        No menu added yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.id}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--bg-elevated)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
              {section.name}
            </h3>
            <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--bg-elevated)' }} />
          </div>

          {/* Items */}
          <div className="flex flex-col gap-4">
            {section.menu_items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3"
                style={{ opacity: item.available ? 1 : 0.5 }}
              >
                {/* Photo thumbnail */}
                {item.photo_url && (
                  <Image
                    src={item.photo_url}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="rounded-lg object-cover shrink-0"
                    loader={cloudflareLoader}
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.name}
                    </span>
                    {item.price_pence != null && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                        {formatPrice(item.price_pence)}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Dietary tags */}
                    {item.dietary_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-1.5 py-0.5"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: 'var(--font-body)',
                          backgroundColor: `${TAG_COLORS[tag] ?? 'var(--bg-elevated)'}22`,
                          color: TAG_COLORS[tag] ?? 'var(--text-secondary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}

                    {/* Reaction count */}
                    {item.reaction_count > 0 && (
                      <span className="flex items-center gap-0.5" style={{ fontSize: 12, color: 'var(--status-success)', fontFamily: 'var(--font-body)' }}>
                        <UtensilsCrossed size={10} strokeWidth={2} />
                        {item.reaction_count} want this
                      </span>
                    )}

                    {!item.available && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
