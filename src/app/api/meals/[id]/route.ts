import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;

const paramsSchema = z.object({
  id: z.string().uuid('Invalid meal ID'),
});

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
