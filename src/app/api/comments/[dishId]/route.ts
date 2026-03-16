import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dishId: string }> }
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const { dishId } = await params;
  const supabase = await createClient();

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const cursor = searchParams.get('cursor');

  let query = supabase
    .from('comments')
    .select(`
      id, dish_id, user_id, text, visible, created_at,
      profiles!inner(username, display_name, avatar_url, is_business)
    `)
    .eq('dish_id', dishId)
    .eq('visible', true)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data: comments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Determine business owner of this dish
  const { data: dish } = await supabase
    .from('dishes')
    .select('business_id')
    .eq('id', dishId)
    .single();

  const enriched = comments?.map(c => ({
    ...c,
    is_business_owner: c.user_id === dish?.business_id,
  })) ?? [];

  return NextResponse.json({
    comments: enriched,
    hasMore: enriched.length === limit,
  });
}
