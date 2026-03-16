import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { reportSchema } from '@/lib/validations';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { reported_comment_id, reported_business_id, reason, detail } = parsed.data;

  // Prevent self-reporting
  if (reported_business_id && reported_business_id === user.id) {
    return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
  }

  if (reported_comment_id) {
    const svc = createServiceRoleClient();
    const { data: comment } = await svc
      .from('comments')
      .select('user_id')
      .eq('id', reported_comment_id)
      .single();
    if (comment?.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot report your own comment' }, { status: 400 });
    }
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_comment_id: reported_comment_id ?? null,
    reported_business_id: reported_business_id ?? null,
    reason,
    detail: detail ?? null,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  // Auto-hide for comments is handled by the DB trigger (auto_hide_reported_comment)
  // which fires after INSERT on reports and hides comments with 3+ distinct reporters

  return NextResponse.json({ success: true }, { status: 201 });
}
