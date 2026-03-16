import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminContactUpdateSchema } from '@/lib/validations/contact';
import { z } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 3. Validate body
  const body = await req.json();
  const parsed = adminContactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Update submission
  const serviceClient = createServiceRoleClient();
  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.admin_notes !== undefined) updateData.admin_notes = parsed.data.admin_notes;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await serviceClient
    .from('contact_submissions')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
