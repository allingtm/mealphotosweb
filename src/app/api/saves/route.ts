import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { saveSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase
    .from('saves')
    .insert({ dish_id: parsed.data.dish_id, user_id: user.id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already saved' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
