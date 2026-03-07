import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH: Accept or decline an invitation
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    // Verify the invitation exists and belongs to this user as member
    const { data: invitation } = await supabase
      .from('private_feed_lists')
      .select('id, owner_id, member_id, status')
      .eq('id', id)
      .eq('member_id', user.id)
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already responded to' }, { status: 409 });
    }

    if (action === 'accept') {
      const { error } = await supabase
        .from('private_feed_lists')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Private feed accept error:', error);
        return NextResponse.json(
          { error: 'Failed to accept invitation' },
          { status: 500 }
        );
      }

      // Notify the owner
      const { data: memberProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      await supabase.from('notifications').insert({
        user_id: invitation.owner_id,
        type: 'private_feed_invite_accepted',
        title: `@${memberProfile?.username} accepted your private feed invitation`,
        body: null,
        data: { member_id: user.id, invitation_id: id },
      });

      return NextResponse.json({ status: 'accepted' });
    } else {
      // Decline: silently delete the row, no notification
      await supabase
        .from('private_feed_lists')
        .delete()
        .eq('id', id);

      return NextResponse.json({ status: 'declined' });
    }
  } catch (err) {
    console.error('Private feed list respond error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE: Remove member (owner) or leave (member)
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the entry exists and the user is either owner or member
    const { data: entry } = await supabase
      .from('private_feed_lists')
      .select('id, owner_id, member_id')
      .eq('id', id)
      .single();

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.owner_id !== user.id && entry.member_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete silently - no notification for either remove or leave
    const { error } = await supabase
      .from('private_feed_lists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Private feed list remove error:', error);
      return NextResponse.json(
        { error: 'Failed to remove entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'removed' });
  } catch (err) {
    console.error('Private feed list delete error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
