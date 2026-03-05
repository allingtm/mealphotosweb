import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { StatsRow } from '@/components/profile/StatsRow';
import type { Meal } from '@/types/database';

export default async function MyMealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch profile (for streak), meals, and saved meals in parallel
  const [profileResult, mealsResult, savedResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('streak_current')
      .eq('id', user.id)
      .single(),
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

  const meals = (mealsResult.data ?? []) as Pick<Meal, 'id' | 'photo_url' | 'avg_rating' | 'rating_count'>[];

  // Extract saved meals from the join result
  const savedMeals = (savedResult.data ?? [])
    .map((r) => {
      const meal = r.meals as unknown as { id: string; photo_url: string; avg_rating: number; rating_count: number } | null;
      return meal;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

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
      <div style={{ padding: '0 16px', paddingTop: 16 }}>
        <StatsRow
          mealCount={mealCount}
          avgRating={Number(avgRating.toFixed(1))}
          streak={profileResult.data?.streak_current ?? 0}
        />
      </div>
      <ProfileTabs meals={meals} savedMeals={savedMeals} showSavedTab />
    </div>
  );
}
