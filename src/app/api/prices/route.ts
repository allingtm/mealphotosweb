import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

const PERSONAL_PRICE_ID = process.env.STRIPE_PERSONAL_PRICE_ID!;
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID!;

const getCachedPrices = unstable_cache(
  async () => {
    const [personalPrice, businessPrice] = await Promise.all([
      stripe.prices.retrieve(PERSONAL_PRICE_ID),
      stripe.prices.retrieve(PREMIUM_PRICE_ID),
    ]);

    return {
      personal: {
        amount: (personalPrice.unit_amount ?? 0) / 100,
        currency: personalPrice.currency,
      },
      business: {
        amount: (businessPrice.unit_amount ?? 0) / 100,
        currency: businessPrice.currency,
      },
    };
  },
  ['stripe-prices'],
  { revalidate: 86400, tags: ['stripe-prices'] }
);

export async function GET() {
  try {
    const prices = await getCachedPrices();
    return NextResponse.json(prices);
  } catch (err) {
    console.error('Failed to fetch Stripe prices:', err);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
