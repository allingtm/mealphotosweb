import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createDishRequestSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = createDishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dish_name, location_city, lat, lng } = parsed.data;

  // Prevent duplicates
  const { data: existing } = await supabase
    .from('dish_requests')
    .select('id')
    .eq('user_id', user.id)
    .ilike('dish_name', dish_name)
    .ilike('location_city', location_city)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You already requested this dish in this area' }, { status: 409 });
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    dish_name,
    location_city,
  };

  if (lat != null && lng != null) {
    insertData.location = `SRID=4326;POINT(${lng} ${lat})`;
  }

  const { data: request, error } = await supabase
    .from('dish_requests')
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ request }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const params = req.nextUrl.searchParams;
  const city = params.get('city');
  const limit = parseInt(params.get('limit') ?? '20');

  let query = supabase
    .from('dish_requests')
    .select('*')
    .order('upvote_count', { ascending: false })
    .limit(limit);

  if (city) query = query.ilike('location_city', `%${city}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check user upvotes
  const { data: { user } } = await supabase.auth.getUser();
  let userUpvotes: string[] = [];
  if (user && data?.length) {
    const { data: upvotes } = await supabase
      .from('dish_request_upvotes')
      .select('request_id')
      .eq('user_id', user.id)
      .in('request_id', data.map((r) => r.id));
    userUpvotes = upvotes?.map((u) => u.request_id) ?? [];
  }

  return NextResponse.json({
    requests: data?.map((r) => ({ ...r, user_has_upvoted: userUpvotes.includes(r.id) })) ?? [],
  });
}
