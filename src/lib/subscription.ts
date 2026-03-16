import type { SupabaseClient } from '@supabase/supabase-js';

export function isBusinessActive(plan: string, status: string): boolean {
  return plan === 'business' && status === 'active';
}

export function getPostLimit(plan: string): number {
  return plan === 'business' ? Infinity : 20;
}

interface SubscriptionInfo {
  active: boolean;
  plan: 'free' | 'business';
  stripeCustomerId: string | null;
}

export async function verifyActiveSubscription(
  userId: string,
  supabase: SupabaseClient
): Promise<SubscriptionInfo> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, plan, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return { active: false, plan: 'free', stripeCustomerId: null };
  }

  return {
    active: true,
    plan: profile.plan as 'business',
    stripeCustomerId: profile.stripe_customer_id,
  };
}
