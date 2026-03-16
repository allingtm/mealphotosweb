import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getBaseUrl } from '@/lib/stripe';

export async function POST() {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Get stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // 3. Create billing portal session
    const baseUrl = getBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/me`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
