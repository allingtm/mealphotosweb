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

  // Get user's plan for limit info
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const limits: Record<string, number> = { free: 5, personal: 25, business: 100 };
  const maxMembers = limits[profile?.plan ?? 'free'] ?? 5;

  // Fetch members with profile info
  const { data: members, error } = await supabase
    .from('private_feed_lists')
    .select(`
      id, owner_id, member_id, status, invited_at, accepted_at,
      member:profiles!private_feed_lists_member_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('owner_id', user.id)
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load private feed list', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    members: members ?? [],
    maxMembers,
    plan: profile?.plan ?? 'free',
  });
}
