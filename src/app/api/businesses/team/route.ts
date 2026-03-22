import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';
import { teamInviteSchema } from '@/lib/validations/team';
import { getTeamMemberLimit } from '@/lib/team';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// GET /api/businesses/team — list team members + pending invites (owner only)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  // Verify user is a business owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, plan, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business) {
    return NextResponse.json({ error: 'Not a business account' }, { status: 403 });
  }

  // Get team members with profile info
  const serviceClient = createServiceRoleClient();
  const { data: members } = await serviceClient
    .from('business_team_members')
    .select('id, business_id, user_id, role, permissions, created_at')
    .eq('business_id', user.id)
    .order('created_at');

  // Enrich with profile info
  const enrichedMembers = [];
  if (members) {
    for (const member of members) {
      const { data: memberProfile } = await serviceClient
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', member.user_id)
        .single();

      // Get email from auth
      const { data: authData } = await serviceClient.auth.admin.getUserById(member.user_id);

      enrichedMembers.push({
        ...member,
        email: authData?.user?.email ?? null,
        profile: memberProfile,
      });
    }
  }

  // Get pending invites
  const { data: invites } = await serviceClient
    .from('business_team_invites')
    .select('id, email, status, expires_at, created_at')
    .eq('business_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    members: enrichedMembers ?? [],
    invites: invites ?? [],
    limits: {
      max: getTeamMemberLimit(profile.plan),
      current: (members ?? []).filter((m) => m.role !== 'owner').length,
    },
  });
}

// POST /api/businesses/team — invite a team member (owner only)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = teamInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify user is a business owner with active subscription
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, plan, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Business subscription required' }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // Check team member limit
  const { count: memberCount } = await serviceClient
    .from('business_team_members')
    .select('id', { count: 'exact' })
    .eq('business_id', user.id)
    .eq('role', 'member');

  const limit = getTeamMemberLimit(profile.plan);
  if ((memberCount ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Team member limit reached (${limit}). Upgrade your plan for more.` },
      { status: 403 }
    );
  }

  // Check if email belongs to an existing user who is already a team member
  const { data: existingMembers } = await serviceClient
    .from('business_team_members')
    .select('id, user_id')
    .eq('business_id', user.id);

  if (existingMembers) {
    for (const member of existingMembers) {
      const { data: authData } = await serviceClient.auth.admin.getUserById(member.user_id);
      if (authData?.user?.email === parsed.data.email) {
        return NextResponse.json({ error: 'This user is already a team member' }, { status: 409 });
      }
    }
  }

  // Check for existing pending invite
  const { data: pendingInvite } = await serviceClient
    .from('business_team_invites')
    .select('id')
    .eq('business_id', user.id)
    .eq('email', parsed.data.email)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInvite) {
    return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 409 });
  }

  // Create invite
  const { data: invite, error: inviteError } = await serviceClient
    .from('business_team_invites')
    .insert({
      business_id: user.id,
      email: parsed.data.email,
      invited_by: user.id,
    })
    .select('id, token')
    .single();

  if (inviteError) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }

  // Get business name for the email
  const { data: bizProfile } = await serviceClient
    .from('business_profiles')
    .select('business_name')
    .eq('id', user.id)
    .single();

  const businessName = bizProfile?.business_name ?? 'A business';
  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://meal.photos'}/team/join?token=${invite.token}`;

  // Send invite email via Resend
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'meal.photos <noreply@meal.photos>',
          to: parsed.data.email,
          subject: `You've been invited to join ${businessName} on meal.photos`,
          html: `
            <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #121212; color: #F5F0E8;">
              <h1 style="font-family: 'Instrument Serif', serif; color: #E8A838; font-size: 28px; margin-bottom: 16px;">You're Invited!</h1>
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 8px;"><strong>${businessName}</strong> has invited you to join their team on meal.photos.</p>
              <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">As a team member, you'll be able to post dishes and help manage their presence on the platform.</p>
              <a href="${joinUrl}" style="display: inline-block; background: #E8A838; color: #121212; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invite</a>
              <p style="font-size: 12px; color: #888888; margin-top: 32px;">This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error('Failed to send team invite email:', err);
    }
  }

  return NextResponse.json({ invite: { id: invite.id } }, { status: 201 });
}
