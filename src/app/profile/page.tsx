import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { BadgeRow } from '@/components/profile/BadgeRow';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import type { Profile, UserBadge, ProfileStats } from '@/types/database';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch profile, stats, badges, meals, and saved meals in parallel
  const [profileRes, statsRes, badgesRes, mealsRes, savedRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.rpc('get_profile_stats', { profile_id: user.id }).single(),
    supabase.from('user_badges').select('*').eq('user_id', user.id).order('awarded_at', { ascending: false }),
    supabase
      .from('meals')
      .select('id, photo_url, avg_rating, rating_count, created_at, meal_moderation!inner(status)')
      .eq('user_id', user.id)
      .eq('meal_moderation.status', 'approved')
      .order('created_at', { ascending: false })
      .limit(18),
    supabase
      .from('recipe_requests')
      .select('meal:meals!inner(id, photo_url, avg_rating, rating_count, created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(18),
  ]);

  const p = profileRes.data as Profile;
  const stats = (statsRes.data as ProfileStats) ?? { meal_count: 0, avg_rating: 0, ratings_given_count: 0 };
  const badges = (badgesRes.data ?? []) as UserBadge[];
  const meals = (mealsRes.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    photo_url: m.photo_url as string,
    avg_rating: m.avg_rating as number,
    rating_count: m.rating_count as number,
    created_at: m.created_at as string,
  }));
  const savedMeals = (savedRes.data ?? []).map((r: Record<string, unknown>) => {
    const meal = r.meal as Record<string, unknown>;
    return {
      id: meal.id as string,
      photo_url: meal.photo_url as string,
      avg_rating: meal.avg_rating as number,
      rating_count: meal.rating_count as number,
      created_at: meal.created_at as string,
    };
  });

  return (
    <div
      className="w-full flex-1 min-h-0 overflow-y-auto"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        paddingBottom: 72,
      }}
    >
      <ProfileHeader
        profile={{
          id: p.id,
          username: p.username,
          display_name: p.display_name,
          bio: p.bio,
          avatar_url: p.avatar_url,
          location_city: p.location_city,
          location_country: p.location_country,
          is_restaurant: p.is_restaurant,
          subscription_status: p.subscription_status,
          show_location: p.show_location,
          show_streak: p.show_streak,
          follower_count: p.follower_count,
          following_count: p.following_count,
        }}
        isOwnProfile
      />
      <div style={{ padding: '0 16px' }}>
        <StatsRow
          mealCount={Number(stats.meal_count)}
          avgRating={Number(stats.avg_rating ?? 0)}
          streak={p.streak_current}
          ratingsGivenCount={Number(stats.ratings_given_count)}
          isRestaurant={p.is_restaurant}
          showStreak={p.show_streak}
        />
      </div>
      <BadgeRow badges={badges} />
      <ProfileTabs
        meals={meals}
        savedMeals={savedMeals}
        showSavedTab
        authorView
        isRestaurant={p.is_restaurant}
        username={p.username}
      />
    </div>
  );
}
