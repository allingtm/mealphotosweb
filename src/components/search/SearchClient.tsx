'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, TrendingUp, UtensilsCrossed, Loader2, ChevronDown } from 'lucide-react';
import posthog from 'posthog-js';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPE_LABELS } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { DishRequestCard } from './DishRequestCard';
import { DishRequestForm } from './DishRequestForm';

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

const DIETARY_OPTIONS = ['V', 'VG', 'GF', 'DF'] as const;

const PRICE_RANGES = [
  { label: 'Under £5', min: 0, max: 500 },
  { label: '£5–£10', min: 500, max: 1000 },
  { label: '£10–£20', min: 1000, max: 2000 },
  { label: 'Over £20', min: 2000, max: undefined },
] as const;

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

interface MenuItemResult {
  id: string;
  name: string;
  price_pence: number | null;
  dietary_tags: string[] | null;
  business_profiles: { business_name: string; address_city: string | null } | null;
  profiles: { username: string } | null;
}

interface PopularItem {
  name: string;
  count: number;
  total_reactions: number;
}

interface DishRequestItem {
  id: string;
  dish_name: string;
  location_city: string;
  upvote_count: number;
  user_has_upvoted: boolean;
}

interface IngredientSuggestion {
  id: string;
  name: string;
  category: string | null;
}

interface Filters {
  cuisine?: string;
  dietary?: string;
  ingredients?: string;
  minPrice?: string;
  maxPrice?: string;
}

