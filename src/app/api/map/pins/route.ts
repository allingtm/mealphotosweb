import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapPinsSchema } from '@/lib/validations/map';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = mapPinsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { north, south, east, west, type_filter, limit } = parsed.data;

  const { data, error } = await supabase.rpc('get_map_business_pins', {
    p_north: north,
    p_south: south,
    p_east: east,
    p_west: west,
    p_type_filter: type_filter ?? null,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { pins: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } }
  );
}
