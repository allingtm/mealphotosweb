import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mealUploadServerSchema } from '@/lib/validations/meal';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH!;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    // 1. Check content-length
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
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

    // 3. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const cuisine = (formData.get('cuisine') as string) || null;
    const locationStr = formData.get('location') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const venueStr = formData.get('venue') as string | null;
    const turnstileToken = formData.get('turnstile_token') as string;
    const isRestaurantUpload = formData.get('is_restaurant_upload') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Additional file size check on actual bytes
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
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

    // 4. Server-side Zod validation
    const parsed = mealUploadServerSchema.safeParse({
      title,
      cuisine,
      location,
      tags,
      venue,
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

    // 5. Validate Turnstile token (skip in dev if not configured)
    if (TURNSTILE_SECRET && turnstileToken !== 'dev-bypass') {
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

    // 5b. Restaurant upload validation
    if (isRestaurantUpload) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_tier')
        .eq('id', user.id)
        .single();

      if (!profile || profile.subscription_status !== 'active') {
        return NextResponse.json(
          { error: 'Active subscription required for restaurant uploads' },
          { status: 403 }
        );
      }

      // Enforce Basic tier 10-upload limit
      if (profile.subscription_tier === 'basic') {
        const { count } = await supabase
          .from('meals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_restaurant_meal', true);

        if ((count ?? 0) >= 10) {
          return NextResponse.json(
            { error: 'Basic plan is limited to 10 dish uploads. Upgrade to Premium for unlimited uploads.' },
            { status: 403 }
          );
        }
      }
    }

    // 6. Upload to Cloudflare Images
    const cfForm = new FormData();
    cfForm.append('file', file, 'meal.jpg');
    cfForm.append('metadata', JSON.stringify({
      app: 'meal.photos',
      userId: user.id,
      title: parsed.data.title,
      uploadedAt: new Date().toISOString(),
    }));

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
        body: cfForm,
      }
    );

    const cfData = await cfRes.json();

    if (!cfData.success) {
      console.error('Cloudflare Images upload failed:', cfData.errors);
      return NextResponse.json(
        { error: 'Image upload failed. Please try again.' },
        { status: 502 }
      );
    }

    const imageId = cfData.result.id;
    const deliveryUrl = `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}`;

    // 7. Quantise location coordinates (2 decimal places)
    let locationPoint = null;
    let locationCity = null;
    let locationCountry = null;

    if (parsed.data.location) {
      const lat = Math.round(parsed.data.location.lat * 100) / 100;
      const lng = Math.round(parsed.data.location.lng * 100) / 100;
      locationPoint = `SRID=4326;POINT(${lng} ${lat})`;
      locationCity = parsed.data.location.city || null;
      locationCountry = parsed.data.location.country || null;
    } else if (parsed.data.venue?.lat && parsed.data.venue?.lng) {
      // Auto-fill location from venue coordinates
      const lat = Math.round(parsed.data.venue.lat * 100) / 100;
      const lng = Math.round(parsed.data.venue.lng * 100) / 100;
      locationPoint = `SRID=4326;POINT(${lng} ${lat})`;
    }

    // 8. Insert meal row
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        photo_url: `${deliveryUrl}/feed`,
        cloudflare_image_id: imageId,
        location: locationPoint,
        location_city: locationCity,
        location_country: locationCountry,
        cuisine: parsed.data.cuisine || null,
        tags: parsed.data.tags,
        venue_name: parsed.data.venue?.name ?? null,
        venue_mapbox_id: parsed.data.venue?.mapbox_id ?? null,
        venue_address: parsed.data.venue?.address ?? null,
        ...(isRestaurantUpload && {
          is_restaurant_meal: true,
          restaurant_id: user.id,
          restaurant_revealed: false,
        }),
      })
      .select('id')
      .single();

    if (mealError) {
      console.error('Meal insert failed:', mealError);
      return NextResponse.json(
        { error: 'Failed to save meal. Please try again.' },
        { status: 500 }
      );
    }

    // 9. Insert meal_moderation row (status: pending)
    const { error: modError } = await supabase.from('meal_moderation').insert({
      meal_id: meal.id,
      status: 'pending',
    });

    if (modError) {
      console.error('Moderation insert failed:', modError);
      // Non-fatal — meal is created, moderation row can be retried
    }

    // 10. Trigger moderation Edge Function (async, don't await)
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/moderate-meal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'x-edge-secret': process.env.EDGE_FUNCTION_SECRET!,
        },
        body: JSON.stringify({
          meal_id: meal.id,
          image_url: `${deliveryUrl}/feed`,
        }),
      }
    ).catch((err: unknown) => {
      console.error('Moderation function invoke failed:', err);
    });

    // 11. Update streak
    await updateStreak(supabase, user.id);

    return NextResponse.json({
      meal_id: meal.id,
      image_id: imageId,
      delivery_url: deliveryUrl,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Update user's upload streak.
 * - If already uploaded today → no change
 * - If last upload was yesterday → increment streak
 * - If last upload was before yesterday → reset to 1
 */
async function updateStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  try {
    // Get profile with streak data and timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_current, streak_best, streak_last_upload, timezone')
      .eq('id', userId)
      .single();

    if (!profile) return;

    const tz = profile.timezone || 'UTC';

    // Get today's date in user's timezone
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

    // If already uploaded today, do nothing
    if (profile.streak_last_upload === todayStr) return;

    // Get yesterday's date in user's timezone
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: tz });

    let newStreak: number;
    if (profile.streak_last_upload === yesterdayStr) {
      // Consecutive day — increment
      newStreak = profile.streak_current + 1;
    } else {
      // Gap — reset to 1
      newStreak = 1;
    }

    const newBest = Math.max(newStreak, profile.streak_best);

    await supabase
      .from('profiles')
      .update({
        streak_current: newStreak,
        streak_best: newBest,
        streak_last_upload: todayStr,
      })
      .eq('id', userId);
  } catch (err) {
    console.error('Streak update error:', err);
  }
}
