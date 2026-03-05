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
      .select('follower_id, created_at')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: followers, error } = await query;

    if (error) {
      console.error('Followers fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
    }

    const followerIds = (followers ?? []).map(f => f.follower_id);
    if (followerIds.length === 0) {
      return NextResponse.json({ followers: [], nextCursor: null });
    }

    // Use service role to read profile data for other users
    const serviceClient = createServiceRoleClient();
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url, location_city')
      .in('id', followerIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    // Check which followers the user follows back
    const { data: followingBack } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', followerIds);

    const followingBackSet = new Set((followingBack ?? []).map(f => f.following_id));

    const items = (followers ?? []).map(f => ({
      ...(profileMap.get(f.follower_id) ?? { id: f.follower_id, username: '', display_name: null, avatar_url: null, location_city: null }),
      is_following_back: followingBackSet.has(f.follower_id),
      followed_at: f.created_at,
    }));

    const nextCursor = (followers ?? []).length === limit
      ? followers![followers!.length - 1].created_at
      : null;

    return NextResponse.json({ followers: items, nextCursor });
  } catch (err) {
    console.error('Followers error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
