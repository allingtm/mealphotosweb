import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import type { Profile, Meal } from '@/types/database';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed');
  }

  // Fetch own profile, meals, and saved meals in parallel
  const [profileResult, mealsResult, savedResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('meals')
      .select('id, photo_url, avg_rating, rating_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('recipe_requests')
      .select('meal_id, meals!recipe_requests_meal_id_fkey(id, photo_url, avg_rating, rating_count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const profile = profileResult.data as Profile;
  const meals = (mealsResult.data ?? []) as Pick<Meal, 'id' | 'photo_url' | 'avg_rating' | 'rating_count'>[];

  // Extract saved meals from the join result
  const savedMeals = (savedResult.data ?? [])
    .map((r) => {
      const meal = r.meals as unknown as { id: string; photo_url: string; avg_rating: number; rating_count: number } | null;
      return meal;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // Compute stats from the data we already have
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
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          location_city: profile.location_city,
          location_country: profile.location_country,
        }}
        isOwnProfile
      />
      <div style={{ padding: '0 16px' }}>
        <StatsRow
          mealCount={mealCount}
          avgRating={Number(avgRating.toFixed(1))}
          streak={profile.streak_current}
        />
      </div>
      <ProfileTabs meals={meals} savedMeals={savedMeals} showSavedTab />
    </div>
  );
}
