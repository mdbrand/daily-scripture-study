import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeRef } from '@/lib/subscribe';
import { checkEmail } from '@/lib/emailCheck';
import { stripe } from '@/lib/stripe';
import { priceIdFor, premiumCheckoutOpen, type Billing } from '@/lib/premium';

export const runtime = 'nodejs';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Premium subscription checkout: $7/month or $47/year via Stripe Checkout.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  const billing: Billing = body.billing === 'monthly' ? 'monthly' : 'yearly';

  if (!process.env.STRIPE_SECRET_KEY || !(await premiumCheckoutOpen())) {
    return NextResponse.json({ error: 'Premium checkout isn’t open yet. Join the list and we’ll email you.' }, { status: 403 });
  }

  const verdict = await checkEmail(email);
  if (!verdict.ok) return NextResponse.json({ error: verdict.message }, { status: 422 });

  const ref = normalizeRef(body.ref);
  const reqOrigin = new URL(req.url).origin;
  const origin = reqOrigin.startsWith('http://localhost') ? reqOrigin : SITE;
  const meta = { kind: 'premium', plan: billing, email, ref: ref ?? '' };

  try {
    const price = await priceIdFor(billing);
    const session = await stripe<{ url: string }>('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price, quantity: 1 }],
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/premium/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('premium checkout', e);
    return NextResponse.json({ error: 'Checkout is unavailable right now. Please try again shortly.' }, { status: 502 });
  }
}
