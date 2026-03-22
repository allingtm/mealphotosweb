import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createMenuItemSchema } from '@/lib/validations';
import { resolveBusinessContext } from '@/lib/team';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx || !ctx.permissions.can_manage_menu) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMenuItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_items')
    .insert({ business_id: ctx.businessId, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx || !ctx.permissions.can_manage_menu) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', ctx.businessId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx || !ctx.permissions.can_manage_menu) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 });

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('business_id', ctx.businessId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
