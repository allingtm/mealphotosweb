import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MenuManager } from '@/components/menu/MenuManager';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manage Menu' };

export default async function MenuManagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, subscription_status')
    .eq('id', user.id)
    .single();

  let businessId = user.id;

  if (profile?.is_business && profile.subscription_status === 'active') {
    // Owner
  } else {
    // Check for team membership with menu permission
    const { data: membership } = await supabase
      .from('business_team_members')
      .select('business_id, permissions')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) redirect('/me');

    const perms = membership.permissions as { can_manage_menu?: boolean } | null;
    if (!perms?.can_manage_menu) redirect('/me');

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', membership.business_id)
      .single();

    if (!ownerProfile || ownerProfile.subscription_status !== 'active') redirect('/me');

    businessId = membership.business_id;
  }

  const { data: sections } = await supabase
    .from('menu_sections')
    .select('*, menu_items(*)')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true });

  return (
    <MenuManager
      sections={(sections ?? []) as Parameters<typeof MenuManager>[0]['sections']}
    />
  );
}