export function SearchClient() {
  const [query, setQuery] = useState('');
  const [dishes, setDishes] = useState<DishResult[]>([]);
  const [businesses, setBusinesses] = useState<BusinessResult[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemResult[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [dishRequests, setDishRequests] = useState<DishRequestItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const ingredientDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load popular + dish requests on mount
  useEffect(() => {
    fetch('/api/search/popular')
      .then((r) => r.json())
      .then((data) => setPopular(data.popular ?? []))
      .catch(() => {})
      .finally(() => setLoadingPopular(false));

    fetch('/api/dish-requests?limit=5')
      .then((r) => r.json())
      .then((data) => setDishRequests(data.requests ?? []))
      .catch(() => {});
  }, []);

  const performSearch = useCallback(async (q: string, activeFilters?: Filters, append?: boolean) => {
    if (!q.trim()) {
      setHasSearched(false);
      setDishes([]);
      setBusinesses([]);
      setMenuItems([]);
      setNextCursor(null);
      return;
    }

    if (!append) setSearching(true);
    setHasSearched(true);

    const f = activeFilters ?? filters;
    const params = new URLSearchParams({ q, limit: '20' });
    if (f.cuisine) params.set('cuisine', f.cuisine);
    if (f.dietary) params.set('dietary', f.dietary);
    if (f.ingredients) params.set('ingredients', f.ingredients);
    if (f.minPrice) params.set('minPrice', f.minPrice);
    if (f.maxPrice) params.set('maxPrice', f.maxPrice);

    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      if (append) {
        setDishes((prev) => [...prev, ...(data.dishes ?? [])]);
      } else {
        setDishes(data.dishes ?? []);
        setBusinesses(data.businesses ?? []);
        setMenuItems(data.menuItems ?? []);
      }
      setNextCursor(data.nextCursor ?? null);

      if (!append) {
        posthog.capture('search_performed', {
          query: q,
          results_count: (data.dishes?.length ?? 0) + (data.businesses?.length ?? 0) + (data.menuItems?.length ?? 0),
          filters: f,
        });
      }
    } catch {
      if (!append) {
        setDishes([]);
        setBusinesses([]);
        setMenuItems([]);
      }
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleCategoryTap = (cat: typeof CATEGORIES[number]) => {
    setQuery(cat.label);
    const newFilters = { ...filters, cuisine: cat.value };
    setFilters(newFilters);
    performSearch(cat.label, newFilters);
  };

  const handlePopularTap = (name: string) => {
    setQuery(name);
    performSearch(name);
  };

  const handleFilterChange = (key: keyof Filters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value };
    if (!value) delete newFilters[key];
    setFilters(newFilters);
    setOpenFilter(null);
    if (query.trim()) performSearch(query, newFilters);
  };

  const handlePriceFilter = (min: number, max: number | undefined) => {
    const newFilters = {
      ...filters,
      minPrice: min.toString(),
      maxPrice: max?.toString(),
    };
    if (!max) delete newFilters.maxPrice;
    setFilters(newFilters);
    setOpenFilter(null);
    if (query.trim()) performSearch(query, newFilters);
  };

  const clearAll = () => {
    setQuery('');
    setHasSearched(false);
    setDishes([]);
    setBusinesses([]);
    setMenuItems([]);
    setNextCursor(null);
    setFilters({});
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ q: query, limit: '20', cursor: nextCursor });
    if (filters.cuisine) params.set('cuisine', filters.cuisine);
    if (filters.ingredients) params.set('ingredients', filters.ingredients);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);

    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setDishes((prev) => [...prev, ...(data.dishes ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  };

  const totalResults = dishes.length + businesses.length + menuItems.length;
  const showDefault = !hasSearched;
  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full px-4 pb-24 max-w-3xl md:max-w-none">
        {/* Search input */}
        <div className="py-4">
          <div className="relative">
          <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search dishes, cuisines, places"
            className="pl-10 pr-10 focus-visible:ring-0 focus-visible:border-input"
          />
          {query && (
            <button
              type="button"
              onClick={clearAll}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Clear search"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
          </div>
        </div>

        {/* Filter pills — shown when there's a query */}
        {hasSearched && (
          <div className="flex gap-2 mb-4 flex-wrap relative">
            {/* Cuisine filter */}
            <FilterPill
              label="Cuisine"
              active={!!filters.cuisine}
              activeLabel={CATEGORIES.find((c) => c.value === filters.cuisine)?.label}
              isOpen={openFilter === 'cuisine'}
              onToggle={() => setOpenFilter(openFilter === 'cuisine' ? null : 'cuisine')}
              onClear={() => handleFilterChange('cuisine', undefined)}
            >
              <div className="flex flex-col gap-1 p-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleFilterChange('cuisine', cat.value)}
                    className="text-left px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: filters.cuisine === cat.value ? 'rgba(232, 168, 56, 0.15)' : 'transparent',
                      color: filters.cuisine === cat.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </FilterPill>

            {/* Dietary filter */}
            <FilterPill
              label="Dietary"
              active={!!filters.dietary}
              activeLabel={filters.dietary}
              isOpen={openFilter === 'dietary'}
              onToggle={() => setOpenFilter(openFilter === 'dietary' ? null : 'dietary')}
              onClear={() => handleFilterChange('dietary', undefined)}
            >
              <div className="flex flex-col gap-1 p-2">
                {DIETARY_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleFilterChange('dietary', tag)}
                    className="text-left px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: filters.dietary === tag ? 'rgba(232, 168, 56, 0.15)' : 'transparent',
                      color: filters.dietary === tag ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </FilterPill>

            {/* Price filter */}
            <FilterPill
              label="Price"
              active={!!filters.minPrice}
              activeLabel={PRICE_RANGES.find((r) => r.min.toString() === filters.minPrice)?.label}
              isOpen={openFilter === 'price'}
              onToggle={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
              onClear={() => { setFilters((f) => { const { minPrice: _a, maxPrice: _b, ...rest } = f; return rest; }); setOpenFilter(null); if (query.trim()) performSearch(query, { ...filters, minPrice: undefined, maxPrice: undefined }); }}
            >
              <div className="flex flex-col gap-1 p-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => handlePriceFilter(range.min, range.max)}
                    className="text-left px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: filters.minPrice === range.min.toString() ? 'rgba(232, 168, 56, 0.15)' : 'transparent',
                      color: filters.minPrice === range.min.toString() ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </FilterPill>

            {/* Ingredients filter */}
            <FilterPill
              label="Ingredients"
              active={!!filters.ingredients}
              activeLabel={filters.ingredients?.split(',').length === 1 ? filters.ingredients : `${filters.ingredients?.split(',').length} ingredients`}
              isOpen={openFilter === 'ingredients'}
              onToggle={() => {
                setOpenFilter(openFilter === 'ingredients' ? null : 'ingredients');
                setIngredientQuery('');
                setIngredientSuggestions([]);
              }}
              onClear={() => handleFilterChange('ingredients', undefined)}
            >
              <div className="p-2">
                <input
                  type="text"
                  value={ingredientQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIngredientQuery(val);
                    if (ingredientDebounceRef.current) clearTimeout(ingredientDebounceRef.current);
                    if (val.trim()) {
                      ingredientDebounceRef.current = setTimeout(async () => {
                        try {
                          const res = await fetch(`/api/ingredients?q=${encodeURIComponent(val.trim())}&limit=8`);
                          const data = await res.json();
                          setIngredientSuggestions(data.ingredients ?? []);
                        } catch { setIngredientSuggestions([]); }
                      }, 250);
                    } else {
                      setIngredientSuggestions([]);
                    }
                  }}
                  placeholder="Search ingredients..."
                  className="w-full px-3 py-2 rounded-lg mb-1"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                  autoFocus
                />
                {/* Selected ingredients */}
                {filters.ingredients && (
                  <div className="flex flex-wrap gap-1 mb-1 px-1">
                    {filters.ingredients.split(',').map((ing) => (
                      <span
                        key={ing}
                        className="flex items-center gap-0.5 rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: 'rgba(232, 168, 56, 0.15)',
                          color: 'var(--accent-primary)',
                          fontFamily: 'var(--font-body)',
                          fontSize: 11,
                        }}
                      >
                        {ing}
                        <button
                          type="button"
                          onClick={() => {
                            const current = filters.ingredients!.split(',').filter((i) => i !== ing);
                            handleFilterChange('ingredients', current.length > 0 ? current.join(',') : undefined);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent-primary)' }}
                          aria-label={`Remove ${ing}`}
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Suggestions */}
                <div className="flex flex-col gap-0.5">
                  {ingredientSuggestions.map((s) => {
                    const alreadySelected = filters.ingredients?.split(',').includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (alreadySelected) return;
                          const current = filters.ingredients ? filters.ingredients.split(',') : [];
                          handleFilterChange('ingredients', [...current, s.name].join(','));
                          setIngredientQuery('');
                          setIngredientSuggestions([]);
                        }}
                        className="text-left px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor: alreadySelected ? 'rgba(232, 168, 56, 0.15)' : 'transparent',
                          color: alreadySelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                          opacity: alreadySelected ? 0.6 : 1,
                        }}
                        disabled={alreadySelected}
                      >
                        {s.name}
                        {s.category && (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6, textTransform: 'capitalize' }}>
                            {s.category}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FilterPill>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setFilters({}); if (query.trim()) performSearch(query, {}); }}
                className="rounded-full px-3 py-1.5"
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--status-error)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

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
                      onClick={() => handlePopularTap(item.name)}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryTap(cat)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dish requests */}
            {dishRequests.length > 0 && (
              <div className="mb-6">
                <SectionHeader title="Dish requests in your area" />
                <div className="flex flex-col">
                  {dishRequests.map((req) => (
                    <DishRequestCard
                      key={req.id}
                      id={req.id}
                      dishName={req.dish_name}
                      locationCity={req.location_city}
                      upvoteCount={req.upvote_count}
                      userHasUpvoted={req.user_has_upvoted}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Search results */}
        {hasSearched && !searching && (
          <>
            {totalResults === 0 ? (
              <div className="py-8">
                <div className="text-center mb-6">
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No results found
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                    Can&apos;t find what you&apos;re looking for?
                  </p>
                </div>
                <DishRequestForm />
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

                    {/* Load more */}
                    {nextCursor && (
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full flex items-center justify-center gap-2 py-3 mt-2"
                        style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {loadingMore ? <Loader2 size={16} className="animate-spin" /> : 'Load more dishes'}
                      </button>
                    )}
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

                {/* Menu item results */}
                {menuItems.length > 0 && (
                  <div className="mb-6">
                    <SectionHeader title={`Menu Items (${menuItems.length})`} />
                    <div className="flex flex-col gap-1">
                      {menuItems.map((item) => {
                        const bp = item.business_profiles as { business_name: string; address_city: string | null } | null;
                        const prof = item.profiles as { username: string } | null;
                        return (
                          <Link
                            key={item.id}
                            href={prof?.username ? `/business/${prof.username}` : '#'}
                            className="flex items-center justify-between py-2"
                            style={{ textDecoration: 'none' }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>
                                  {item.name}
                                </span>
                                {item.dietary_tags && item.dietary_tags.length > 0 && (
                                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                                    {item.dietary_tags.join(' · ')}
                                  </span>
                                )}
                              </div>
                              {bp && (
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                  From {bp.business_name}&apos;s menu
                                  {bp.address_city && ` · ${bp.address_city}`}
                                </p>
                              )}
                            </div>
                            {item.price_pence != null && (
                              <span className="shrink-0 ml-2" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
                                {formatPrice(item.price_pence)}
                              </span>
                            )}
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

// --- Sub-components ---

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

function FilterPill({
  label,
  active,
  activeLabel,
  isOpen,
  onToggle,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  activeLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={active ? onClear : onToggle}
        className="flex items-center gap-1 rounded-full px-3 py-1.5"
        style={{
          backgroundColor: active ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-elevated)',
          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {active ? (activeLabel ?? label) : label}
        {active ? <X size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl shadow-lg overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            maxHeight: 240,
            minWidth: 160,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
