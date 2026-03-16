import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  const params = req.nextUrl.searchParams;
  const limit = parseInt(params.get('limit') ?? '20');
  const cursor = params.get('cursor');

  let query = supabase
    .from('saves')
    .select(`
      dish_id, created_at,
      dishes!inner(
        id, title, price_pence, photo_url, photo_blur_hash, reaction_count,
        business_profiles:business_id(business_name, business_type, address_city)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    saves: data ?? [],
    cursor: data?.length === limit ? data[data.length - 1].created_at : null,
  });
}
