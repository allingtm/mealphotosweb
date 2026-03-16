'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, TrendingUp, UtensilsCrossed, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { BUSINESS_TYPE_LABELS } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import cloudflareLoader from '@/lib/cloudflare-loader';

const CATEGORIES = [
  { label: 'Italian', emoji: '🍕', value: 'italian' },
  { label: 'Asian', emoji: '🍜', value: 'asian' },
  { label: 'American', emoji: '🍔', value: 'american' },
  { label: 'British', emoji: '🇬🇧', value: 'british' },
  { label: 'Indian', emoji: '🍛', value: 'indian' },
  { label: 'French', emoji: '🥐', value: 'french' },
  { label: 'Mexican', emoji: '🌮', value: 'mexican' },
  { label: 'Chinese', emoji: '🥡', value: 'chinese' },
  { label: 'Japanese', emoji: '🍱', value: 'japanese' },
  { label: 'Thai', emoji: '🍲', value: 'thai' },
  { label: 'Mediterranean', emoji: '🫒', value: 'mediterranean' },
  { label: 'Middle Eastern', emoji: '🧆', value: 'middle_eastern' },
];

interface DishResult {
  id: string;
  title: string;
  photo_url: string;
  price_pence: number | null;
  reaction_count: number;
  business_profiles: { business_name: string; business_type: string; address_city: string | null };
  profiles: { username: string };
}

interface BusinessResult {
  id: string;
  business_name: string;
  business_type: string;
  address_city: string | null;
  profiles: { username: string; avatar_url: string | null; plan: string };
}

interface PopularItem {
  name: string;
  count: number;
  total_reactions: number;
}

export function SearchClient() {
  const [query, setQuery] = useState('');
  const [dishes, setDishes] = useState<DishResult[]>([]);
  const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load popular on mount
  useEffect(() => {
    fetch('/api/search/popular')
      .then((r) => r.json())
      .then((data) => setPopular(data.popular ?? []))
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, []);

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setHasSearched(false); setDishes([]); setBusinesses([]); return; }

    setSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setDishes(data.dishes ?? []);
      setBusinesses(data.businesses ?? []);
      posthog.capture('search_performed', {
        query: q,
        results_count: (data.dishes?.length ?? 0) + (data.businesses?.length ?? 0),
      });
    } catch {
      setDishes([]);
      setBusinesses([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleCategoryTap = (cuisine: string) => {
    setQuery(cuisine);
    performSearch(cuisine);
  };

  const totalResults = dishes.length + businesses.length;
  const showDefault = !hasSearched;

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full px-4 pb-24" style={{ maxWidth: 600 }}>
        {/* Search input */}
        <div className="relative py-4">
          <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 mt-2" style={{ color: 'var(--text-secondary)' }} />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search dishes, cuisines, places"
            className="pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setHasSearched(false); setDishes([]); setBusinesses([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 mt-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Searching indicator */}
        {searching && (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}

        {/* Default state — popular + categories */}
        {showDefault && !searching && (
          <>
            {/* Popular right now */}
            <div className="mb-6">
              <SectionHeader title="Popular right now" />
              {loadingPopular ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : popular.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {popular.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleCategoryTap(item.name)}
                      className="flex items-center gap-2 text-left"
                    >
                      <TrendingUp size={14} style={{ color: 'var(--status-error)' }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {item.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                        ({item.count} {item.count === 1 ? 'business' : 'businesses'})
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                  Nothing trending right now.
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="mb-6">
              <SectionHeader title="Categories" />
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryTap(cat.label)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Search results */}
        {hasSearched && !searching && (
          <>
            {totalResults === 0 ? (
              <div className="text-center py-12">
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No results found
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                  Can&apos;t find what you&apos;re looking for?
                </p>
              </div>
            ) : (
              <>
                {/* Dish results */}
                {dishes.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader title={`Dishes (${dishes.length})`} />
                    <div className="flex flex-col gap-3">
                      {dishes.map((dish) => (
                        <Link key={dish.id} href={`/dish/${dish.id}`} className="flex gap-3" style={{ textDecoration: 'none' }}>
                          <Image
                            src={dish.photo_url}
                            alt={dish.title}
                            width={56}
                            height={56}
                            className="rounded-lg object-cover shrink-0"
                            loader={cloudflareLoader}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                                {dish.title}
                              </span>
                              {dish.price_pence != null && (
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--accent-primary)' }}>
                                  {formatPrice(dish.price_pence)}
                                </span>
                              )}
                            </div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                              {dish.business_profiles.business_name}
                              {dish.business_profiles.address_city && ` · 📍 ${dish.business_profiles.address_city}`}
                            </p>
                            {dish.reaction_count > 0 && (
                              <span className="flex items-center gap-0.5" style={{ fontSize: 12, color: 'var(--status-success)' }}>
                                <UtensilsCrossed size={10} strokeWidth={2} />
                                {dish.reaction_count}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business results */}
                {businesses.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader title={`Businesses (${businesses.length})`} />
                    <div className="flex flex-col gap-3">
                      {businesses.map((biz) => {
                        const profile = Array.isArray(biz.profiles) ? biz.profiles[0] : biz.profiles;
                        return (
                          <Link key={biz.id} href={`/business/${profile.username}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                            {profile.avatar_url ? (
                              <Image src={profile.avatar_url} alt={biz.business_name} width={40} height={40} className="rounded-full object-cover shrink-0" loader={cloudflareLoader} />
                            ) : (
                              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 40, height: 40, backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent-primary)' }}>
                                {biz.business_name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1">
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{biz.business_name}</span>
                                {profile.plan === 'premium' && <VerifiedBadge size={12} />}
                              </div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                                {BUSINESS_TYPE_LABELS[biz.business_type as keyof typeof BUSINESS_TYPE_LABELS] ?? biz.business_type}
                                {biz.address_city && ` · 📍 ${biz.address_city}`}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p
      className="mb-3"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </p>
  );
}
