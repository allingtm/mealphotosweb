import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/business/DashboardClient';
import type { BusinessType } from '@/types/database';

interface PageProps {
  searchParams: Promise<{ session_id?: string; toast?: string }>;
}

export default async function RestaurantDashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/pricing');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, is_restaurant, subscription_tier, subscription_status, business_type, plan')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_restaurant || profile.subscription_status !== 'active') {
    redirect('/pricing');
  }

  // Fetch business profile if exists
  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('business_type, business_name')
    .eq('id', user.id)
    .single();

  const { data: meals } = await supabase
    .from('meals')
    .select('id, title, photo_url, avg_rating, rating_count, restaurant_revealed')
    .eq('user_id', user.id)
    .eq('is_restaurant_meal', true)
    .order('created_at', { ascending: false });

  const params = await searchParams;
  const showWelcome = !!params.session_id;

  return (
    <DashboardClient
      profile={{
        username: profile.username,
        display_name: profile.display_name,
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        is_restaurant: profile.is_restaurant,
        business_type: (businessProfile?.business_type ?? profile.business_type ?? null) as BusinessType | null,
        business_name: businessProfile?.business_name ?? null,
      }}
      meals={meals ?? []}
      showWelcome={showWelcome}
    />
  );
}
