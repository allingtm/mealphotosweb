import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessProfileCreateSchema, businessProfileUpdateSchema } from '@/lib/validations';
import { applyRateLimit } from '@/lib/rate-limit';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
}

async function geocodeAddress(
  addressLine1: string | null | undefined,
  city: string | null | undefined,
  postcode: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
  if (!city && !postcode) return null;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const parts = [addressLine1, city, postcode].filter(Boolean).join(' ');
  const query = encodeURIComponent(parts);

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1&country=gb`,
    );
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
  } catch {
    // Geocoding failure is non-critical
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = businessProfileCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { latitude, longitude, ...profileData } = parsed.data;

  // Build insert payload
  const insertPayload: Record<string, unknown> = {
    id: user.id,
    ...profileData,
  };

  // Set PostGIS location if coordinates provided
  if (latitude != null && longitude != null) {
    insertPayload.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  // Check if business profile already exists
  const { data: existing } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Business profile already exists' }, { status: 409 });
  }

  // Create business profile
  const { data: profile, error: insertError } = await supabase
    .from('business_profiles')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Generate username slug from business name
  if (profileData.business_name) {
    const baseSlug = generateSlug(profileData.business_name);
    let slug = baseSlug;
    let suffix = 1;

    while (slug.length >= 3) {
      const { data: collision } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', slug)
        .neq('id', user.id)
        .maybeSingle();
      if (!collision) break;
      slug = `${baseSlug}_${suffix}`.substring(0, 30);
      suffix++;
      if (suffix > 100) break;
    }

    if (slug.length >= 3) {
      await supabase.from('profiles').update({ username: slug, is_business: true }).eq('id', user.id);
    } else {
      await supabase.from('profiles').update({ is_business: true }).eq('id', user.id);
    }
  } else {
    // Mark user as business
    await supabase
      .from('profiles')
      .update({ is_business: true })
      .eq('id', user.id);
  }

  // Geocode address if no coordinates were provided
  if (latitude == null || longitude == null) {
    const coords = await geocodeAddress(
      profileData.address_line_1,
      profileData.address_city,
      profileData.address_postcode,
    );
    if (coords) {
      await supabase.rpc('update_business_location', {
        p_business_id: user.id,
        p_lng: coords.lng,
        p_lat: coords.lat,
      });
    }
  }

  return NextResponse.json({ profile }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  // Verify user is a business
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('is_business')
    .eq('id', user.id)
    .single();

  if (!existingProfile?.is_business) {
    return NextResponse.json({ error: 'Not a business account' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = businessProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { latitude, longitude, ...updateData } = parsed.data;

  const updatePayload: Record<string, unknown> = { ...updateData };

  if (latitude != null && longitude != null) {
    updatePayload.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  const { data: profile, error: updateError } = await supabase
    .from('business_profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Geocode address if address fields changed but no coordinates provided
  if ((latitude == null || longitude == null) && (updateData.address_city || updateData.address_postcode)) {
    const coords = await geocodeAddress(
      updateData.address_line_1,
      updateData.address_city,
      updateData.address_postcode,
    );
    if (coords) {
      await supabase.rpc('update_business_location', {
        p_business_id: user.id,
        p_lng: coords.lng,
        p_lat: coords.lat,
      });
    }
  }

  return NextResponse.json({ profile });
}
