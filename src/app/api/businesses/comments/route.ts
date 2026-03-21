import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
  const cursor = url.searchParams.get('cursor');

  let query = supabase
    .from('comments')
    .select(`
      id, dish_id, user_id, text, visible, created_at,
      profiles!inner(username, display_name, avatar_url, is_business),
      dishes!inner(id, title, photo_url, business_id)
    `)
    .eq('dishes.business_id', user.id)
    .eq('visible', true)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    comments: data ?? [],
    cursor: data?.length === limit ? data[data.length - 1].created_at : null,
  });
}
