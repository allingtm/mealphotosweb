import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TeamManager } from '@/components/business/TeamManager';
import { BackButton } from '@/components/ui/BackButton';

export const metadata = {
  title: 'Team — meal.photos',
};

export default async function TeamPage() {
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

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <BackButton />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
          }}
        >
          Team
        </h1>
      </div>
      <TeamManager />
    </div>
  );
}
