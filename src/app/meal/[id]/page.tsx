import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, MapPin, UtensilsCrossed } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { timeAgo } from '@/lib/utils/time';
import { slugify } from '@/lib/validations/explore';
import { ShareButton } from '@/components/feed/ShareButton';
import { ScoreBadge } from '@/components/feed/ScoreBadge';
import { BlurHashCanvas } from '@/components/feed/BlurHashCanvas';
import { ScoreDistribution } from '@/components/meal/ScoreDistribution';
import { MealDetailClient } from '@/components/meal/MealDetailClient';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { BackButton } from '@/components/ui/BackButton';
import { MealDetailCarousel } from '@/components/meal/MealDetailCarousel';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { MealAuthGate } from '@/components/meal/MealAuthGate';
import type { Recipe, Ingredient, MealImage } from '@/types/database';

// Cache the meal fetch so generateMetadata and the page share the same data
const getMeal = cache(async (id: string) => {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('meals')
    .select(
      '*, profiles!meals_user_id_fkey(username, display_name, avatar_url, location_city)'
    )
    .eq('id', id)
    .single();
  return data;
});

type MealWithProfile = NonNullable<Awaited<ReturnType<typeof getMeal>>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meal = await getMeal(id);

  if (!meal) {
    return { title: 'Meal not found | meal.photos' };
  }

  const profile = meal.profiles as unknown as {
    username: string;
    display_name: string | null;
  };
  const username = profile?.username ?? 'Unknown';
  const ratingText =
    Number(meal.avg_rating) > 0
      ? ` — Rated ${Number(meal.avg_rating).toFixed(1)}/10`
      : '';
  const cuisineText = meal.cuisine ? ` — ${meal.cuisine}` : '';
  const description = `${meal.title}${ratingText}${cuisineText} on meal.photos`;

  return {
    title: `${meal.title} by ${username} | meal.photos`,
    description,
    openGraph: {
      title: `${meal.title} by ${username}`,
      description,
      images: [
        {
          url: meal.photo_url,
          width: 800,
          height: 1000,
          alt: meal.title,
        },
      ],
      url: `https://meal.photos/meal/${id}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${meal.title} by ${username}`,
      description,
      images: [meal.photo_url],
    },
    alternates: {
      canonical: `https://meal.photos/meal/${id}`,
    },
  };
}

