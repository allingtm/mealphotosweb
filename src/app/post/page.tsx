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

  if (!profile?.is_business || profile.subscription_status !== 'active') redirect('/me');

  // Fetch menu items for optional linking
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, section_id, menu_sections(name)')
    .eq('business_id', user.id)
    .eq('available', true)
    .order('sort_order', { ascending: true });

  return (
    <PostDishForm
      plan={profile.plan}
      menuItems={(menuItems ?? []) as { id: string; name: string; section_id: string; menu_sections: { name: string } | { name: string }[] | null }[]}
    />
  );
}
