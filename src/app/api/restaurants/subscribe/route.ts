import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getBaseUrl } from '@/lib/stripe';
import { applyRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const subscribeSchema = z.object({
  plan: z.enum(['basic', 'premium']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await applyRateLimit(user.id, 'write');
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan', details: parsed.error.flatten() }, { status: 400 });
    }

    const { plan } = parsed.data;
    const priceId = plan === 'basic'
      ? process.env.STRIPE_BASIC_PRICE_ID!
      : process.env.STRIPE_PREMIUM_PRICE_ID!;

    // Check if already subscribed
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'active') {
      return NextResponse.json({ error: 'You already have an active subscription' }, { status: 409 });
    }

    // Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const baseUrl = getBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/me?subscription=success`,
      cancel_url: `${baseUrl}/pricing?subscription=cancelled`,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
