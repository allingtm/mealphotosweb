import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leaderboardQuerySchema } from '@/lib/validations/leaderboard';
import type { LeaderboardEntry } from '@/types/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = leaderboardQuerySchema.safeParse({
    scope: searchParams.get('scope') ?? undefined,
    time_range: searchParams.get('time_range') ?? undefined,
    cuisine: searchParams.get('cuisine') || null,
    country: searchParams.get('country') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { scope, time_range, cuisine, country, city, limit, offset } = parsed.data;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_scope: scope,
    p_time_range: time_range,
    p_cuisine: cuisine ?? null,
    p_country: country ?? null,
    p_city: city ?? null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load leaderboard', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    entries: (data ?? []) as LeaderboardEntry[],
  });
}
