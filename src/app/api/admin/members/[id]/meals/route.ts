import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminMealsPaginationSchema } from '@/lib/validations/admin';

const paramsSchema = z.object({ id: z.string().uuid('Invalid member ID') });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsedPagination = adminMealsPaginationSchema.safeParse(searchParams);
    if (!parsedPagination.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedPagination.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, per_page } = parsedPagination.data;
    const offset = (page - 1) * per_page;

    const serviceClient = createServiceRoleClient();

    const { data: meals, count, error } = await serviceClient
      .from('meals')
      .select('id, title, photo_url, avg_rating, rating_count, cuisine, tags, created_at', { count: 'exact' })
      .eq('user_id', parsed.data.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (error) {
      console.error('Admin member meals error:', error);
      return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }

    return NextResponse.json({
      meals: meals ?? [],
      total: count ?? 0,
      page,
      per_page,
    });
  } catch (err) {
    console.error('Admin member meals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
