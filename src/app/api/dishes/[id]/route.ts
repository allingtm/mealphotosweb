import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();

  const { data: dish } = await supabase
    .from('dishes')
    .select(`
      *,
      profiles!inner(username, avatar_url, plan),
      business_profiles!inner(business_name, business_type, address_city)
    `)
    .eq('id', id)
    .single();

  if (!dish) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check user's reaction/save state
  const { data: { user } } = await supabase.auth.getUser();
  let user_has_reacted = false;
  let user_has_saved = false;

  if (user) {
    const [reactionResult, saveResult] = await Promise.all([
      supabase.from('reactions').select('dish_id').eq('dish_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('saves').select('dish_id').eq('dish_id', id).eq('user_id', user.id).maybeSingle(),
    ]);
    user_has_reacted = !!reactionResult.data;
    user_has_saved = !!saveResult.data;
  }

  return NextResponse.json({ ...dish, user_has_reacted, user_has_saved });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const { id } = await params;

  // Verify ownership
  const { data: dish } = await supabase
    .from('dishes')
    .select('business_id, cloudflare_image_id')
    .eq('id', id)
    .single();

  if (!dish || dish.business_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch all Cloudflare image IDs for cleanup
  const { data: dishImages } = await supabase
    .from('dish_images')
    .select('cloudflare_image_id')
    .eq('dish_id', id);

  // Delete dish (CASCADE removes reactions, saves, comments, dish_images)
  const { error } = await supabase.from('dishes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clean up Cloudflare images (fire-and-forget)
  const allImageIds = [
    dish.cloudflare_image_id,
    ...(dishImages?.map((i) => i.cloudflare_image_id) ?? []),
  ].filter(Boolean);

  Promise.all(
    allImageIds.map((imageId) =>
      fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1/${imageId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_API_TOKEN}` } }
      )
    )
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
