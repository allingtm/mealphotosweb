import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const feedSchema = z.object({
  tab: z.enum(['following', 'nearby', 'trending']).default('nearby'),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius_km: z.coerce.number().int().min(1).max(50).default(8),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = feedSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { tab, lat, lng, radius_km, limit, cursor } = parsed.data;

  const { data, error } = await supabase.rpc('get_feed', {
    p_tab: tab,
    p_lat: lat ?? null,
    p_lng: lng ?? null,
    p_radius_km: radius_km,
    p_limit: limit,
    p_cursor: cursor ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    cursor: data?.length === limit ? data[data.length - 1].created_at : null,
  });
}
