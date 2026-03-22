import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { resolveBusinessContext } from '@/lib/team';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx) return NextResponse.json({ error: 'Business access required' }, { status: 403 });

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
  const cursor = url.searchParams.get('cursor');

  let query = supabase
    .from('dishes')
    .select('id, title, description, price_pence, photo_url, photo_blur_hash, image_count, reaction_count, save_count, comment_count, comments_enabled, created_at, premise_id, posted_by')
    .eq('business_id', ctx.businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    dishes: data ?? [],
    cursor: data?.length === limit ? data[data.length - 1].created_at : null,
  });
}
