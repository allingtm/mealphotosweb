import { createClient } from '@/lib/supabase/server';
import { BusinessDashboard } from '@/components/business/BusinessDashboard';
import { ConsumerProfile } from '@/components/profile/ConsumerProfile';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Me' };

export default async function MePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <UnauthenticatedState />;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url, location_city, is_business, plan, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile) return <UnauthenticatedState />;

  if (profile.is_business && profile.subscription_status === 'active') {
    return <BusinessDashboard userId={user.id} />;
  }

  return (
    <ConsumerProfile
      userId={user.id}
      username={profile.username}
      avatarUrl={profile.avatar_url}
      locationCity={profile.location_city}
    />
  );
}

function UnauthenticatedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
        Sign in to see your profile
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
        Browse dishes, save favourites, and follow businesses.
      </p>
    </div>
  );
}
