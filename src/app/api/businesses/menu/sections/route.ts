import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createMenuSectionSchema } from '@/lib/validations';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = createMenuSectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_sections')
    .insert({ business_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, name, sort_order } = body;
  if (!id) return NextResponse.json({ error: 'Section ID required' }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_sections')
    .update({ ...(name !== undefined && { name }), ...(sort_order !== undefined && { sort_order }) })
    .eq('id', id)
    .eq('business_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Section ID required' }, { status: 400 });

  const { error } = await supabase
    .from('menu_sections')
    .delete()
    .eq('id', id)
    .eq('business_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
