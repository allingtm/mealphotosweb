import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminMealUpdateSchema } from '@/lib/validations/admin';

const paramsSchema = z.object({ id: z.string().uuid('Invalid meal ID') });

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = adminMealUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // v3: Admin can only delete dishes (managed by businesses)
    // This PATCH route is kept for compatibility but does nothing meaningful
    const updates: Record<string, unknown> = {};

    const serviceClient = createServiceRoleClient();

    const { data: updated, error } = await serviceClient
      .from('meals')
      .update(updates)
      .eq('id', parsedParams.data.id)
      .select('id, title, photo_url, avg_rating, rating_count, cuisine, tags, created_at')
      .single();

    if (error) {
      console.error('Admin meal update error:', error);
      return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, meal: updated });
  } catch (err) {
    console.error('Admin meal update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch meal for Cloudflare cleanup
    const { data: meal, error: fetchError } = await serviceClient
      .from('meals')
      .select('id, cloudflare_image_id')
      .eq('id', parsedParams.data.id)
      .single();

    if (fetchError || !meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    // Best-effort Cloudflare image deletion
    if (meal.cloudflare_image_id && CF_ACCOUNT_ID && CF_API_TOKEN) {
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${meal.cloudflare_image_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
          }
        );
      } catch (err) {
        console.error('Cloudflare image delete failed:', err);
      }
    }

    const { error: deleteError } = await serviceClient
      .from('meals')
      .delete()
      .eq('id', meal.id);

    if (deleteError) {
      console.error('Admin meal delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin meal delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
