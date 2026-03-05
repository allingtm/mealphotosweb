import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminMemberSearchSchema } from '@/lib/validations/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = adminMemberSearchSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { search, page, per_page } = parsed.data;
    const offset = (page - 1) * per_page;

    const serviceClient = createServiceRoleClient();

    let query = serviceClient
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_admin, is_restaurant, banned_at, suspended_until, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: members, count, error } = await query;

    if (error) {
      console.error('Admin members list error:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({
      members: members ?? [],
      total: count ?? 0,
      page,
      per_page,
    });
  } catch (err) {
    console.error('Admin members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
