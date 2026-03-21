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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body as { action: 'action' | 'dismiss' };

    if (!['action', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const newStatus = action === 'action' ? 'actioned' : 'dismissed';

    const { error } = await serviceClient
      .from('reports')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Report update error:', error);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    // When admin upholds a report, demote the reported user to flagged
    if (action === 'action') {
      // Fetch the report to find the reported user
      const { data: report } = await serviceClient
        .from('reports')
        .select('reported_user_id, reported_meal_id, reported_comment_id')
        .eq('id', id)
        .single();

      if (report) {
        let userId = report.reported_user_id;

        // If comment report, hide the comment and look up the commenter
        if (report.reported_comment_id) {
          await serviceClient
            .from('comments')
            .update({ visible: false })
            .eq('id', report.reported_comment_id);

          const { data: comment } = await serviceClient
            .from('comments')
            .select('user_id')
            .eq('id', report.reported_comment_id)
            .single();
          userId = comment?.user_id ?? null;
        }

        // If no direct user, look up via dish
        if (!userId && report.reported_meal_id) {
          const { data: dish } = await serviceClient
            .from('dishes')
            .select('business_id')
            .eq('id', report.reported_meal_id)
            .single();
          userId = dish?.business_id ?? null;
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Admin reports error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
