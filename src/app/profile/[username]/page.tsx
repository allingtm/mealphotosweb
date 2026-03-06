import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StatsRow } from '@/components/profile/StatsRow';
import { BadgeRow } from '@/components/profile/BadgeRow';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ProfileViewTracker } from '@/components/profile/ProfileViewTracker';
import type { PublicProfile, UserBadge, ProfileStats } from '@/types/database';

interface Props {
  params: Promise<{ username: string }>;
}

const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .rpc('get_public_profile', { lookup_username: username })
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
    description: profile.bio
      ? `${profile.bio} — ${name} on meal.photos`
      : `Check out ${name}'s meals on meal.photos`,
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

  // Check if viewing own profile — redirect to /profile for full experience
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.id === profile.id) {
    redirect('/profile');
  }

  // Fetch stats, badges, initial meals, and follow state in parallel
  const [statsRes, badgesRes, mealsRes, followRes] = await Promise.all([
    supabase.rpc('get_profile_stats', { profile_id: profile.id }).single(),
    supabase.from('user_badges').select('*').eq('user_id', profile.id).order('awarded_at', { ascending: false }),
    supabase
      .from('meals')
      .select('id, photo_url, avg_rating, rating_count, created_at, meal_moderation!inner(status)')
      .eq('user_id', profile.id)
      .eq('meal_moderation.status', 'approved')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(18),
    user
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const stats = (statsRes.data as ProfileStats) ?? { meal_count: 0, avg_rating: 0, ratings_given_count: 0 };
  const badges = (badgesRes.data ?? []) as UserBadge[];
  const meals = (mealsRes.data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    photo_url: m.photo_url as string,
    avg_rating: m.avg_rating as number,
    rating_count: m.rating_count as number,
    created_at: m.created_at as string,
  }));
  const isFollowing = !!followRes.data;

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
      <ProfileViewTracker
        username={profile.username}
        isRestaurant={profile.is_restaurant}
      />
      <ProfileHeader
        profile={{
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          location_city: profile.location_city,
          location_country: profile.location_country,
          is_restaurant: profile.is_restaurant,
          subscription_status: profile.subscription_status,
          show_location: profile.show_location,
          show_streak: profile.show_streak,
          follower_count: profile.follower_count,
          following_count: profile.following_count,
        }}
        isOwnProfile={false}
        isFollowing={isFollowing}
      />
      <div style={{ padding: '0 16px' }}>
        <StatsRow
          mealCount={Number(stats.meal_count)}
          avgRating={Number(stats.avg_rating ?? 0)}
          streak={profile.streak_current ?? 0}
          ratingsGivenCount={Number(stats.ratings_given_count)}
          isRestaurant={profile.is_restaurant}
          showStreak={profile.show_streak}
        />
      </div>
      <BadgeRow badges={badges} />
      <ProfileTabs
        meals={meals}
        isRestaurant={profile.is_restaurant}
        username={profile.username}
      />
    </div>
  );
}
