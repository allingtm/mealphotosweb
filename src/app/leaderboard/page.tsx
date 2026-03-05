import { createClient } from '@/lib/supabase/server';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { AppBar } from '@/components/layout/AppBar';
import type { LeaderboardEntry } from '@/types/database';

export const metadata = {
  title: 'Leaderboard | meal.photos',
  description: 'See who is cooking the highest-rated meals on meal.photos',
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch initial leaderboard + user profile in parallel
  const [leaderboardResult, profileResult] = await Promise.all([
    supabase.rpc('get_leaderboard', {
      p_scope: 'global',
      p_time_range: 'week',
      p_cuisine: null,
      p_country: null,
      p_city: null,
      p_limit: 50,
      p_offset: 0,
    }),
    user
      ? supabase.from('profiles').select('location_city, location_country').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const entries = (leaderboardResult.data ?? []) as LeaderboardEntry[];
  const userProfile = profileResult.data as {
    location_city: string | null;
    location_country: string | null;
  } | null;

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
      <AppBar />

      <LeaderboardClient
        initialEntries={entries}
        currentUserId={user?.id ?? null}
        userCountry={userProfile?.location_country ?? null}
        userCity={userProfile?.location_city ?? null}
      />
    </div>
  );
}
