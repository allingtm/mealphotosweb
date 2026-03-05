import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { blockSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = blockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { blocked_id } = parsed.data;

    if (blocked_id === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Insert block
    const { error: blockError } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id });

    if (blockError) {
      if (blockError.code === '23505') {
        return NextResponse.json({ error: 'Already blocked' }, { status: 409 });
      }
      console.error('Block insert error:', blockError);
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }

    // Remove follows in both directions using service role (bypasses RLS)
    const serviceClient = createServiceRoleClient();

    await serviceClient
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', blocked_id);

    await serviceClient
      .from('follows')
      .delete()
      .eq('follower_id', blocked_id)
      .eq('following_id', user.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Block error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
