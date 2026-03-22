import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';

// DELETE /api/businesses/team/invite/[id] — revoke a pending invite (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const serviceClient = createServiceRoleClient();

  // Verify the invite exists and belongs to the current user's business
  const { data: invite } = await serviceClient
    .from('business_team_invites')
    .select('id, business_id, status')
    .eq('id', id)
    .single();

  if (!invite || invite.business_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invite is no longer pending' }, { status: 410 });
  }

  const { error } = await serviceClient
    .from('business_team_invites')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
