import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, username, avatar_url, plan, follower_count, subscription_status,
      business_profiles!inner(*)
    `)
    .eq('username', username)
    .eq('is_business', true)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check if current user follows
  const { data: { user } } = await supabase.auth.getUser();
  let is_following = false;
  if (user) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    is_following = !!follow;
  }

  return NextResponse.json({ ...profile, is_following });
}
