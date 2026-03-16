import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const { username } = await params;
  const supabase = await createClient();

  // Resolve business ID from username
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .eq('is_business', true)
    .single();

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: sections, error } = await supabase
    .from('menu_sections')
    .select('*, menu_items(*)')
    .eq('business_id', profile.id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sections: sections ?? [] });
}
