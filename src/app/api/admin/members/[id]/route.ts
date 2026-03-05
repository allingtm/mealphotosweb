import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { adminMemberUpdateSchema } from '@/lib/validations/admin';

const paramsSchema = z.object({ id: z.string().uuid('Invalid member ID') });

export async function GET(
  _req: NextRequest,
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

    const serviceClient = createServiceRoleClient();

    const [profileResult, mealStatsResult] = await Promise.all([
      serviceClient
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url, location_city, location_country, is_admin, is_restaurant, banned_at, suspended_until, ban_reason, created_at, updated_at')
        .eq('id', parsed.data.id)
        .single(),
      serviceClient
        .from('meals')
        .select('avg_rating', { count: 'exact' })
        .eq('user_id', parsed.data.id),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const meals = mealStatsResult.data ?? [];
    const mealCount = mealStatsResult.count ?? 0;
    const avgRating = mealCount > 0
      ? meals.reduce((sum, m) => sum + (m.avg_rating ?? 0), 0) / mealCount
      : 0;

    return NextResponse.json({
      member: profileResult.data,
      stats: { meal_count: mealCount, avg_rating: Math.round(avgRating * 10) / 10 },
    });
  } catch (err) {
    console.error('Admin member detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) {
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

    // Prevent self-demotion
    if (parsedParams.data.id === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own admin account' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = adminMemberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (parsed.data.display_name !== undefined) updates.display_name = parsed.data.display_name;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.is_admin !== undefined) updates.is_admin = parsed.data.is_admin;
    if (parsed.data.banned_at !== undefined) updates.banned_at = parsed.data.banned_at;
    if (parsed.data.suspended_until !== undefined) updates.suspended_until = parsed.data.suspended_until;
    if (parsed.data.ban_reason !== undefined) updates.ban_reason = parsed.data.ban_reason;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error } = await serviceClient
      .from('profiles')
      .update(updates)
      .eq('id', parsedParams.data.id)
      .select('id, username, display_name, bio, avatar_url, is_admin, is_restaurant, banned_at, suspended_until, ban_reason, created_at, updated_at')
      .single();

    if (error) {
      console.error('Admin member update error:', error);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: updated });
  } catch (err) {
    console.error('Admin member update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) {
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

    // Prevent self-deletion
    if (parsedParams.data.id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch member's meals for Cloudflare cleanup
    const { data: meals } = await serviceClient
      .from('meals')
      .select('cloudflare_image_id')
      .eq('user_id', parsedParams.data.id);

    // Best-effort Cloudflare image deletion
    if (meals && CF_ACCOUNT_ID && CF_API_TOKEN) {
      await Promise.allSettled(
        meals
          .filter((m) => m.cloudflare_image_id)
          .map((m) =>
            fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${m.cloudflare_image_id}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
              }
            )
          )
      );
    }

    // Delete profile (cascades to meals, ratings, etc.)
    const { error: deleteError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', parsedParams.data.id);

    if (deleteError) {
      console.error('Admin member delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
    }

    // Delete auth user record
    try {
      await serviceClient.auth.admin.deleteUser(parsedParams.data.id);
    } catch (err) {
      console.error('Auth user delete failed (profile already removed):', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin member delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
