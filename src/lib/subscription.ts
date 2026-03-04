import type { SupabaseClient } from '@supabase/supabase-js';

interface SubscriptionInfo {
  active: boolean;
  tier: 'basic' | 'premium' | null;
  stripeCustomerId: string | null;
}

export async function verifyActiveSubscription(
  userId: string,
  supabase: SupabaseClient
): Promise<SubscriptionInfo> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_tier, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return { active: false, tier: null, stripeCustomerId: null };
  }

  return {
    active: true,
    tier: profile.subscription_tier,
    stripeCustomerId: profile.stripe_customer_id,
  };
}
