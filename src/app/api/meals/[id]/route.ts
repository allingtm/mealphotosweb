import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { mealUpdateSchema } from '@/lib/validations/meal';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;

const paramsSchema = z.object({
  id: z.string().uuid('Invalid meal ID'),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify ownership
    const { data: meal, error: fetchError } = await supabase
      .from('meals')
      .select('id, user_id')
      .eq('id', parsed.data.id)
      .single();

    if (fetchError || !meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (meal.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own meals' }, { status: 403 });
    }

    // Validate body
    const body = await req.json();
    const validatedBody = mealUpdateSchema.safeParse(body);

    if (!validatedBody.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validatedBody.error.issues) {
        const key = issue.path[0]?.toString() || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json(
        { error: 'Validation failed', details: fieldErrors },
        { status: 400 }
      );
    }

    // Build update object
    const update: Record<string, unknown> = {};

    if (validatedBody.data.title !== undefined) {
      update.title = validatedBody.data.title;
    }

    if (validatedBody.data.cuisine !== undefined) {
      update.cuisine = validatedBody.data.cuisine;
    }

    if (validatedBody.data.tags !== undefined) {
      update.tags = validatedBody.data.tags;
    }

    if (validatedBody.data.comments_enabled !== undefined) {
      update.comments_enabled = validatedBody.data.comments_enabled;
    }

    if (validatedBody.data.venue !== undefined) {
      if (validatedBody.data.venue === null) {
        update.venue_name = null;
        update.venue_mapbox_id = null;
        update.venue_address = null;
      } else {
        update.venue_name = validatedBody.data.venue.name;
        update.venue_mapbox_id = validatedBody.data.venue.mapbox_id ?? null;
        update.venue_address = validatedBody.data.venue.address ?? null;
      }
    }

    if (validatedBody.data.location !== undefined) {
      if (validatedBody.data.location === null) {
        update.location = null;
        update.location_city = null;
        update.location_country = null;
      } else {
        const lat = Math.round(validatedBody.data.location.lat * 100) / 100;
        const lng = Math.round(validatedBody.data.location.lng * 100) / 100;
        update.location = `SRID=4326;POINT(${lng} ${lat})`;
        update.location_city = validatedBody.data.location.city || null;
        update.location_country = validatedBody.data.location.country || null;
      }
    } else if (
      validatedBody.data.venue &&
      validatedBody.data.venue.lat &&
      validatedBody.data.venue.lng
    ) {
      // Auto-fill location from venue coords if no explicit location
      const lat = Math.round(validatedBody.data.venue.lat * 100) / 100;
      const lng = Math.round(validatedBody.data.venue.lng * 100) / 100;
      update.location = `SRID=4326;POINT(${lng} ${lat})`;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    update.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('meals')
      .update(update)
      .eq('id', meal.id);

    if (updateError) {
      console.error('Meal update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update meal. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update meal error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const parsed = paramsSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch meal to get cloudflare_image_id and verify ownership
    const { data: meal, error: fetchError } = await supabase
      .from('meals')
      .select('id, user_id, cloudflare_image_id')
      .eq('id', parsed.data.id)
      .single();

    if (fetchError || !meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    if (meal.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own meals' }, { status: 403 });
    }

    // Delete from Cloudflare Images (best-effort)
    if (meal.cloudflare_image_id) {
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

    // Delete from DB (cascades to ratings, comments, recipes, etc.)
    const { error: deleteError } = await supabase
      .from('meals')
      .delete()
      .eq('id', meal.id);

    if (deleteError) {
      console.error('Meal delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete meal. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete meal error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
