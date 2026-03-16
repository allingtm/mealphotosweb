import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchSchema } from '@/lib/validations/search';
import { applyRateLimit } from '@/lib/rate-limit';
import posthog from 'posthog-js';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'search');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit } = parsed.data;

  // Search dishes by title (full-text)
  const { data: dishes } = await supabase
    .from('dishes')
    .select(`
      id, title, photo_url, price_pence, reaction_count, created_at,
      profiles!inner(username),
      business_profiles!inner(business_name, business_type, address_city)
    `)
    .textSearch('title', q, { type: 'websearch' })
    .order('reaction_count', { ascending: false })
    .limit(limit);

  // Search businesses by name (ilike)
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select(`
      id, business_name, business_type, address_city,
      profiles!inner(username, avatar_url, plan, subscription_status)
    `)
    .eq('profiles.subscription_status', 'active')
    .ilike('business_name', `%${q}%`)
    .limit(limit);

  const totalResults = (dishes?.length ?? 0) + (businesses?.length ?? 0);

  return NextResponse.json({
    dishes: dishes ?? [],
    businesses: businesses ?? [],
    total: totalResults,
  });
}
