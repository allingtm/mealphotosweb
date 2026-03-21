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
  const [moderationResult, reportsResult, membersCountResult, contactCountResult, inviteCodesCountResult, blogCountResult] = await Promise.all([
    serviceClient
      .from('dish_moderation')
      .select('id, dish_id, status, moderation_labels, created_at, dishes(title, photo_url, business_id)')
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
    serviceClient
      .from('blog_posts')
      .select('id', { count: 'exact', head: true }),
  ]);

  const moderationQueue = (moderationResult.data ?? []) as unknown as Array<{
    id: string;
    dish_id: string;
    status: string;
    moderation_labels: Record<string, unknown>;
    created_at: string;
    dishes: {
      title: string;
      photo_url: string;
      business_id: string;
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

  // Counts
  const counts = {
    moderation: moderationQueue.length,
    reports: reports.length,
    urgentReports: reports.filter((r) => r.priority === 'urgent').length,
    members: membersCountResult.count ?? 0,
    contact: contactCountResult.count ?? 0,
    inviteCodes: inviteCodesCountResult.count ?? 0,
    blogPosts: blogCountResult.count ?? 0,
  };

  return (
    <div
      className="md:overflow-y-auto md:flex-1 md:min-h-0"
      style={{
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
        counts={counts}
      />
    </div>
  );
}
