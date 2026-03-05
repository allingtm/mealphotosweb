import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) {
      console.error('Unblock error:', error);
      return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unblock error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
