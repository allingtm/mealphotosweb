import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id, created_at,
      profiles!following_id(username, avatar_url, plan),
      business_profiles:following_id(business_name, business_type, address_city)
    `)
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ following: data ?? [] });
}
