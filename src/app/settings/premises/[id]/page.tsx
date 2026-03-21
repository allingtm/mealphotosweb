import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PremiseFormClient } from '@/components/business/PremiseFormClient';
import type { BusinessPremise } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Edit Premise' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PremiseEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: premise } = await supabase
    .from('business_premises')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!premise) notFound();

  return <PremiseFormClient mode="edit" premise={premise as BusinessPremise} />;
}
