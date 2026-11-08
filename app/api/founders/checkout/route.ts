import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeRef } from '@/lib/subscribe';
import { checkEmail } from '@/lib/emailCheck';
import { stripe } from '@/lib/stripe';
import { getFounderStats } from '@/lib/supabaseRpc';
import { tierFor } from '@/lib/founders';

export const runtime = 'nodejs';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const verdict = await checkEmail(email);
  if (!verdict.ok) return NextResponse.json({ error: verdict.message }, { status: 422 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Founders checkout opens very soon. Please check back.' }, { status: 503 });
  }

  const { price_cents } = await getFounderStats();
  const tier = { tier: tierFor(price_cents), cents: price_cents };

  const ref = normalizeRef(body.ref);
  const reqOrigin = new URL(req.url).origin;
  const origin = reqOrigin.startsWith('http://localhost') ? reqOrigin : SITE;
  const meta = { kind: 'founder', tier: tier.tier, email, ref: ref ?? '' };

  try {
    const session = await stripe<{ url: string; id: string }>('POST', '/checkout/sessions', {
      mode: 'payment',
      customer_email: email,
      customer_creation: 'always',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: tier.cents,
            product_data: {
              name: 'Morning Lamp Founders Membership',
              description:
                'Lifetime Morning Lamp Premium for as long as Premium is offered. One payment, no monthly bill. All sales are final.',
            },
          },
        },
      ],
      metadata: meta,
      payment_intent_data: { metadata: meta },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/founders/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#founders`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('founders checkout', e);
    return NextResponse.json({ error: 'Checkout is unavailable right now. Please try again shortly.' }, { status: 502 });
  }
}
