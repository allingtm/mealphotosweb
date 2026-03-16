import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessProfileCreateSchema, businessProfileUpdateSchema } from '@/lib/validations';
import { applyRateLimit } from '@/lib/rate-limit';

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
    // Use raw SQL via RPC for PostGIS point
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

  // Mark user as business
  await supabase
    .from('profiles')
    .update({ is_business: true })
    .eq('id', user.id);

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

  return NextResponse.json({ profile });
}
