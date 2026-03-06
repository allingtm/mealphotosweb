import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { businessProfileCreateSchema, businessProfileUpdateSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:business-profile',
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(`${ip}:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = businessProfileCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check if business profile already exists
    const { data: existing } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Business profile already exists' }, { status: 409 });
    }

    // Build the insert payload
    const insertData: Record<string, unknown> = {
      id: user.id,
      business_type: data.business_type,
      business_name: data.business_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website_url: data.website_url ?? null,
      booking_url: data.booking_url ?? null,
      address_line_1: data.address_line_1 ?? null,
      address_line_2: data.address_line_2 ?? null,
      address_city: data.address_city ?? null,
      address_postcode: data.address_postcode ?? null,
      address_country: data.address_country ?? 'GB',
      opening_hours: data.opening_hours ?? null,
      cuisine_types: data.cuisine_types ?? null,
      delivery_available: data.delivery_available ?? false,
      menu_url: data.menu_url ?? null,
      qualifications: data.qualifications ?? null,
      specialisms: data.specialisms ?? null,
      accepts_clients: data.accepts_clients ?? true,
      consultation_type: data.consultation_type ?? null,
      service_area: data.service_area ?? null,
    };

    // Set location if lat/lng provided
    if (data.latitude != null && data.longitude != null) {
      insertData.location = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
    }

    // Use service role client to insert (no INSERT RLS policy for authenticated users)
    const serviceClient = createServiceRoleClient();
    const { error: insertError } = await serviceClient
      .from('business_profiles')
      .insert(insertData);

    if (insertError) {
      console.error('Business profile insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create business profile', details: insertError.message },
        { status: 500 }
      );
    }

    // Also set business_type on the profiles table
    await serviceClient
      .from('profiles')
      .update({ business_type: data.business_type })
      .eq('id', user.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Business profile create error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await ratelimit.limit(`${ip}:${user.id}`);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify user has a business profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'business') {
      return NextResponse.json({ error: 'Business plan required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = businessProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update payload (only non-undefined fields)
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields = [
      'business_name', 'phone', 'email', 'website_url', 'booking_url',
      'address_line_1', 'address_line_2', 'address_city', 'address_postcode',
      'address_country', 'opening_hours', 'cuisine_types', 'delivery_available',
      'menu_url', 'qualifications', 'specialisms', 'accepts_clients',
      'consultation_type', 'service_area',
    ] as const;

    for (const field of fields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Handle location update
    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (data.latitude != null && data.longitude != null) {
        updateData.location = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
      } else {
        updateData.location = null;
      }
    }

    const { error: updateError } = await supabase
      .from('business_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Business profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update business profile', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Business profile update error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
