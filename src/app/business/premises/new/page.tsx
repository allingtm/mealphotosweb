import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PremiseFormClient } from '@/components/business/PremiseFormClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Add Premise' };

export default async function NewPremisePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business || profile.subscription_status !== 'active') {
    redirect('/me');
  }

  return <PremiseFormClient mode="create" />;
}
