import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getBaseUrl } from '@/lib/stripe';
import { subscribeSchema } from '@/lib/validations';

const PRICE_IDS: Record<string, string> = {
  personal: process.env.STRIPE_PERSONAL_PRICE_ID!,
  basic: process.env.STRIPE_BASIC_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
};

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Validate request body
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { plan, tier } = parsed.data;

    // Determine the price ID
    const priceKey = plan === 'personal' ? 'personal' : (tier ?? 'basic');
    const priceId = PRICE_IDS[priceKey];

    // 3. Check if already subscribed
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 409 }
      );
    }

    // 4. Get or create Stripe customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_uid: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 5. Create Checkout session
    const baseUrl = getBaseUrl();
    const successUrl = plan === 'personal'
      ? `${baseUrl}/settings?upgraded=personal`
      : `${baseUrl}/business/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = plan === 'personal'
      ? `${baseUrl}/pricing`
      : `${baseUrl}/business`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { supabase_uid: user.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
