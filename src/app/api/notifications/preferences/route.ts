import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const preferencesSchema = z.object({
  new_comment: z.boolean().optional(),
  new_follower: z.boolean().optional(),
  reaction_milestone: z.boolean().optional(),
  new_dish: z.boolean().optional(),
  dish_request_nearby: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const { data } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ preferences: data?.notification_preferences ?? {} });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
  }

  const { data: current } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  const merged = { ...(current?.notification_preferences ?? {}), ...parsed.data };

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: merged })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: merged });
}
