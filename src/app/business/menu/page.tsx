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

  if (!profile?.is_business || profile.subscription_status !== 'active') redirect('/me');

  const { data: sections } = await supabase
    .from('menu_sections')
    .select('*, menu_items(*)')
    .eq('business_id', user.id)
    .order('sort_order', { ascending: true });

  return (
    <MenuManager
      sections={(sections ?? []) as Parameters<typeof MenuManager>[0]['sections']}
    />
  );
}
