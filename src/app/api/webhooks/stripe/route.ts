import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const PERSONAL_PRICE_ID = process.env.STRIPE_PERSONAL_PRICE_ID!;
const BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID!;
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function getPlanAndTier(priceId: string): {
  plan: 'personal' | 'business' | 'free';
  tier: 'personal' | 'basic' | 'premium';
  isRestaurant: boolean;
} {
  if (priceId === PERSONAL_PRICE_ID) {
    return { plan: 'personal', tier: 'personal', isRestaurant: false };
  }
  if (priceId === PREMIUM_PRICE_ID) {
    return { plan: 'business', tier: 'premium', isRestaurant: true };
  }
  // Default to business basic
  return { plan: 'business', tier: 'basic', isRestaurant: true };
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = subscription.items.data[0].price.id;
      const { plan, tier, isRestaurant } = getPlanAndTier(priceId);

      // Resolve user ID from subscription metadata, fallback to customer lookup
      let uid = subscription.metadata?.supabase_uid;
      if (!uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', session.customer as string)
          .single();
        uid = profile?.id;
      }

      if (!uid) {
        console.error('checkout.session.completed: could not resolve user ID');
        break;
      }

      await supabase.from('profiles').update({
        plan,
        is_restaurant: isRestaurant,
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_id: subscription.id,
        stripe_customer_id: session.customer as string,
      }).eq('id', uid);

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata?.supabase_uid;
      if (!uid) break;

      const priceId = subscription.items.data[0].price.id;
      const { plan, tier, isRestaurant } = getPlanAndTier(priceId);

      await supabase.from('profiles').update({
        plan,
        is_restaurant: isRestaurant,
        subscription_tier: tier,
        subscription_status: subscription.status === 'active' ? 'active' : 'past_due',
      }).eq('id', uid);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = subscription.metadata?.supabase_uid;
      if (!uid) break;

      await supabase.from('profiles').update({
        plan: 'free',
        is_restaurant: false,
        subscription_tier: null,
        subscription_status: 'cancelled',
        subscription_id: null,
      }).eq('id', uid);

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subId =
        typeof subRef === 'string' ? subRef : subRef?.id;

      if (!subId) break;

      const subscription = await stripe.subscriptions.retrieve(subId);
      const uid = subscription.metadata?.supabase_uid;

      if (uid) {
        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', uid);

        // Send warning email via Resend
        if (RESEND_API_KEY) {
          const { data: authUser } = await supabase.auth.admin.getUserById(uid);
          const email = authUser?.user?.email;
          if (email) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: 'meal.photos <noreply@meal.photos>',
                  to: email,
                  subject: 'Payment failed — your subscription is at risk',
                  html: `
                    <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #121212; color: #F5F0E8;">
                      <h1 style="font-family: 'Instrument Serif', serif; color: #E8A838; font-size: 28px; margin-bottom: 16px;">Payment Failed</h1>
                      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">We couldn't process your latest payment. Please update your payment method to avoid losing access to your premium features.</p>
                      <a href="https://meal.photos/settings" style="display: inline-block; background: #E8A838; color: #121212; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">Update Payment</a>
                      <p style="font-size: 12px; color: #888888; margin-top: 32px;">You're receiving this because you have an active subscription on meal.photos.</p>
                    </div>
                  `,
                }),
              });
            } catch (err) {
              console.error('Failed to send payment failed email:', err);
            }
          }
        }
      }

      break;
    }
  }

  return new Response('OK', { status: 200 });
}
