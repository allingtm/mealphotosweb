import type { SupabaseClient } from '@supabase/supabase-js';

export interface TeamPermissions {
  can_post_dishes: boolean;
  can_manage_menu: boolean;
}

export interface BusinessContext {
  businessId: string;
  role: 'owner' | 'member';
  permissions: TeamPermissions;
  plan: 'free' | 'business';
  subscriptionStatus: string;
}

const OWNER_PERMISSIONS: TeamPermissions = {
  can_post_dishes: true,
  can_manage_menu: true,
};

/**
 * Resolves the business context for a user.
 * - If the user is a business owner, returns their own profile info.
 * - If the user is a team member, returns the owner's business context with the member's permissions.
 * - Returns null if the user has no business access.
 */
export async function resolveBusinessContext(
  supabase: SupabaseClient,
  userId: string
): Promise<BusinessContext | null> {
  // 1. Check if user is a business owner directly
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, plan, subscription_status')
    .eq('id', userId)
    .single();

  if (profile?.is_business && profile.subscription_status === 'active') {
    return {
      businessId: userId,
      role: 'owner',
      permissions: OWNER_PERMISSIONS,
      plan: profile.plan as 'free' | 'business',
      subscriptionStatus: profile.subscription_status,
    };
  }

  // 2. Check if user is a team member of a business
  const { data: membership } = await supabase
    .from('business_team_members')
    .select('business_id, role, permissions')
    .eq('user_id', userId)
    .single();

  if (!membership) return null;

  // If user is the owner row but subscription isn't active (shouldn't happen normally)
  if (membership.role === 'owner') {
    if (profile?.subscription_status === 'active') {
      return {
        businessId: membership.business_id,
        role: 'owner',
        permissions: OWNER_PERMISSIONS,
        plan: (profile.plan as 'free' | 'business') ?? 'free',
        subscriptionStatus: profile.subscription_status,
      };
    }
    return null;
  }

  // 3. Team member — load the owner's subscription status
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', membership.business_id)
    .single();

  if (!ownerProfile || ownerProfile.subscription_status !== 'active') {
    return null;
  }

  const permissions = membership.permissions as TeamPermissions;

  return {
    businessId: membership.business_id,
    role: 'member',
    permissions: {
      can_post_dishes: permissions?.can_post_dishes ?? true,
      can_manage_menu: permissions?.can_manage_menu ?? false,
    },
    plan: ownerProfile.plan as 'free' | 'business',
    subscriptionStatus: ownerProfile.subscription_status,
  };
}

/** Team member limits by plan */
export const TEAM_MEMBER_LIMITS = {
  basic: 2,
  premium: 5,
} as const;

export function getTeamMemberLimit(plan: string): number {
  if (plan === 'business') return TEAM_MEMBER_LIMITS.premium;
  return TEAM_MEMBER_LIMITS.basic;
}
