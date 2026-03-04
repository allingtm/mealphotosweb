import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import type { PublicProfile, Meal } from '@/types/database';

interface Props {
  params: Promise<{ username: string }>;
}

const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('username', username)
    .single();
  return data as PublicProfile | null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);

  if (!profile) {
    return { title: 'User not found | meal.photos' };
  }

  const name = profile.display_name || `@${profile.username}`;
  return {
    title: `${name} | meal.photos`,
    description: `Check out ${name}'s meals on meal.photos`,
    openGraph: {
      title: `${name} on meal.photos`,
      url: `https://meal.photos/profile/${profile.username}`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const { data: mealsData } = await supabase
    .from('meals')
    .select('id, photo_url, avg_rating, rating_count')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  const meals = (mealsData ?? []) as Pick<Meal, 'id' | 'photo_url' | 'avg_rating' | 'rating_count'>[];

  // Compute stats
  const mealCount = meals.length;
  const ratedMeals = meals.filter((m) => m.rating_count > 0);
  const avgRating =
    ratedMeals.length > 0
      ? ratedMeals.reduce((sum, m) => sum + Number(m.avg_rating), 0) / ratedMeals.length
      : 0;

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        paddingBottom: 72,
      }}
    >
      <ProfileHeader
        profile={{
          username: profile.username,
          display_name: profile.display_name,
          bio: null,
          avatar_url: profile.avatar_url,
          location_city: profile.location_city,
          location_country: profile.location_country,
        }}
        isOwnProfile={false}
      />
      <div style={{ padding: '0 16px' }}>
        <StatsRow
          mealCount={mealCount}
          avgRating={Number(avgRating.toFixed(1))}
          streak={profile.streak_current}
        />
      </div>
      <ProfileTabs meals={meals} />
    </div>
  );
}
