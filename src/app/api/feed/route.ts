import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 20);

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_feed', {
    p_limit: limit,
    ...(cursor ? { p_cursor: cursor } : {}),
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load feed', details: error.message },
      { status: 500 }
    );
  }

  const nextCursor =
    data && data.length === limit
      ? data[data.length - 1].created_at
      : null;

  return NextResponse.json({ meals: data ?? [], nextCursor });
}
