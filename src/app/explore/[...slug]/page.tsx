import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { CUISINE_OPTIONS, CUISINE_LABELS } from '@/lib/validations/meal';
import { deslugify } from '@/lib/validations/explore';
import { ExploreStats } from '@/components/explore/ExploreStats';
import { ExploreFAQ } from '@/components/explore/ExploreFAQ';
import { RelatedPages } from '@/components/explore/RelatedPages';
import { BlurHashCanvas } from '@/components/feed/BlurHashCanvas';
import { ScoreBadge } from '@/components/feed/ScoreBadge';
import { AppBar } from '@/components/layout/AppBar';

export const revalidate = 300; // ISR: 5 minutes

// --- Types ---

interface ExplorePageData {
  total_meals: number;
  avg_score: number;
  total_ratings: number;
  top_meal: { title: string; avg_rating: number; username: string; rating_count: number } | null;
  meals: ExploreMeal[];
  top_contributors: { username: string; display_name: string | null; avatar_url: string | null; meal_count: number; avg_score: number }[];
  related_cities: { slug: string; name: string; meal_count: number }[];
  related_cuisines: { slug: string; name: string; meal_count: number }[];
}

interface ExploreMeal {
  id: string;
  title: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  cuisine: string | null;
  location_city: string | null;
  location_country: string | null;
  created_at: string;
  photo_blur_hash: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

type PageType = 'city' | 'country' | 'cuisine' | 'city_cuisine';

interface ResolvedSlug {
  pageType: PageType;
  city?: string;
  country?: string;
  cuisine?: string;
  displayName: string;
}

// --- Slug Resolution ---

function resolveSlug(slugParts: string[]): ResolvedSlug | null {
  const cuisineValues = CUISINE_OPTIONS as readonly string[];

  if (slugParts.length === 1) {
    if (slugParts[0] === 'cuisine') return null;
    if (cuisineValues.includes(slugParts[0])) {
      return {
        pageType: 'cuisine',
        cuisine: slugParts[0],
        displayName: CUISINE_LABELS[slugParts[0] as keyof typeof CUISINE_LABELS] ?? slugParts[0],
      };
    }
    // Could be city or country — we'll resolve from the data
    return {
      pageType: 'city',
      city: slugParts[0],
      displayName: deslugify(slugParts[0]),
    };
  }

  if (slugParts.length === 2) {
    if (slugParts[0] === 'cuisine' && cuisineValues.includes(slugParts[1])) {
      return {
        pageType: 'cuisine',
        cuisine: slugParts[1],
        displayName: CUISINE_LABELS[slugParts[1] as keyof typeof CUISINE_LABELS] ?? slugParts[1],
      };
    }
    if (cuisineValues.includes(slugParts[1])) {
      return {
        pageType: 'city_cuisine',
        city: slugParts[0],
        cuisine: slugParts[1],
        displayName: `${deslugify(slugParts[0])} — ${CUISINE_LABELS[slugParts[1] as keyof typeof CUISINE_LABELS] ?? slugParts[1]}`,
      };
    }
    return null;
  }

  return null;
}

// --- Data Fetching ---

const getExploreData = cache(async (resolved: ResolvedSlug): Promise<ExplorePageData | null> => {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc('get_explore_page', {
    p_city: resolved.city ?? null,
    p_country: resolved.country ?? null,
    p_cuisine: resolved.cuisine ?? null,
    p_limit: 12,
  });

  if (error || !data) return null;

  const result = data as unknown as ExplorePageData;

  // If no meals found for city, try as country
  if (result.total_meals === 0 && resolved.pageType === 'city' && !resolved.country) {
    const { data: countryData } = await supabase.rpc('get_explore_page', {
      p_city: null,
      p_country: resolved.city ?? null,
      p_cuisine: null,
      p_limit: 12,
    });
    if (countryData) {
      const countryResult = countryData as unknown as ExplorePageData;
      if (countryResult.total_meals > 0) {
        resolved.pageType = 'country';
        resolved.country = resolved.city;
        resolved.city = undefined;
        return countryResult;
      }
    }
  }

  return result;
});

// --- Static Params ---

export async function generateStaticParams() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.rpc('get_explore_slugs');
  if (!data) return [];

  const slugs = (data as unknown as { slug_type: string; slug_value: string; meal_count: number }[])
    .sort((a, b) => b.meal_count - a.meal_count)
    .slice(0, 50);

  return slugs.map((s) => ({
    slug: s.slug_value.includes('/') ? s.slug_value.split('/') : [s.slug_value],
  }));
}

