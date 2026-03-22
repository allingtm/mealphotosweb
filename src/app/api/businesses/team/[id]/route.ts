import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';
import { teamUpdatePermissionsSchema } from '@/lib/validations/team';

// PATCH /api/businesses/team/[id] — update member permissions (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = teamUpdatePermissionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Verify the member exists and belongs to the current user's business
  const { data: member } = await serviceClient
    .from('business_team_members')
    .select('id, business_id, role')
    .eq('id', id)
    .single();

  if (!member || member.business_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot modify owner permissions' }, { status: 403 });
  }

  const { error } = await serviceClient
    .from('business_team_members')
    .update({ permissions: parsed.data.permissions })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/businesses/team/[id] — remove team member (owner only)
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

  // Verify the member exists and belongs to the current user's business
  const { data: member } = await serviceClient
    .from('business_team_members')
    .select('id, business_id, role, user_id')
    .eq('id', id)
    .single();

  if (!member || member.business_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the business owner' }, { status: 403 });
  }

  const { error } = await serviceClient
    .from('business_team_members')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
