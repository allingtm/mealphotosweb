import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminContactQuerySchema } from '@/lib/validations/contact';

export async function GET(req: NextRequest) {
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

  // 3. Parse query params
  const { searchParams } = new URL(req.url);
  const parsed = adminContactQuerySchema.safeParse({
    status: searchParams.get('status') ?? 'all',
    page: searchParams.get('page') ?? '1',
    per_page: searchParams.get('per_page') ?? '20',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, page, per_page } = parsed.data;

  // 4. Query submissions
  const serviceClient = createServiceRoleClient();
  let query = serviceClient
    .from('contact_submissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    per_page,
  });
}
