import { NextResponse } from 'next/server';
import { premiumCheckoutOpen } from '@/lib/premium';

export const dynamic = 'force-dynamic';

// Whether Premium checkout is open (dss_config.premium_checkout_open) and Stripe is configured.
export async function GET() {
  const open = !!process.env.STRIPE_SECRET_KEY && (await premiumCheckoutOpen());
  return NextResponse.json({ checkout_open: open }, { headers: { 'Cache-Control': 'no-store' } });
}
