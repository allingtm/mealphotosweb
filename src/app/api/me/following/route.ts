import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = 20;

    let query = supabase
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: following, error } = await query;

    if (error) {
      console.error('Following fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 });
    }

    const followingIds = (following ?? []).map(f => f.following_id);
    if (followingIds.length === 0) {
      return NextResponse.json({ following: [], nextCursor: null });
    }

    // Use service role to read profile data for other users
    const serviceClient = createServiceRoleClient();
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url, location_city')
      .in('id', followingIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    const items = (following ?? []).map(f => ({
      ...(profileMap.get(f.following_id) ?? { id: f.following_id, username: '', display_name: null, avatar_url: null, location_city: null }),
      is_following_back: true, // By definition, current user follows all these
      followed_at: f.created_at,
    }));

    const nextCursor = (following ?? []).length === limit
      ? following![following!.length - 1].created_at
      : null;

    return NextResponse.json({ following: items, nextCursor });
  } catch (err) {
    console.error('Following error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