// --- Metadata ---

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) return { title: 'Explore | meal.photos' };

  const data = await getExploreData(resolved);
  if (!data || data.total_meals === 0) {
    return { title: `${resolved.displayName} | meal.photos` };
  }

  const title = resolved.pageType === 'cuisine'
    ? `Top ${resolved.displayName} Food Rated by Real People | meal.photos`
    : resolved.pageType === 'city_cuisine'
      ? `Best ${resolved.displayName.split(' — ')[1]} in ${resolved.displayName.split(' — ')[0]} | meal.photos`
      : `Best Meals in ${resolved.displayName} | meal.photos`;

  const description = resolved.pageType === 'cuisine'
    ? `${data.total_meals} ${resolved.displayName.toLowerCase()} meals rated on meal.photos with an average score of ${data.avg_score}/10. See the top rated dishes.`
    : `${resolved.displayName} has ${data.total_meals} rated meals with an average score of ${data.avg_score}/10. Discover the best food in ${resolved.displayName}.`;

  const canonicalPath = `/explore/${slug.join('/')}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: 'meal.photos',
      type: 'website',
      images: [
        {
          url: `/api/og/explore?slug=${slug.join('/')}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/explore?slug=${slug.join('/')}`],
    },
  };
}

// --- Score Color ---

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

// --- Page Component ---

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) notFound();

  const data = await getExploreData(resolved);
  if (!data || data.total_meals === 0) notFound();

  const h1 = resolved.pageType === 'cuisine'
    ? `Top rated ${resolved.displayName.toLowerCase()} food`
    : resolved.pageType === 'city_cuisine'
      ? `Best ${resolved.displayName.split(' — ')[1]?.toLowerCase()} in ${resolved.displayName.split(' — ')[0]}`
      : `Best rated meals in ${resolved.displayName}`;

  const summaryText = resolved.pageType === 'cuisine'
    ? `There are ${data.total_meals} ${resolved.displayName.toLowerCase()} meals on meal.photos with an average community score of ${data.avg_score} out of 10.${data.top_meal ? ` The highest rated is "${data.top_meal.title}" by @${data.top_meal.username}, scoring ${Number(data.top_meal.avg_rating).toFixed(1)}/10.` : ''}`
    : `${resolved.displayName} has ${data.total_meals} meals rated by the meal.photos community with an average score of ${data.avg_score} out of 10.${data.top_meal ? ` The top rated meal is "${data.top_meal.title}" by @${data.top_meal.username}, scoring ${Number(data.top_meal.avg_rating).toFixed(1)}/10.` : ''}`;

  // JSON-LD: ItemList + FAQPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    description: summaryText,
    numberOfItems: data.total_meals,
    itemListElement: data.meals.slice(0, 10).map((meal, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: meal.title,
        image: meal.photo_url,
        url: `https://meal.photos/meal/${meal.id}`,
        author: {
          '@type': 'Person',
          name: meal.display_name ?? meal.username,
        },
        ...(meal.avg_rating > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(meal.avg_rating).toFixed(1),
            ratingCount: meal.rating_count,
            bestRating: 10,
            worstRating: 1,
          },
        }),
      },
    })),
  };

  const faqJsonLd = data.top_meal ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the highest rated meal in ${resolved.displayName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The highest rated meal is "${data.top_meal.title}" by @${data.top_meal.username}, with a score of ${Number(data.top_meal.avg_rating).toFixed(1)} out of 10 based on ${data.top_meal.rating_count} ratings.`,
        },
      },
      {
        '@type': 'Question',
        name: `How many meals are rated in ${resolved.displayName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are ${data.total_meals} meals rated in ${resolved.displayName} with an average score of ${data.avg_score} out of 10 across ${data.total_ratings} total ratings.`,
        },
      },
    ],
  } : null;

  // Breadcrumb
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Explore', href: '/explore' },
  ];
  if (resolved.pageType === 'city_cuisine' && resolved.city) {
    breadcrumbs.push({ name: deslugify(resolved.city), href: `/explore/${resolved.city}` });
  }
  breadcrumbs.push({ name: resolved.displayName.split(' — ').pop() ?? resolved.displayName, href: '' });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((bc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: bc.name,
      ...(bc.href ? { item: `https://meal.photos${bc.href}` } : {}),
    })),
  };

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 56px)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <AppBar title={resolved.displayName} />
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        style={{ padding: '12px 16px 0' }}
      >
        <ol className="flex items-center gap-1 flex-wrap" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {breadcrumbs.map((bc, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight size={14} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
              )}
              {bc.href ? (
                <Link
                  href={bc.href}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  {bc.name}
                </Link>
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                >
                  {bc.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Header */}
      <header style={{ padding: '16px 16px 0' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {h1}
        </h1>

        {/* Summary paragraph — AI-citeable */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          {summaryText}
        </p>
      </header>

      {/* Stats */}
      <div style={{ padding: '24px 16px 0' }}>
        <ExploreStats
          totalMeals={data.total_meals}
          avgScore={data.avg_score}
          totalRatings={data.total_ratings}
          topContributor={data.top_contributors[0] ?? null}
        />
      </div>

      {/* Top Meals Grid */}
      <section style={{ padding: '32px 16px 0' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 16px',
          }}
        >
          Top rated meals
        </h2>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          }}
        >
          {data.meals.map((meal) => (
            <Link
              key={meal.id}
              href={`/meal/${meal.id}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  {meal.photo_blur_hash && (
                    <BlurHashCanvas hash={meal.photo_blur_hash} width={160} height={160} />
                  )}
                  <Image
                    src={meal.photo_url}
                    alt={meal.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    style={{ objectFit: 'cover' }}
                  />
                  {meal.avg_rating > 0 && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <ScoreBadge score={Number(meal.avg_rating)} visible={true} />
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {meal.title}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      margin: '2px 0 0',
                    }}
                  >
                    @{meal.username}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '32px 16px 0' }}>
        <ExploreFAQ
          pageTitle={resolved.displayName}
          totalMeals={data.total_meals}
          avgScore={data.avg_score}
          topMeal={data.top_meal}
          pageType={resolved.pageType}
        />
      </section>

      {/* Related Pages */}
      <section style={{ padding: '32px 16px 0' }}>
        <RelatedPages
          relatedCities={data.related_cities}
          relatedCuisines={data.related_cuisines}
        />
      </section>

      {/* Bottom padding for nav bar */}
      <div style={{ height: 56 }} />
    </div>
  );
}
