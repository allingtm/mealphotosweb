import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { profileUpdateSchema } from '@/lib/validations/profile';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates = parsed.data;

  // Check username uniqueness if being changed
  if (updates.username) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', updates.username)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: data });
}
