import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';
import { teamAcceptSchema } from '@/lib/validations/team';

// POST /api/businesses/team/accept — accept a team invite
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = teamAcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Look up the invite by token
  const { data: invite } = await serviceClient
    .from('business_team_invites')
    .select('id, business_id, email, status, expires_at')
    .eq('token', parsed.data.token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been used or revoked' }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  // Check user isn't already a business owner
  const { data: userProfile } = await serviceClient
    .from('profiles')
    .select('is_business')
    .eq('id', user.id)
    .single();

  if (userProfile?.is_business) {
    return NextResponse.json(
      { error: 'You already have your own business account. Please use a different account to join as a team member.' },
      { status: 409 }
    );
  }

  // Check user isn't already a member of another business
  const { data: existingMembership } = await serviceClient
    .from('business_team_members')
    .select('id, business_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership) {
    return NextResponse.json(
      { error: 'You are already a member of another business. Please leave that team first.' },
      { status: 409 }
    );
  }

  // Create the team membership
  const { error: memberError } = await serviceClient
    .from('business_team_members')
    .insert({
      business_id: invite.business_id,
      user_id: user.id,
      role: 'member',
      permissions: { can_post_dishes: true, can_manage_menu: false },
      invited_by: user.id,
      terms_accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }

  // Mark invite as accepted
  await serviceClient
    .from('business_team_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  // Get business name for the response
  const { data: bizProfile } = await serviceClient
    .from('business_profiles')
    .select('business_name')
    .eq('id', invite.business_id)
    .single();

  return NextResponse.json({
    success: true,
    business_name: bizProfile?.business_name ?? null,
    business_id: invite.business_id,
  });
}
