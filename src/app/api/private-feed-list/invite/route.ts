import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inviteSchema } from '@/lib/validations';

const PLAN_LIMITS: Record<string, number> = { free: 5, personal: 25, business: 100 };

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { member_id } = parsed.data;

    // Cannot invite yourself
    if (member_id === user.id) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check the member exists
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', member_id)
      .single();

    if (!memberProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check not blocked
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${member_id}),and(blocker_id.eq.${member_id},blocked_id.eq.${user.id})`)
      .limit(1);

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: 'Cannot invite this user' }, { status: 403 });
    }

    // Check plan-based member limit (count pending + accepted)
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, username')
      .eq('id', user.id)
      .single();

    const plan = profile?.plan ?? 'free';
    const maxMembers = PLAN_LIMITS[plan] ?? 5;

    const { count } = await supabase
      .from('private_feed_lists')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .in('status', ['pending', 'accepted']);

    if ((count ?? 0) >= maxMembers) {
      const upgradeMessage = plan === 'free'
        ? 'Upgrade to Personal to invite more than 5 members'
        : `You've reached your ${maxMembers} member limit`;
      return NextResponse.json({ error: upgradeMessage }, { status: 403 });
    }

    // Insert invitation
    const { data: invitation, error: insertError } = await supabase
      .from('private_feed_lists')
      .insert({
        owner_id: user.id,
        member_id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'User already invited' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Failed to send invitation', details: insertError.message },
        { status: 500 }
      );
    }

    // Send notification to invited user
    await supabase.from('notifications').insert({
      user_id: member_id,
      type: 'private_feed_invite',
      title: `@${profile?.username} invited you to see their private meals`,
      body: null,
      data: { owner_id: user.id, invitation_id: invitation.id },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    console.error('Private feed list invite error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
