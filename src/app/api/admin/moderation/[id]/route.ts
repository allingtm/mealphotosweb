import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body as { action: 'approve' | 'reject' };

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error } = await serviceClient
      .from('meal_moderation')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Moderation update error:', error);
      return NextResponse.json({ error: 'Failed to update moderation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Admin moderation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
