import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  // Check premise limit before reactivation
  const { data: profile } = await supabase
    .from('profiles')
    .select('max_premises')
    .eq('id', user.id)
    .single();

  const { count: activeCount } = await supabase
    .from('business_premises')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('is_active', true);

  if ((activeCount ?? 0) >= (profile?.max_premises ?? 5)) {
    return NextResponse.json({ error: 'Premise limit reached. Deactivate another premise first.' }, { status: 429 });
  }

  const { error } = await supabase
    .from('business_premises')
    .update({ is_active: true })
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
