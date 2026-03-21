import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BusinessProfileEditClient } from '@/components/business/BusinessProfileEditClient';
import type { BusinessProfile } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Edit Business Profile' };

export default async function BusinessProfileEditPage() {
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

  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!businessProfile) redirect('/me');

  return <BusinessProfileEditClient profile={businessProfile as BusinessProfile} />;
}
