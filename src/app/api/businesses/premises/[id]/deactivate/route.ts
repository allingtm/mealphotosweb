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

  // Verify ownership
  const { data: premise } = await supabase
    .from('business_premises')
    .select('id, is_active')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!premise) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!premise.is_active) {
    return NextResponse.json({ error: 'Premise is already inactive' }, { status: 400 });
  }

  // Check this is not the last active premise
  const { count } = await supabase
    .from('business_premises')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('is_active', true);

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: 'Cannot deactivate your only active premise' }, { status: 400 });
  }

  const { error } = await supabase
    .from('business_premises')
    .update({ is_active: false })
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
