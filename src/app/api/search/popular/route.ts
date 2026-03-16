import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const supabase = await createClient();

  const { data } = await supabase
    .from('dishes')
    .select('title, reaction_count')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .gt('reaction_count', 0)
    .order('reaction_count', { ascending: false })
    .limit(50);

  // Group by dish name
  const grouped = new Map<string, { count: number; total_reactions: number }>();
  data?.forEach((d) => {
    const key = d.title.toLowerCase().trim();
    const existing = grouped.get(key) ?? { count: 0, total_reactions: 0 };
    grouped.set(key, {
      count: existing.count + 1,
      total_reactions: existing.total_reactions + d.reaction_count,
    });
  });

  const popular = Array.from(grouped.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.total_reactions - a.total_reactions)
    .slice(0, 10);

  return NextResponse.json({ popular });
}
