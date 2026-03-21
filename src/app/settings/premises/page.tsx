import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PremisesListClient } from '@/components/business/PremisesListClient';
import type { BusinessPremise } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Manage Premises' };

export default async function PremisesListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, subscription_status, max_premises')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business || profile.subscription_status !== 'active') {
    redirect('/me');
  }

  const { data: premises } = await supabase
    .from('business_premises')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <PremisesListClient
      premises={(premises ?? []) as BusinessPremise[]}
      maxPremises={profile.max_premises ?? 5}
    />
  );
}
