import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: invitations, error } = await supabase
    .from('private_feed_lists')
    .select(`
      id, owner_id, status, invited_at,
      owner:profiles!private_feed_lists_owner_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('member_id', user.id)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load invitations', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ invitations: invitations ?? [] });
}
