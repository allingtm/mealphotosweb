import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, UtensilsCrossed, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MealGrid } from '@/components/profile/MealGrid';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface VenueMeal {
  id: string;
  title: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  venue_name: string | null;
  venue_address: string | null;
  location_city: string | null;
}

const getVenueMeals = cache(async (venueMapboxId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('meals')
    .select('id, title, photo_url, avg_rating, rating_count, venue_name, venue_address, location_city')
    .eq('venue_mapbox_id', venueMapboxId)
    .order('avg_rating', { ascending: false })
    .limit(50);
  return (data ?? []) as VenueMeal[];
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ venueMapboxId: string }>;
}): Promise<Metadata> {
  const { venueMapboxId } = await params;
  const meals = await getVenueMeals(decodeURIComponent(venueMapboxId));
  if (!meals || meals.length === 0) {
    return { title: 'Restaurant | meal.photos' };
  }
  const venueName = meals[0].venue_name ?? 'Restaurant';
  const city = meals[0].location_city;
  return {
    title: `${venueName}${city ? ` in ${city}` : ''} | meal.photos`,
    description: `${meals.length} meals tagged at ${venueName} on meal.photos`,
  };
}

export default async function RestaurantVenuePage({
  params,
}: {
  params: Promise<{ venueMapboxId: string }>;
}) {
  const { venueMapboxId } = await params;
  const decodedId = decodeURIComponent(venueMapboxId);
  const supabase = await createClient();

  const [meals, claimResult] = await Promise.all([
    getVenueMeals(decodedId),
    supabase
      .from('restaurant_claims')
      .select('id, claimed_by, profiles!restaurant_claims_claimed_by_fkey(subscription_status, is_restaurant)')
      .eq('venue_mapbox_id', decodedId)
      .eq('outreach_status', 'claimed')
      .limit(1)
      .maybeSingle(),
  ]);

  const t = await getTranslations('restaurant');

  if (meals.length === 0) {
    notFound();
  }

  const claimData = claimResult.data as {
    id: string;
    claimed_by: string;
    profiles: { subscription_status: string; is_restaurant: boolean } | null;
  } | null;
  const venueVerified = !!(
    claimData?.profiles?.subscription_status === 'active' &&
    claimData?.profiles?.is_restaurant
  );

  const venueName = meals[0].venue_name ?? 'Restaurant';
  const venueAddress = meals[0].venue_address;
  const totalRatings = meals.reduce((sum, m) => sum + m.rating_count, 0);
  const avgScore = meals.length > 0
    ? meals.reduce((sum, m) => sum + Number(m.avg_rating) * m.rating_count, 0) / (totalRatings || 1)
    : 0;

  // LocalBusiness JSON-LD for AEO/GEO
  const restaurantJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: venueName,
    ...(venueAddress ? { address: venueAddress } : {}),
    ...(meals[0].location_city ? { addressLocality: meals[0].location_city } : {}),
    url: `https://meal.photos/restaurant/${encodeURIComponent(decodedId)}`,
    ...(totalRatings > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgScore.toFixed(1),
        ratingCount: totalRatings,
        bestRating: 10,
        worstRating: 1,
      },
    }),
  };

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 56px)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
      />
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ height: 56 }}
      >
        <Link href="/" aria-label={t('back')}>
          <ArrowLeft
            size={24}
            strokeWidth={1.5}
            style={{ color: 'var(--text-primary)' }}
          />
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {venueName}
          {venueVerified && (
            <span style={{ marginLeft: 6 }}><VerifiedBadge size={16} /></span>
          )}
        </span>
      </div>

      {/* Venue info */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--text-primary)',
            }}
          >
            {venueName}
          </h1>
          {venueVerified && <VerifiedBadge size={18} />}
        </div>
        {venueVerified && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--accent-primary)',
              marginBottom: 4,
            }}
          >
            Verified restaurant
          </p>
        )}
        {venueAddress && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginBottom: 16,
            }}
          >
            {venueAddress}
          </p>
        )}

        {/* Stats */}
        <div
          className="flex items-center gap-4"
          style={{ marginBottom: 8 }}
        >
          <div className="flex items-center gap-1">
            <Star
              size={16}
              strokeWidth={1.5}
              fill="var(--accent-primary)"
              color="var(--accent-primary)"
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--accent-primary)',
              }}
            >
              {avgScore.toFixed(1)}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            {meals.length} {t('meals')} &middot; {totalRatings} {t('totalRatings')}
          </span>
        </div>
      </div>

      {/* Meals grid */}
      <MealGrid meals={meals} />

      {/* Claim CTA */}
      <div
        style={{
          margin: '32px 16px 16px',
          padding: 24,
          borderRadius: 16,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid rgba(232, 168, 56, 0.2)',
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: 8 }}
        >
          <UtensilsCrossed
            size={20}
            strokeWidth={1.5}
            style={{ color: 'var(--accent-primary)' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text-primary)',
            }}
          >
            {t('claimTitle')}
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          {t('claimDesc')}
        </p>
        <Link
          href={`/business?venue=${encodeURIComponent(decodedId)}&name=${encodeURIComponent(venueName)}`}
          className="block text-center"
          style={{
            padding: '12px 0',
            borderRadius: 24,
            backgroundColor: 'var(--accent-primary)',
            color: '#121212',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {t('claimCta')}
        </Link>
      </div>

      {/* Bottom padding for nav bar */}
      <div style={{ height: 32 }} />
    </div>
  );
}
