import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { MemberDetail } from '@/components/admin/MemberDetail';

export const metadata: Metadata = {
  title: 'Member Detail | Admin | meal.photos',
  robots: { index: false, follow: false },
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) notFound();

  // Fetch member via service role
  const serviceClient = createServiceRoleClient();

  const [profileResult, mealStatsResult] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, location_city, location_country, is_admin, is_restaurant, banned_at, suspended_until, ban_reason, created_at, updated_at')
      .eq('id', id)
      .single(),
    serviceClient
      .from('meals')
      .select('avg_rating', { count: 'exact' })
      .eq('user_id', id),
  ]);

  if (profileResult.error || !profileResult.data) notFound();

  const meals = mealStatsResult.data ?? [];
  const mealCount = mealStatsResult.count ?? 0;
  const avgRating = mealCount > 0
    ? meals.reduce((sum, m) => sum + (m.avg_rating ?? 0), 0) / mealCount
    : 0;

  const member = profileResult.data as {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    location_city: string | null;
    location_country: string | null;
    is_admin: boolean;
    is_restaurant: boolean;
    banned_at: string | null;
    suspended_until: string | null;
    ban_reason: string | null;
    created_at: string;
    updated_at: string;
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <MemberDetail
        member={member}
        stats={{ meal_count: mealCount, avg_rating: Math.round(avgRating * 10) / 10 }}
        currentAdminId={user.id}
      />
    </div>
  );
}
