import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PostDishForm } from '@/components/post/PostDishForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Post a Dish' };

export default async function PostDishPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, plan, subscription_status')
    .eq('id', user.id)
    .single();

  // Direct business owner
  let businessId = user.id;
  let plan = profile?.plan ?? 'free';

  if (profile?.is_business && profile.subscription_status === 'active') {
    // Owner — use their own ID
  } else {
    // Check if user is a team member
    const { data: membership } = await supabase
      .from('business_team_members')
      .select('business_id, permissions')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) redirect('/me');

    const perms = membership.permissions as { can_post_dishes?: boolean } | null;
    if (!perms?.can_post_dishes) redirect('/me');

    // Verify owner's subscription
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', membership.business_id)
      .single();

    if (!ownerProfile || ownerProfile.subscription_status !== 'active') redirect('/me');

    businessId = membership.business_id;
    plan = ownerProfile.plan;
  }

  // Fetch menu items for optional linking
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, section_id, menu_sections(name)')
    .eq('business_id', businessId)
    .eq('available', true)
    .order('sort_order', { ascending: true });

  return (
    <PostDishForm
      plan={plan}
      menuItems={(menuItems ?? []) as { id: string; name: string; section_id: string; menu_sections: { name: string } | { name: string }[] | null }[]}
    />
  );
}
