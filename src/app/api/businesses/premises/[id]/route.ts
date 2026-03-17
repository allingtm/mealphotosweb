import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { premiseUpdateSchema } from '@/lib/validations';
import { applyRateLimit } from '@/lib/rate-limit';
import { slugify, countrySlug, generateUniqueSlug } from '@/lib/utils/slugify';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const rateLimited = await applyRateLimit(
    req.headers.get('x-forwarded-for') ?? 'anonymous',
    'read',
  );
  if (rateLimited) return rateLimited;

  const { data, error } = await supabase
    .from('business_premises')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ premise: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const parsed = premiseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch current premise to check ownership and detect address changes
  const { data: current } = await supabase
    .from('business_premises')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { latitude, longitude, ...updateData } = parsed.data;
  const updatePayload: Record<string, unknown> = { ...updateData };

  // Regenerate slugs if address or name changed
  const nameChanged = updateData.name && updateData.name !== current.name;
  const cityChanged = updateData.address_city && updateData.address_city !== current.address_city;
  const regionChanged = updateData.address_region && updateData.address_region !== current.address_region;
  const countryChanged = updateData.address_country && updateData.address_country !== current.address_country;

  if (nameChanged || cityChanged || regionChanged || countryChanged) {
    const oldPath = `/${current.country_slug}/${current.region_slug}/${current.city_slug}/${current.slug}`;

    const newCountry = countrySlug(updateData.address_country ?? current.address_country);
    const newRegion = slugify(updateData.address_region ?? current.address_region ?? '');
    const newCity = slugify(updateData.address_city ?? current.address_city ?? '');
    const newSlug = nameChanged
      ? await generateUniqueSlug(supabase as never, updateData.name!, newCountry, newRegion, newCity)
      : current.slug;

    updatePayload.country_slug = newCountry;
    updatePayload.region_slug = newRegion;
    updatePayload.city_slug = newCity;
    updatePayload.slug = newSlug;

    // Store redirect from old path
    const newPath = `/${newCountry}/${newRegion}/${newCity}/${newSlug}`;
    if (oldPath !== newPath) {
      await supabase.from('premise_redirects').insert({
        premise_id: id,
        old_path: oldPath,
      });
    }
  }

  if (latitude != null && longitude != null) {
    updatePayload.location = `SRID=4326;POINT(${longitude} ${latitude})`;
  }

  delete updatePayload.latitude;
  delete updatePayload.longitude;

  const { data: premise, error: updateError } = await supabase
    .from('business_premises')
    .update(updatePayload)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (updateError || !premise) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed' }, { status: 500 });
  }

  // Geocode if address changed but no coordinates provided
  if ((latitude == null || longitude == null) && (cityChanged || regionChanged)) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      const parts = [
        updateData.address_line_1 ?? current.address_line_1,
        updateData.address_city ?? current.address_city,
        updateData.address_postcode ?? current.address_postcode,
        updateData.address_country ?? current.address_country,
      ].filter(Boolean).join(' ');
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(parts)}.json?access_token=${token}&limit=1`,
        );
        const geo = await res.json();
        if (geo.features?.length > 0) {
          const [lng, lat] = geo.features[0].center;
          await supabase
            .from('business_premises')
            .update({ location: `SRID=4326;POINT(${lng} ${lat})` })
            .eq('id', id)
            .eq('owner_id', user.id);
        }
      } catch {
        // Non-critical
      }
    }
  }

  return NextResponse.json({ premise });
}