function RecipeJsonLd({
  meal,
  recipe,
  authorUsername,
}: {
  meal: MealWithProfile;
  recipe: Recipe;
  authorUsername: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: meal.title,
    image: meal.photo_url,
    author: { '@type': 'Person', name: authorUsername },
    datePublished: recipe.created_at,
    ...(recipe.cook_time_minutes
      ? { cookTime: `PT${recipe.cook_time_minutes}M` }
      : {}),
    ...(recipe.serves
      ? { recipeYield: `${recipe.serves} servings` }
      : {}),
    recipeIngredient: (recipe.ingredients as Ingredient[]).map(
      (ing) => `${ing.quantity} ${ing.unit} ${ing.name}`
    ),
    recipeInstructions: recipe.method.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step,
    })),
    ...(Number(meal.avg_rating) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(meal.avg_rating).toFixed(1),
            ratingCount: meal.rating_count,
            bestRating: 10,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function MealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comments?: string }>;
}) {
  const { id } = await params;
  const { comments: scrollToCommentsParam } = await searchParams;
  const supabase = await createClient();

  // Get current user (non-blocking — works for anon too)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch meal (cached — shared with generateMetadata)
  const meal = await getMeal(id);
  if (!meal) notFound();

  // Gate: unauthenticated users see the auth modal
  if (!user) {
    return <MealAuthGate />;
  }

  const profile = meal.profiles as unknown as {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    location_city: string | null;
  };

  const isPrivate = meal.visibility === 'private';
  const isMultiPhoto = (meal.image_count ?? 1) > 1;

  // Parallel data fetches
  const [recipeResult, distributionResult, userRatingResult, userRequestResult, venueClaimResult, imagesResult, profileResult] =
    await Promise.all([
      supabase
        .from('recipes')
        .select('*')
        .eq('meal_id', id)
        .maybeSingle(),
      supabase.rpc('get_score_distribution', { p_meal_id: id }),
      user
        ? supabase
            .from('ratings')
            .select('score')
            .eq('meal_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('recipe_requests')
            .select('id')
            .eq('meal_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      meal.venue_mapbox_id
        ? supabase
            .from('restaurant_claims')
            .select('id, claimed_by, profiles!restaurant_claims_claimed_by_fkey(subscription_status, is_restaurant)')
            .eq('venue_mapbox_id', meal.venue_mapbox_id)
            .eq('outreach_status', 'claimed')
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isMultiPhoto
        ? supabase
            .from('meal_images')
            .select('id, meal_id, position, photo_url, photo_blur_hash')
            .eq('meal_id', id)
            .order('position', { ascending: true })
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const recipe = recipeResult.data as Recipe | null;
  const distribution = (distributionResult.data ?? []) as {
    score: number;
    count: number;
  }[];
  const userRating = userRatingResult.data as { score: number } | null;
  const hasRequested = !!userRequestResult.data;
  const isOwnMeal = user?.id === meal.user_id;

  // Check if venue is verified (claimed + active subscription)
  const claimData = venueClaimResult.data as {
    id: string;
    claimed_by: string;
    profiles: { subscription_status: string; is_restaurant: boolean } | null;
  } | null;
  const venueVerified = !!(
    claimData?.profiles?.subscription_status === 'active' &&
    claimData?.profiles?.is_restaurant
  );

  const isAdmin = !!(profileResult.data as { is_admin?: boolean } | null)?.is_admin;
  const mealImages = (imagesResult.data ?? []) as Pick<MealImage, 'id' | 'meal_id' | 'position' | 'photo_url' | 'photo_blur_hash'>[];

  return (
    <>
      {/* JSON-LD for recipe pages */}
      {recipe && meal.recipe_unlocked && (
        <RecipeJsonLd
          meal={meal}
          recipe={recipe}
          authorUsername={profile.username}
        />
      )}

      <div
        className="w-full flex-1 min-h-0 overflow-y-auto"
        style={{
          maxWidth: 960,
          margin: '0 auto',
          backgroundColor: 'var(--bg-primary)',
          minHeight: '100dvh',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 16px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <BackButton />
            {isPrivate && (
              <Lock size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>
          {!isPrivate && <ShareButton mealId={meal.id} title={meal.title} />}
        </div>

        {/* Photo */}
        <div
          className="relative"
          style={{ width: '100%', aspectRatio: '4 / 5' }}
        >
          {isMultiPhoto && mealImages.length > 1 ? (
            <MealDetailCarousel
              images={mealImages}
              alt={`${meal.title} by ${profile.username}`}
            />
          ) : (
            <>
              {meal.photo_blur_hash && (
                <BlurHashCanvas hash={meal.photo_blur_hash} />
              )}
              <Image
                src={meal.photo_url}
                alt={`${meal.title} by ${profile.username}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                priority
              />
            </>
          )}
          {/* Score badge — bottom right of photo */}
          <div className="absolute bottom-4 right-4 z-10">
            <ScoreBadge
              score={Number(meal.avg_rating)}
              visible={meal.rating_count > 0}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 16px 80px' }}>
          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            {meal.title}
          </h1>

          {/* Author row */}
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 4 }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: 'var(--bg-elevated)',
                }}
              />
            )}
            <Link
              href={`/profile/${profile.username}`}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              @{profile.username}
            </Link>
            {(profile.location_city || meal.location_city) && (
              <Link
                href={`/explore/${slugify(profile.location_city || meal.location_city || '')}`}
                className="flex items-center gap-0.5"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <MapPin size={14} strokeWidth={1.5} />
                {profile.location_city || meal.location_city}
              </Link>
            )}
          </div>

          {/* Venue link */}
          {meal.venue_name && meal.venue_mapbox_id && (
            <Link
              href={`/restaurant/${encodeURIComponent(meal.venue_mapbox_id)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
                textDecoration: 'none',
              }}
            >
              <UtensilsCrossed
                size={14}
                strokeWidth={1.5}
                style={{ color: 'var(--accent-primary)' }}
              />
              {venueVerified && <VerifiedBadge size={14} />}
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--accent-primary)',
                }}
              >
                {meal.venue_name}
              </span>
            </Link>
          )}

          {/* Meta row */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 24,
            }}
          >
            {timeAgo(meal.created_at)} &middot; {meal.rating_count} ratings
          </p>

          {/* Cuisine & tags — linked to explore pages */}
          {(meal.cuisine || (meal.tags && meal.tags.length > 0)) && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
              {meal.cuisine && (
                <Link
                  href={`/explore/cuisine/${meal.cuisine}`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--accent-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '4px 12px',
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  {meal.cuisine.charAt(0).toUpperCase() + meal.cuisine.slice(1)}
                </Link>
              )}
              {meal.tags?.map((tag: string) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '4px 12px',
                    borderRadius: 999,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Interactive section */}
          <MealDetailClient
            mealId={meal.id}
            isOwnMeal={isOwnMeal}
            hasRated={!!userRating}
            existingRating={userRating?.score ?? null}
            hasRequested={hasRequested}
            recipeRequestCount={meal.recipe_request_count}
            recipeUnlockThreshold={meal.recipe_unlock_threshold}
            recipeUnlocked={meal.recipe_unlocked}
            recipe={recipe}
            avgRating={Number(meal.avg_rating)}
            ratingCount={meal.rating_count}
            authorUsername={profile.username}
            commentsEnabled={meal.comments_enabled ?? true}
            commentsMuted={meal.comments_muted ?? false}
          />

          {/* Score distribution */}
          <ScoreDistribution
            distribution={distribution}
            totalRatings={meal.rating_count}
          />

          {/* Comments */}
          <CommentsSection
            mealId={meal.id}
            mealAuthorId={meal.user_id}
            commentsEnabled={meal.comments_enabled ?? true}
            commentCount={meal.comment_count ?? 0}
            scrollToComments={scrollToCommentsParam === '1'}
            isOwnMeal={isOwnMeal}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </>
  );
}
