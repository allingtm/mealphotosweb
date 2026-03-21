import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// v3: This route is kept for avatar/general image uploads
// Dish uploads are handled by /api/dishes route
const imageUploadSchema = z.object({
  turnstile_token: z.string().optional(),
});

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH!;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB per image

const DAILY_UPLOAD_LIMITS: Record<string, number> = {
  free: 5,
  personal: 15,
  business: 20,
};

const MAX_IMAGES_PER_PLAN: Record<string, number> = {
  free: 1,
  personal: 4,
  business: 4,
};

export async function POST(req: NextRequest) {
  try {
    // 1. Check content-length
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_SIZE * 4) {
      return NextResponse.json(
        { error: 'Request too large.' },
        { status: 413 }
      );
    }

    // 2. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 3. Get user plan for limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, subscription_status, subscription_tier')
      .eq('id', user.id)
      .single();

    const plan = profile?.plan ?? 'free';

    // 4. Check daily upload limit
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());

    const dailyLimit = DAILY_UPLOAD_LIMITS[plan] ?? 5;
    if ((todayCount ?? 0) >= dailyLimit) {
      return NextResponse.json(
        { error: `Daily upload limit reached (${dailyLimit}/day). ${plan === 'free' ? 'Upgrade to Personal for 15 uploads/day.' : ''}` },
        { status: 429 }
      );
    }

    // 5. Parse multipart form data - support multi-image (file_0, file_1, etc.)
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const cuisine = (formData.get('cuisine') as string) || null;
    const locationStr = formData.get('location') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const venueStr = formData.get('venue') as string | null;
    const turnstileToken = formData.get('turnstile_token') as string;
    const isRestaurantUpload = formData.get('is_restaurant_upload') === 'true';
    const visibility = (formData.get('visibility') as string) || 'public';
    const commentsEnabled = formData.get('comments_enabled') !== 'false';

    // Collect files (support both single 'file' and indexed 'file_0', 'file_1', etc.)
    const files: File[] = [];
    const singleFile = formData.get('file') as File | null;
    if (singleFile && singleFile.size > 0) {
      files.push(singleFile);
    } else {
      for (let i = 0; i < 4; i++) {
        const f = formData.get(`file_${i}`) as File | null;
        if (f && f.size > 0) files.push(f);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate image count against plan
    const maxImages = MAX_IMAGES_PER_PLAN[plan] ?? 1;
    if (files.length > maxImages) {
      return NextResponse.json(
        { error: `Your plan allows up to ${maxImages} image${maxImages > 1 ? 's' : ''} per post. ${plan === 'free' ? 'Upgrade to Personal for multi-photo uploads.' : ''}` },
        { status: 403 }
      );
    }

    // Validate each file size
    for (const f of files) {
      if (f.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'Each image must be under 10MB.' },
          { status: 413 }
        );
      }
    }

    // Parse location and tags from JSON strings
    let location = null;
    if (locationStr) {
      try {
        location = JSON.parse(locationStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid location format' },
          { status: 400 }
        );
      }
    }

    let tags: string[] = [];
    if (tagsStr) {
      try {
        tags = JSON.parse(tagsStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid tags format' },
          { status: 400 }
        );
      }
    }

    let venue = null;
    if (venueStr) {
      try {
        venue = JSON.parse(venueStr);
      } catch {
        return NextResponse.json(
          { error: 'Invalid venue format' },
          { status: 400 }
        );
      }
    }

    // 6. Server-side Zod validation
    const parsed = imageUploadSchema.safeParse({
      turnstile_token: turnstileToken,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json(
        { error: 'Validation failed', details: fieldErrors },
        { status: 400 }
      );
    }

    // 7. Validate Turnstile token (skip in dev if not configured)
    const isDevBypass = process.env.NODE_ENV === 'development' && turnstileToken === 'dev-bypass';
    if (TURNSTILE_SECRET && !isDevBypass) {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: TURNSTILE_SECRET,
            response: turnstileToken,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return NextResponse.json(
          { error: 'Bot verification failed' },
          { status: 403 }
        );
      }
    }

    // 7b. Restaurant upload validation
    if (isRestaurantUpload) {
      if (!profile || profile.subscription_status !== 'active') {
        return NextResponse.json(
          { error: 'Active subscription required for restaurant uploads' },
          { status: 403 }
        );
      }

    }

    // 8. Upload all images to Cloudflare Images in parallel
    const uploadResults = await Promise.all(
      files.map(async (file, index) => {
        const cfForm = new FormData();
        cfForm.append('file', file, `meal_${index}.jpg`);
        cfForm.append('metadata', JSON.stringify({
          app: 'meal.photos',
          userId: user.id,
          title: (title as string) ?? 'upload',
          position: index + 1,
          uploadedAt: new Date().toISOString(),
        }));

        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
            body: cfForm,
          }
        );

        const cfData = await cfRes.json();
        if (!cfData.success) {
          throw new Error(`Cloudflare upload failed for image ${index + 1}: ${JSON.stringify(cfData.errors)}`);
        }

        return {
          imageId: cfData.result.id as string,
          deliveryUrl: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${cfData.result.id}`,
        };
      })
    );

    // Primary image (first one) for backward-compatible meals table fields
    const primaryImage = uploadResults[0];

    // 9. Quantise location coordinates (2 decimal places)
    let locationPoint = null;
    let locationCity = null;
    let locationCountry = null;

    // v3: Location handling moved to /api/dishes route
    // This upload route is kept for avatar uploads only

    // 10. Insert meal row
    // v3: Return uploaded image URLs only — meal/dish creation is in /api/dishes
    return NextResponse.json({
      images: uploadResults.map((r) => ({
        imageId: r.imageId,
        url: `${r.deliveryUrl}/feed`,
      })),
    }, { status: 200 });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

