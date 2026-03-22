import { createClient } from '@/lib/supabase/server';
import { BusinessDashboard } from '@/components/business/BusinessDashboard';
import { ConsumerProfile } from '@/components/profile/ConsumerProfile';
import { UnauthenticatedState } from '@/components/profile/UnauthenticatedState';
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
    return <BusinessDashboard userId={user.id} username={profile.username} />;
  }

  // Check if user is a team member of a business
  const { data: membership } = await supabase
    .from('business_team_members')
    .select('business_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership) {
    // Load the owner's profile to check subscription + get username
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('username, subscription_status')
      .eq('id', membership.business_id)
      .single();

    if (ownerProfile?.subscription_status === 'active') {
      return <BusinessDashboard userId={user.id} username={ownerProfile.username} />;
    }
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
