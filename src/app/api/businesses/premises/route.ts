import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { premiseCreateSchema } from '@/lib/validations';
import { applyRateLimit } from '@/lib/rate-limit';
import { slugify, countrySlug, generateUniqueSlug } from '@/lib/utils/slugify';
import { resolveBusinessContext } from '@/lib/team';

async function geocodeAddress(
  addressLine1: string | null | undefined,
  city: string | null | undefined,
  postcode: string | null | undefined,
  country: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
  if (!city && !postcode) return null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const parts = [addressLine1, city, postcode, country].filter(Boolean).join(' ');
  const query = encodeURIComponent(parts);

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`,
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'read');
  if (rateLimited) return rateLimited;

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx) return NextResponse.json({ error: 'Business access required' }, { status: 403 });

  const includeInactive = req.nextUrl.searchParams.get('include_inactive') === 'true';

  let query = supabase
    .from('business_premises')
    .select('*')
    .eq('owner_id', ctx.businessId)
    .order('created_at', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ premises: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = premiseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  // Check premise limit
  const { data: profile } = await supabase
    .from('profiles')
    .select('max_premises, is_business')
    .eq('id', user.id)
    .single();

  if (!profile?.is_business) {
    return NextResponse.json({ error: 'Not a business account' }, { status: 403 });
  }

  const { count } = await supabase
    .from('business_premises')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if ((count ?? 0) >= (profile.max_premises ?? 5)) {
    return NextResponse.json({ error: `Maximum ${profile.max_premises ?? 5} premises per account` }, { status: 429 });
  }

  const { latitude, longitude, ...premiseData } = parsed.data;

  // Generate location slugs
  const cSlug = countrySlug(premiseData.address_country);
  const rSlug = slugify(premiseData.address_region);
  const ciSlug = slugify(premiseData.address_city);
  const pSlug = await generateUniqueSlug(supabase as never, premiseData.name, cSlug, rSlug, ciSlug);

  const insertPayload: Record<string, unknown> = {
    owner_id: user.id,
    ...premiseData,
    slug: pSlug,
    country_slug: cSlug,
    region_slug: rSlug,
    city_slug: ciSlug,
  };

  // Set PostGIS location if coordinates provided
  if (latitude != null && longitude != null) {
    insertPayload.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  // Remove lat/lng from payload (not DB columns)
  delete insertPayload.latitude;
  delete insertPayload.longitude;

  const { data: premise, error: insertError } = await supabase
    .from('business_premises')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Geocode address if no coordinates were provided
  if (latitude == null || longitude == null) {
    const coords = await geocodeAddress(
      premiseData.address_line_1,
      premiseData.address_city,
      premiseData.address_postcode,
      premiseData.address_country,
    );
    if (coords) {
      await supabase
        .from('business_premises')
        .update({ location: `SRID=4326;POINT(${coords.lng} ${coords.lat})` })
        .eq('id', premise.id)
        .eq('owner_id', user.id);
    }
  }

  return NextResponse.json({ premise }, { status: 201 });
}
