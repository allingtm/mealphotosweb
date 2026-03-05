import { redirect, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils/time';
import { ScoreBadge } from '@/components/feed/ScoreBadge';
import { BlurHashCanvas } from '@/components/feed/BlurHashCanvas';
import { MealEditForm } from '@/components/meal/MealEditForm';
import type { Meal } from '@/types/database';

export default async function MyMealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const meal = data as Meal;

  // Not the owner — redirect to public detail page
  if (meal.user_id !== user.id) {
    redirect(`/meal/${id}`);
  }

  // Build venue data for form
  const initialVenue = meal.venue_name
    ? {
        name: meal.venue_name,
        mapbox_id: meal.venue_mapbox_id ?? undefined,
        address: meal.venue_address ?? undefined,
      }
    : null;

  // Parse location from PostGIS point if available
  // The `location` field comes back as a string like "POINT(lng lat)" or as a GeoJSON object
  let initialLocation: { lat: number; lng: number } | null = null;
  if (meal.location) {
    const loc = meal.location as unknown;
    if (typeof loc === 'string') {
      const match = loc.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        initialLocation = { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
      }
    } else if (typeof loc === 'object' && loc !== null && 'coordinates' in loc) {
      const coords = (loc as { coordinates: [number, number] }).coordinates;
      initialLocation = { lng: coords[0], lat: coords[1] };
    }
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <Link
          href="/my-meals"
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-full)',
          }}
          aria-label="Back to my meals"
        >
          <ArrowLeft size={24} strokeWidth={1.5} color="var(--text-primary)" />
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--accent-primary)',
            margin: 0,
          }}
        >
          Edit Meal
        </h1>
      </div>

      {/* Photo */}
      <div
        className="relative"
        style={{ width: '100%', aspectRatio: '4 / 5' }}
      >
        {meal.photo_blur_hash && (
          <BlurHashCanvas hash={meal.photo_blur_hash} />
        )}
        <Image
          src={meal.photo_url}
          alt={meal.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 640px"
          priority
        />
        {/* Score badge */}
        <div className="absolute bottom-4 right-4 z-10">
          <ScoreBadge
            score={Number(meal.avg_rating)}
            visible={meal.rating_count > 0}
          />
        </div>
      </div>

      {/* Meta info */}
      <div style={{ padding: '12px 16px 0' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 16,
          }}
        >
          {timeAgo(meal.created_at)} &middot; {meal.rating_count} ratings
        </p>
      </div>

      {/* Edit form */}
      <div style={{ padding: '0 16px 32px' }}>
        <MealEditForm
          mealId={meal.id}
          initialTitle={meal.title}
          initialCuisine={meal.cuisine}
          initialTags={meal.tags ?? []}
          initialVenue={initialVenue}
          initialLocation={initialLocation}
          initialLocationCity={meal.location_city}
          initialLocationCountry={meal.location_country}
        />
      </div>
    </div>
  );
}
