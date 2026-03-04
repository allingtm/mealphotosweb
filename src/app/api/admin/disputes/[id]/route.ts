import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, admin_notes } = body as {
      action: 'uphold' | 'dismiss';
      admin_notes?: string;
    };

    if (!['uphold', 'dismiss'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch the dispute
    const { data: dispute } = await serviceClient
      .from('venue_disputes')
      .select('meal_id, restaurant_profile_id, venue_mapbox_id')
      .eq('id', id)
      .single();

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Update dispute status
    const { error: updateError } = await serviceClient
      .from('venue_disputes')
      .update({
        status: action === 'uphold' ? 'upheld' : 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: admin_notes ?? null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Dispute update error:', updateError);
      return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
    }

    if (action === 'uphold') {
      // Clear venue fields on the meal
      await serviceClient
        .from('meals')
        .update({
          venue_mapbox_id: null,
          venue_name: null,
          venue_address: null,
          restaurant_id: null,
        })
        .eq('id', dispute.meal_id);

      // Notify the meal uploader
      const { data: meal } = await serviceClient
        .from('meals')
        .select('user_id, title')
        .eq('id', dispute.meal_id)
        .single();

      if (meal) {
        await serviceClient.from('notifications').insert({
          user_id: meal.user_id,
          type: 'dispute_upheld',
          title: 'Venue tag removed',
          body: `The venue tag on your meal "${meal.title}" was removed after a review. The meal is still visible in the feed.`,
          data: { meal_id: dispute.meal_id },
        });
      }
    }

    // Notify the restaurant of the outcome
    const notifTitle = action === 'uphold'
      ? 'Dispute upheld'
      : 'Dispute dismissed';
    const notifBody = action === 'uphold'
      ? 'Your venue dispute was upheld. The venue tag has been removed from the meal.'
      : 'Your venue dispute was not upheld. The meal appears genuine.';

    await serviceClient.from('notifications').insert({
      user_id: dispute.restaurant_profile_id,
      type: action === 'uphold' ? 'dispute_upheld' : 'dispute_dismissed',
      title: notifTitle,
      body: notifBody,
      data: { meal_id: dispute.meal_id },
    });

    return NextResponse.json({ success: true, status: action === 'uphold' ? 'upheld' : 'dismissed' });
  } catch (err) {
    console.error('Admin disputes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
