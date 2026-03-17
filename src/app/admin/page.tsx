import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { AdminTabs } from '@/components/admin/AdminTabs';

export const metadata: Metadata = {
  title: 'Admin | meal.photos',
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

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

  // Use service role client for admin queries (bypasses RLS)
  const serviceClient = createServiceRoleClient();

  // Parallel data fetches
  const [moderationResult, reportsResult, disputesResult, membersCountResult, contactCountResult, inviteCodesCountResult] = await Promise.all([
    serviceClient
      .from('meal_moderation')
      .select('id, meal_id, status, moderation_labels, cloud_vision_checked, created_at, meals(title, photo_url, user_id, profiles(username, moderation_tier))')
      .in('status', ['manual_review', 'pending'])
      .order('created_at', { ascending: true })
      .limit(50),
    serviceClient
      .from('reports')
      .select('id, reason, priority, detail, status, created_at, reported_meal_id, reported_user_id, reported_comment_id, comments(text, user_id, profiles(username))')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(50),
    serviceClient
      .from('venue_disputes')
      .select('id, meal_id, venue_mapbox_id, reason, detail, status, created_at, restaurant_profile_id, meals(title, photo_url, venue_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50),
    serviceClient
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    serviceClient
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    serviceClient
      .from('invite_codes')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  const moderationQueue = (moderationResult.data ?? []) as unknown as Array<{
    id: string;
    meal_id: string;
    status: string;
    moderation_labels: Record<string, unknown>;
    cloud_vision_checked: boolean;
    created_at: string;
    meals: {
      title: string;
      photo_url: string;
      user_id: string;
      profiles: { username: string; moderation_tier: string } | null;
    } | null;
  }>;

  const reports = (reportsResult.data ?? []) as unknown as Array<{
    id: string;
    reason: string;
    priority: string;
    detail: string | null;
    status: string;
    created_at: string;
    reported_meal_id: string | null;
    reported_user_id: string | null;
    reported_comment_id: string | null;
    comments: {
      text: string;
      user_id: string;
      profiles: { username: string } | null;
    } | null;
  }>;

  // Enrich disputes with restaurant username and dispute stats
  const rawDisputes = (disputesResult.data ?? []) as unknown as Array<{
    id: string;
    meal_id: string;
    venue_mapbox_id: string;
    reason: string;
    detail: string | null;
    status: string;
    created_at: string;
    restaurant_profile_id: string;
    meals: { title: string; photo_url: string; venue_name: string | null } | null;
  }>;

  const disputes = await Promise.all(
    rawDisputes.map(async (d) => {
      const [profileResult, statsResult] = await Promise.all([
        serviceClient
          .from('profiles')
          .select('username')
          .eq('id', d.restaurant_profile_id)
          .single(),
        serviceClient
          .from('venue_disputes')
          .select('status')
          .eq('restaurant_profile_id', d.restaurant_profile_id),
      ]);

      const allDisputes = statsResult.data ?? [];
      const stats = {
        total: allDisputes.length,
        upheld: allDisputes.filter((x: { status: string }) => x.status === 'upheld').length,
        dismissed: allDisputes.filter((x: { status: string }) => x.status === 'dismissed').length,
      };

      return {
        ...d,
        restaurant_username: profileResult.data?.username ?? null,
        dispute_stats: stats,
      };
    })
  );

  // Counts
  const counts = {
    moderation: moderationQueue.length,
    reports: reports.length,
    disputes: disputes.length,
    urgentReports: reports.filter((r) => r.priority === 'urgent').length,
    members: membersCountResult.count ?? 0,
    contact: contactCountResult.count ?? 0,
    inviteCodes: inviteCodesCountResult.count ?? 0,
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
          }}
        >
          Admin
        </h1>
      </div>

      <AdminTabs
        initialTab={tab ?? 'overview'}
        moderationQueue={moderationQueue}
        reports={reports}
        disputes={disputes}
        counts={counts}
      />
    </div>
  );
}
