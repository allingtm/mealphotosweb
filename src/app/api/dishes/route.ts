import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDishSchema } from '@/lib/validations/dish';
import { getPostLimit } from '@/lib/subscription';
import { applyRateLimit } from '@/lib/rate-limit';
import { encode } from 'blurhash';
import sharp from 'sharp';

async function generateBlurHash(buffer: ArrayBuffer): Promise<string> {
  const { data, info } = await sharp(Buffer.from(buffer))
    .resize(32, 40, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'upload');
  if (rateLimited) return rateLimited;

  // Check business status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_business, plan, subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Business subscription required' }, { status: 403 });
  }

  // Check post limit
  const limit = getPostLimit(profile.plan);
  if (limit !== Infinity) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('dishes')
      .select('id', { count: 'exact' })
      .eq('business_id', user.id)
      .gte('created_at', todayStart.toISOString());

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: 'Daily post limit reached.' },
        { status: 429 }
      );
    }
  }

  // Parse form data
  const formData = await req.formData();

  // Turnstile verification
  const turnstileToken = formData.get('turnstile_token') as string | null;
  const isDevBypass = process.env.NODE_ENV === 'development' && turnstileToken === 'dev-bypass';
  if (process.env.TURNSTILE_SECRET_KEY && !isDevBypass) {
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken ?? '',
      }),
    });
    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      return NextResponse.json({ error: 'Bot verification failed' }, { status: 403 });
    }
  }

  const metadataRaw = formData.get('metadata');
  if (!metadataRaw) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
  }

  const metadata = JSON.parse(metadataRaw as string);
  const parsed = createDishSchema.safeParse(metadata);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const imageFiles = formData.getAll('images') as File[];
  if (imageFiles.length === 0) {
    return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 });
  }
  if (imageFiles.length > 4) {
    return NextResponse.json({ error: 'Maximum 4 photos per dish' }, { status: 400 });
  }

  // Validate file sizes
  for (const img of imageFiles) {
    if (img.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image exceeds 10MB limit' }, { status: 413 });
    }
  }

  // Upload images to Cloudflare + generate blur hashes
  const uploadedImages: { cloudflare_image_id: string; photo_url: string; blur_hash: string }[] = [];

  for (const image of imageFiles) {
    const cfFormData = new FormData();
    cfFormData.append('file', image);

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_API_TOKEN}` },
        body: cfFormData,
      }
    );

    const cfResult = await cfRes.json();
    if (!cfResult.success) {
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
    }

    // Generate blur hash
    let blurHash = '';
    try {
      const buffer = await image.arrayBuffer();
      blurHash = await generateBlurHash(buffer);
    } catch {
      // Non-critical — dish works without blur hash
    }

    uploadedImages.push({
      cloudflare_image_id: cfResult.result.id,
      photo_url: `https://imagedelivery.net/${process.env.CLOUDFLARE_ACCOUNT_HASH}/${cfResult.result.id}/feed`,
      blur_hash: blurHash,
    });
  }

  // Validate premise ownership if premise_id provided
  let premiseId: string | null = null;
  if (parsed.data.premise_id) {
    const { data: premise } = await supabase
      .from('business_premises')
      .select('id')
      .eq('id', parsed.data.premise_id)
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .single();
    if (!premise) {
      return NextResponse.json({ error: 'Invalid premise' }, { status: 400 });
    }
    premiseId = premise.id;
  } else {
    // Auto-select single premise if user has exactly one
    const { data: premises } = await supabase
      .from('business_premises')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_active', true);
    if (premises?.length === 1) {
      premiseId = premises[0].id;
    }
  }

  // Create dish record
  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .insert({
      business_id: user.id,
      premise_id: premiseId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price_pence: parsed.data.price_pence ?? null,
      photo_url: uploadedImages[0].photo_url,
      cloudflare_image_id: uploadedImages[0].cloudflare_image_id,
      photo_blur_hash: uploadedImages[0].blur_hash || null,
      image_count: uploadedImages.length,
      menu_item_id: parsed.data.menu_item_id ?? null,
      comments_enabled: parsed.data.comments_enabled,
    })
    .select()
    .single();

  if (dishError) {
    return NextResponse.json({ error: dishError.message }, { status: 500 });
  }

  // Create dish_images records
  if (uploadedImages.length > 0) {
    await supabase.from('dish_images').insert(
      uploadedImages.map((img, i) => ({
        dish_id: dish.id,
        position: i + 1,
        cloudflare_image_id: img.cloudflare_image_id,
        photo_url: img.photo_url,
        photo_blur_hash: img.blur_hash || null,
      }))
    );
  }

  // Fire SafeSearch moderation (async, fire-and-forget)
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/moderate-meal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'x-edge-secret': process.env.EDGE_FUNCTION_SECRET!,
    },
    body: JSON.stringify({ dish_id: dish.id, photo_url: uploadedImages[0].photo_url }),
  }).catch(() => {});

  // Push notifications to followers (fire-and-forget)
  (async () => {
    try {
      // Try premise name first, fall back to business_profiles
      let businessName: string | null = null;
      if (premiseId) {
        const { data: prem } = await supabase
          .from('business_premises')
          .select('name')
          .eq('id', premiseId)
          .single();
        businessName = prem?.name ?? null;
      }
      if (!businessName) {
        const { data: bizProfile } = await supabase
          .from('business_profiles')
          .select('business_name')
          .eq('id', user.id)
          .single();
        businessName = bizProfile?.business_name ?? null;
      }

      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followers?.length && businessName) {
        const pushRequests = followers.map((f) => ({
          user_id: f.follower_id,
          title: `${businessName} posted a new dish`,
          body: dish.title,
          url: `/dish/${dish.id}`,
        }));

        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'x-edge-secret': process.env.EDGE_FUNCTION_SECRET!,
          },
          body: JSON.stringify(pushRequests),
        }).catch(() => {});
      }
    } catch { /* push failure is non-critical */ }
  })();

  return NextResponse.json({ dish }, { status: 201 });
}
