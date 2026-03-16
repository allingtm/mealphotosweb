import type { SupabaseClient } from '@supabase/supabase-js';

export function isBusinessActive(plan: string, status: string): boolean {
  return (plan === 'basic' || plan === 'premium') && status === 'active';
}

export function isPremium(plan: string): boolean {
  return plan === 'premium';
}

export function getPostLimit(plan: string): number {
  return plan === 'premium' ? Infinity : 20;
}

interface SubscriptionInfo {
  active: boolean;
  plan: 'free' | 'basic' | 'premium';
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
    plan: profile.plan as 'basic' | 'premium',
    stripeCustomerId: profile.stripe_customer_id,
  };
}
