import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ingredientSearchSchema } from '@/lib/validations/ingredient';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'search');
  if (rateLimited) return rateLimited;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ingredientSearchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, limit } = parsed.data;
  const supabase = await createClient();

  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name, category')
    .ilike('normalized_name', `%${q.toLowerCase()}%`)
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingredients: ingredients ?? [] });
}
