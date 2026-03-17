'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UtensilsCrossed, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPE_LABELS } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { timeAgo } from '@/lib/utils/timeAgo';
import cloudflareLoader from '@/lib/cloudflare-loader';

interface ConsumerProfileProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  locationCity: string | null;
}

interface SavedDish {
  dish_id: string;
  created_at: string;
  dishes: {
    id: string;
    title: string;
    price_pence: number | null;
    photo_url: string;
    reaction_count: number;
    business_profiles: { business_name: string; business_type: string; address_city: string | null } | { business_name: string; business_type: string; address_city: string | null }[];
  } | { id: string; title: string; price_pence: number | null; photo_url: string; reaction_count: number; business_profiles: { business_name: string; business_type: string; address_city: string | null } | { business_name: string; business_type: string; address_city: string | null }[] }[];
}

interface FollowedBusiness {
  following_id: string;
  profiles: { username: string; avatar_url: string | null; plan: string } | { username: string; avatar_url: string | null; plan: string }[];
  business_profiles: { business_name: string; business_type: string; address_city: string | null } | { business_name: string; business_type: string; address_city: string | null }[];
}

function normalize<T>(val: T | T[]): T {
  return Array.isArray(val) ? val[0] : val;
}

export function ConsumerProfile({ userId, username, avatarUrl, locationCity }: ConsumerProfileProps) {
  const [saves, setSaves] = useState<SavedDish[]>([]);
  const [following, setFollowing] = useState<FollowedBusiness[]>([]);
  const [loadingSaves, setLoadingSaves] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);

  useEffect(() => {
    fetch('/api/me/saves?limit=30')
      .then((r) => r.json())
      .then((data) => setSaves(data.saves ?? []))
      .catch(() => {})
      .finally(() => setLoadingSaves(false));

    fetch('/api/me/following')
      .then((r) => r.json())
      .then((data) => setFollowing(data.following ?? []))
      .catch(() => {})
      .finally(() => setLoadingFollowing(false));
  }, []);

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full pb-24 max-w-3xl md:max-w-none">
        {/* Avatar + info */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={username} width={64} height={64} className="rounded-full object-cover mb-2" loader={cloudflareLoader} />
          ) : (
            <div className="rounded-full flex items-center justify-center mb-2" style={{ width: 64, height: 64, backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent-primary)' }}>
              {username[0]?.toUpperCase()}
            </div>
          )}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
            @{username}
          </p>
          {locationCity && (
            <p className="flex items-center gap-1" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <MapPin size={12} strokeWidth={1.5} /> {locationCity}
            </p>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="saves" className="w-full">
          <TabsList className="w-full justify-start gap-0 rounded-none border-b px-4" style={{ backgroundColor: 'transparent', borderColor: 'var(--bg-elevated)' }}>
            <TabsTrigger value="saves" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[var(--accent-primary)]" style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500 }}>
              Want to try
            </TabsTrigger>
            <TabsTrigger value="following" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[var(--accent-primary)]" style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500 }}>
              Following ({following.length})
            </TabsTrigger>
          </TabsList>

          {/* Want to Try */}
          <TabsContent value="saves" className="px-4 pt-4">
            {loadingSaves ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : saves.length === 0 ? (
              <p className="text-center py-12" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                Dishes you save will appear here. Browse the feed and tap 🔖 to save dishes you want to try.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {saves.map((save) => {
                  const dish = normalize(save.dishes);
                  const bp = normalize(dish.business_profiles);
                  return (
                    <Link key={save.dish_id} href={`/dish/${dish.id}`} className="flex gap-3" style={{ textDecoration: 'none' }}>
                      <Image src={dish.photo_url} alt={dish.title} width={64} height={64} className="rounded-lg object-cover shrink-0" loader={cloudflareLoader} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{dish.title}</span>
                          {dish.price_pence != null && (
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-primary)' }}>{formatPrice(dish.price_pence)}</span>
                          )}
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {bp.business_name}{bp.address_city && ` · 📍 ${bp.address_city}`}
                        </p>
                        <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {dish.reaction_count > 0 && (
                            <span className="flex items-center gap-0.5" style={{ color: 'var(--status-success)' }}>
                              <UtensilsCrossed size={10} strokeWidth={2} /> {dish.reaction_count}
                            </span>
                          )}
                          <span>Saved {timeAgo(save.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Following */}
          <TabsContent value="following" className="px-4 pt-4">
            {loadingFollowing ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : following.length === 0 ? (
              <p className="text-center py-12" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                Businesses you follow will appear here. Follow businesses to see their dishes in your feed.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {following.map((f) => {
                  const profile = normalize(f.profiles);
                  const bp = normalize(f.business_profiles);
                  const typeLabel = BUSINESS_TYPE_LABELS[bp.business_type as keyof typeof BUSINESS_TYPE_LABELS] ?? bp.business_type;
                  return (
                    <Link key={f.following_id} href={`/business/${profile.username}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                      {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt={bp.business_name} width={40} height={40} className="rounded-full object-cover shrink-0" loader={cloudflareLoader} />
                      ) : (
                        <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent-primary)' }}>
                          {bp.business_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{bp.business_name}</span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {typeLabel}{bp.address_city && ` · 📍 ${bp.address_city}`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
