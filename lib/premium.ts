import { stripe } from './stripe';
import { rpc } from './supabaseRpc';
import { PLANS } from './plans';

export type Billing = 'monthly' | 'yearly';

const LOOKUP: Record<Billing, string> = {
  monthly: 'morning_lamp_premium_monthly',
  yearly: 'morning_lamp_premium_yearly',
};

type Price = { id: string; lookup_key: string | null; unit_amount: number };

let cache: Partial<Record<Billing, string>> = {};

// Finds the Stripe Price for a plan by lookup key, creating the product/price once if missing.
// If a price amount changes in lib/plans.ts, a new price is created and the lookup key moves to it.
export async function priceIdFor(billing: Billing): Promise<string> {
  const cached = cache[billing];
  if (cached) return cached;

  const want = PLANS[billing];
  const found = await stripe<{ data: Price[] }>('GET', '/prices', {
    lookup_keys: [LOOKUP.monthly, LOOKUP.yearly],
    active: true,
  });
  for (const p of found.data) {
    if (p.lookup_key === LOOKUP.monthly && p.unit_amount === PLANS.monthly.cents) cache.monthly = p.id;
    if (p.lookup_key === LOOKUP.yearly && p.unit_amount === PLANS.yearly.cents) cache.yearly = p.id;
  }
  if (cache[billing]) return cache[billing]!;

  const products = await stripe<{ data: { id: string }[] }>('GET', '/products/search', {
    query: "metadata['app']:'morning-lamp-premium'",
  });
  const productId =
    products.data[0]?.id ??
    (
      await stripe<{ id: string }>(
        'POST',
        '/products',
        {
          name: 'Morning Lamp Premium',
          description: 'A daily Bible study written for your life: your season, what you carry, and what happened yesterday.',
          metadata: { app: 'morning-lamp-premium' },
        },
        'ml-premium-product-v1',
      )
    ).id;

  const price = await stripe<Price>('POST', '/prices', {
    product: productId,
    currency: 'usd',
    unit_amount: want.cents,
    recurring: { interval: want.interval },
    lookup_key: LOOKUP[billing],
    transfer_lookup_key: true,
    nickname: billing === 'monthly' ? 'Premium monthly' : 'Premium yearly',
  });
  cache = { ...cache, [billing]: price.id };
  return price.id;
}

export async function premiumCheckoutOpen(): Promise<boolean> {
  if (process.env.PREMIUM_CHECKOUT_FORCE === 'true') return true; // local testing only
  try {
    const s = await rpc<{ checkout_open: boolean }>('dss_premium_settings');
    return !!s.checkout_open;
  } catch {
    return false;
  }
}
